"""
Phase 3: Website Knowledge Pipeline
Loads website content, applies semantic chunking, generates embeddings,
and stores in the FAISS vector store.

Run this as a standalone script to populate the knowledge base:
  python -m app.rag.ingestion --urls https://fitmentor.com/blog ...
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
import os
import re
import sys
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse

import numpy as np

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Allow running as __main__
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

from vector_store import CohereEmbedder, VectorStoreManager

logger = logging.getLogger(__name__)
SITE_SYNC_MANIFEST = Path(__file__).resolve().parent / "site_sync_manifest.json"

# ── Chunking Strategy ─────────────────────────────────────────────────────────
CHUNK_SIZE_WORDS = 280       # ~1 paragraph
CHUNK_OVERLAP_WORDS = 40     # contextual overlap
MIN_CHUNK_WORDS = 30         # discard tiny fragments


def _normalize_url(url: str) -> str:
    """Normalize URLs for dedupe and internal link crawling."""
    clean_url, _ = urldefrag(url)
    parsed = urlparse(clean_url)
    path = parsed.path.rstrip("/")
    normalized = parsed._replace(path=path or "/", query="")
    return normalized.geturl()


def _is_internal_url(candidate_url: str, base_netloc: str) -> bool:
    """Return True if a URL belongs to the same site domain."""
    parsed = urlparse(candidate_url)
    return bool(parsed.scheme in {"http", "https"} and parsed.netloc == base_netloc)


def _text_hash(text: str) -> str:
    """Hash normalized page text so we can detect page changes."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _load_manifest() -> dict:
    if SITE_SYNC_MANIFEST.exists():
        try:
            return json.loads(SITE_SYNC_MANIFEST.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"[Sync] Failed to load manifest: {e}")
    return {"pages": {}, "updated_at": None}


def _save_manifest(manifest: dict) -> None:
    SITE_SYNC_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def _extract_main_text(html: bytes) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all(["nav", "footer", "script", "style", "header", "aside"]):
        tag.decompose()
    main = soup.find("article") or soup.find("main") or soup.body
    return main.get_text(separator="\n", strip=True) if main else ""


async def _fetch_text(client: httpx.AsyncClient, url: str) -> str:
    """Fetch a URL and return its text content, or an empty string on failure."""
    try:
        resp = await client.get(url, follow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        logger.debug(f"[Sitemap] Failed to fetch {url}: {e}")
        return ""


async def discover_sitemap_urls(
    start_url: str,
    max_sitemaps: int = 10,
) -> list[str]:
    """
    Discover URLs from sitemap.xml / sitemap index / robots.txt.

    If the site exposes a sitemap, this is the preferred ingestion path because
    it can enumerate the whole site without depending on visible links.
    """
    start_url = _normalize_url(start_url)
    parsed_start = urlparse(start_url)
    base_root = f"{parsed_start.scheme}://{parsed_start.netloc}"
    sitemap_candidates = [
        f"{base_root}/sitemap.xml",
        f"{base_root}/sitemap_index.xml",
        f"{base_root}/sitemap-index.xml",
    ]

    discovered: list[str] = []
    seen: set[str] = set()

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        robots_text = await _fetch_text(client, f"{base_root}/robots.txt")
        for line in robots_text.splitlines():
            if line.lower().startswith("sitemap:"):
                sitemap_candidates.append(line.split(":", 1)[1].strip())

        sitemap_queue = [u for u in sitemap_candidates if u]
        parsed_sitemaps = 0

        while sitemap_queue and parsed_sitemaps < max_sitemaps:
            sitemap_url = _normalize_url(sitemap_queue.pop(0))
            if sitemap_url in seen:
                continue

            seen.add(sitemap_url)
            parsed_sitemaps += 1

            sitemap_text = await _fetch_text(client, sitemap_url)
            if not sitemap_text:
                continue

            try:
                soup = BeautifulSoup(sitemap_text, "xml")
                sitemap_locs = [loc.get_text(strip=True) for loc in soup.find_all("loc")]
                if not sitemap_locs:
                    continue

                is_index = bool(soup.find("sitemapindex"))
                if is_index:
                    for loc in sitemap_locs:
                        if loc and loc not in seen and loc not in sitemap_queue:
                            sitemap_queue.append(loc)
                    continue

                for loc in sitemap_locs:
                    if not loc:
                        continue
                    normalized = _normalize_url(loc)
                    if _is_internal_url(normalized, parsed_start.netloc) and normalized not in discovered:
                        discovered.append(normalized)
            except Exception as e:
                logger.warning(f"[Sitemap] Parse error for {sitemap_url}: {e}")

    return discovered


async def fetch_page_snapshot(client: httpx.AsyncClient, url: str) -> dict:
    """Fetch page text and hash for change detection."""
    resp = await client.get(url, follow_redirects=True)
    resp.raise_for_status()
    text = _extract_main_text(resp.content)
    normalized_text = re.sub(r"\s+", " ", text).strip()
    return {
        "url": _normalize_url(url),
        "text": normalized_text,
        "hash": _text_hash(normalized_text),
    }


async def crawl_site(
    start_url: str,
    max_pages: int = 50,
    same_domain_only: bool = True,
) -> list[str]:
    """
    Crawl a website starting from one page and collect internal page URLs.

    This is intended to build a knowledge base from the site's content so the
    chatbot can answer questions about pages, sections, FAQs, and articles.
    """
    start_url = _normalize_url(start_url)
    base_netloc = urlparse(start_url).netloc
    discovered: list[str] = []
    seen: set[str] = set()
    queue: list[str] = [start_url]

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        while queue and len(discovered) < max_pages:
            current_url = _normalize_url(queue.pop(0))
            if current_url in seen:
                continue

            seen.add(current_url)
            discovered.append(current_url)

            try:
                logger.info(f"[Crawl] Fetching {current_url}")
                resp = await client.get(current_url)
                resp.raise_for_status()
            except Exception as e:
                logger.warning(f"[Crawl] Failed to fetch {current_url}: {e}")
                continue

            try:
                soup = BeautifulSoup(resp.content, "html.parser")
                for tag in soup.find_all(["nav", "footer", "script", "style", "header", "aside"]):
                    tag.decompose()

                for anchor in soup.find_all("a", href=True):
                    href = anchor.get("href", "").strip()
                    if not href or href.startswith(("mailto:", "tel:", "javascript:")):
                        continue

                    next_url = _normalize_url(urljoin(current_url, href))
                    if same_domain_only and not _is_internal_url(next_url, base_netloc):
                        continue
                    if next_url not in seen and next_url not in queue:
                        queue.append(next_url)
            except Exception as e:
                logger.warning(f"[Crawl] Parse error for {current_url}: {e}")

    return discovered


def semantic_chunk(text: str, source_url: str) -> list[dict]:
    """
    Semantic-aware chunking strategy:
    1. Split on paragraph boundaries first (preserves semantic units)
    2. Merge short paragraphs until chunk_size is reached
    3. Apply word-level overlap between chunks
    """
    # Clean the text
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    # Split on paragraph-like breaks
    paragraphs = re.split(r"\n{2,}|(?<=[.!?])\s{2,}", text)
    paragraphs = [p.strip() for p in paragraphs if len(p.split()) >= 5]

    chunks = []
    current_words: list[str] = []

    for para in paragraphs:
        para_words = para.split()

        # If adding this paragraph exceeds chunk size, flush
        if len(current_words) + len(para_words) > CHUNK_SIZE_WORDS and current_words:
            chunk_text = " ".join(current_words)
            if len(current_words) >= MIN_CHUNK_WORDS:
                chunks.append({
                    "text": chunk_text,
                    "source": source_url,
                    "type": "web_content",
                    "word_count": len(current_words),
                })
            # Keep overlap
            current_words = current_words[-CHUNK_OVERLAP_WORDS:]

        current_words.extend(para_words)

    # Flush remaining
    if len(current_words) >= MIN_CHUNK_WORDS:
        chunks.append({
            "text": " ".join(current_words),
            "source": source_url,
            "type": "web_content",
            "word_count": len(current_words),
        })

    return chunks


async def ingest_urls(urls: list[str]) -> int:
    """
    Fetch web pages, apply semantic chunking, embed, and store.
    Returns total number of chunks ingested.
    """
    api_key = os.getenv("COHERE_API_KEY", "")
    embedder = CohereEmbedder(api_key=api_key)
    store = VectorStoreManager.get_instance()

    all_docs: list[str] = []
    all_meta: list[dict] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for url in urls:
            try:
                logger.info(f"[Ingestion] Fetching {url}")
                resp = await client.get(url, follow_redirects=True)
                resp.raise_for_status()
            except Exception as e:
                logger.warning(f"[Ingestion] Failed to fetch {url}: {e}")
                continue

            try:
                text = _extract_main_text(resp.content)
                if not text:
                    continue
                chunks = semantic_chunk(text, url)
                logger.info(f"[Ingestion] {url} → {len(chunks)} chunks")

                for chunk in chunks:
                    all_docs.append(chunk["text"])
                    all_meta.append(chunk)

            except Exception as e:
                logger.warning(f"[Ingestion] Parse error for {url}: {e}")

    if not all_docs:
        logger.warning("[Ingestion] No documents to embed")
        return 0

    logger.info(f"[Ingestion] Embedding {len(all_docs)} chunks...")
    embeddings = embedder.embed_documents(all_docs)
    store.add(embeddings, all_meta)
    store.save()
    logger.info(f"[Ingestion] Done. {len(all_docs)} chunks stored.")
    return len(all_docs)


async def sync_site_knowledge(
    start_url: str,
    max_pages: int = 100,
    same_domain_only: bool = True,
) -> int:
    """
    Incrementally sync site knowledge.

    Only pages whose normalized text hash changed will be re-embedded.
    The full vector store is then rebuilt from the latest manifest so stale
    chunks are removed and unchanged content is reused.
    """
    api_key = os.getenv("COHERE_API_KEY", "")
    embedder = CohereEmbedder(api_key=api_key)
    store = VectorStoreManager.get_instance()
    manifest = _load_manifest()
    manifest_pages = manifest.setdefault("pages", {})

    discovered_urls = await discover_sitemap_urls(start_url)
    if discovered_urls:
        logger.info(f"[Sync] Sitemap discovered {len(discovered_urls)} pages")
    else:
        discovered_urls = await crawl_site(start_url, max_pages=max_pages, same_domain_only=same_domain_only)
        logger.info(f"[Sync] Crawl discovered {len(discovered_urls)} pages")

    if max_pages > 0:
        discovered_urls = discovered_urls[:max_pages]

    all_docs: list[str] = []
    all_meta: list[dict] = []
    changed_pages = 0

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        for url in discovered_urls:
            try:
                snapshot = await fetch_page_snapshot(client, url)
            except Exception as e:
                logger.warning(f"[Sync] Failed to fetch {url}: {e}")
                continue

            cached_page = manifest_pages.get(snapshot["url"])
            if cached_page and cached_page.get("hash") == snapshot["hash"]:
                for chunk in cached_page.get("chunks", []):
                    all_docs.append(chunk["text"])
                    all_meta.append(chunk)
                continue

            changed_pages += 1
            chunks = semantic_chunk(snapshot["text"], snapshot["url"])
            if not chunks:
                continue

            logger.info(f"[Sync] {snapshot['url']} changed → {len(chunks)} chunks")
            embeddings = embedder.embed_documents([chunk["text"] for chunk in chunks])

            saved_chunks = []
            for chunk, embedding in zip(chunks, embeddings):
                chunk_record = dict(chunk)
                chunk_record["embedding"] = embedding.tolist()
                saved_chunks.append(chunk_record)
                all_docs.append(chunk_record["text"])
                all_meta.append({k: v for k, v in chunk_record.items() if k != "embedding"})

            manifest_pages[snapshot["url"]] = {
                "hash": snapshot["hash"],
                "chunks": saved_chunks,
            }

    if not all_meta:
        logger.warning("[Sync] No documents to store")
        return 0

    # Rebuild the full index from the latest manifest so stale chunks disappear.
    embeddings_matrix = np.array(
        [chunk["embedding"] for page in manifest_pages.values() for chunk in page.get("chunks", [])],
        dtype=np.float32,
    )
    metadata_matrix = [
        {k: v for k, v in chunk.items() if k != "embedding"}
        for page in manifest_pages.values()
        for chunk in page.get("chunks", [])
    ]

    if embeddings_matrix.size == 0 or not metadata_matrix:
        logger.warning("[Sync] Manifest produced no embeddings")
        return 0

    store.rebuild(embeddings_matrix, metadata_matrix)
    store.save()
    manifest["updated_at"] = datetime.now(timezone.utc).isoformat()
    _save_manifest(manifest)

    logger.info(f"[Sync] Done. changed_pages={changed_pages} total_chunks={len(metadata_matrix)}")
    return len(metadata_matrix)


async def ingest_site(
    start_url: str,
    max_pages: int = 50,
    same_domain_only: bool = True,
) -> int:
    """
    Crawl a website and ingest all discoverable internal pages.

    Use this when you want the chatbot to understand the whole site, not just
    a manually listed set of URLs.
    """
    urls = await discover_sitemap_urls(start_url)
    if urls:
        logger.info(f"[Ingestion] Sitemap discovered {len(urls)} pages")
    else:
        urls = await crawl_site(start_url, max_pages=max_pages, same_domain_only=same_domain_only)
        logger.info(f"[Ingestion] Crawl discovered {len(urls)} pages")

    if max_pages > 0:
        urls = urls[:max_pages]

    return await ingest_urls(urls)


def ingest_urls_sync(urls: list[str]) -> int:
    """Synchronous wrapper for CLI use."""
    import asyncio
    return asyncio.run(ingest_urls(urls))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="FitMentor Website Knowledge Ingestion Pipeline")
    parser.add_argument("--urls", nargs="+", help="Specific URLs to ingest")
    parser.add_argument("--crawl-site", help="Start URL to crawl internal site pages from")
    parser.add_argument("--sync-site", help="Start URL to crawl and incrementally sync site content")
    parser.add_argument("--max-pages", type=int, default=50, help="Max pages to crawl when using --crawl-site")
    parser.add_argument("--allow-external", action="store_true", help="Allow crawling external links when using --crawl-site")
    args = parser.parse_args()

    if not args.urls and not args.crawl_site and not args.sync_site:
        parser.error("Provide either --urls, --crawl-site, or --sync-site")

    if args.sync_site:
        total = asyncio.run(
            sync_site_knowledge(
                args.sync_site,
                max_pages=args.max_pages,
                same_domain_only=not args.allow_external,
            )
        )
    elif args.crawl_site:
        total = asyncio.run(
            ingest_site(
                args.crawl_site,
                max_pages=args.max_pages,
                same_domain_only=not args.allow_external,
            )
        )
    else:
        total = ingest_urls_sync(args.urls)

    print(f"✅ Ingested {total} chunks into the vector store.")
