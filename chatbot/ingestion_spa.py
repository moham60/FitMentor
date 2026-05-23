"""
Playwright SPA ingestion pipeline for FitMentor RAG.

Renders predefined React/Vite routes, extracts clean visible text, chunks it,
embeds changed pages with Cohere, and updates the existing FAISS store
incrementally without rebuilding the whole index.

Example:
  python ingestion_spa.py --base-url http://localhost:8080
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import numpy as np
from dotenv import load_dotenv

from cache_layer import get_cache_manager
from vector_store import CohereEmbedder, VectorStoreManager

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

logger = logging.getLogger(__name__)

APP_ROUTES_FILE = Path(__file__).resolve().parent.parent / "src" / "App.tsx"
DEFAULT_ROUTES = [
    "/auth/callback",
    "/",
    "/signup",
    "/signin",
    "/onboarding",
    "/posts",
    "/dashboard",
    "/chat",
    "/exercises",
    "/nutrition",
    "/workouts",
    "/inbody",
    "/settings",
    "/profile",
    "/subscription",
    "/checkout",
    "/coach-plan",
    "/ai-assistant",
    "/coach/clients",
    "/coach/earnings",
    "/coach/plans",
]
MANIFEST_PATH = Path(__file__).resolve().parent / "spa_ingestion_manifest.json"

CHUNK_SIZE_WORDS = 280
CHUNK_OVERLAP_WORDS = 40
MIN_CHUNK_WORDS = 30


@dataclass(frozen=True)
class PageSnapshot:
    route: str
    url: str
    title: str
    text: str
    content_hash: str


def normalize_route(route: str) -> str:
    route = route.strip() or "/"
    if not route.startswith("/"):
        route = f"/{route}"
    return route


def build_route_url(base_url: str, route: str) -> str:
    base = base_url.rstrip("/") + "/"
    return urljoin(base, normalize_route(route).lstrip("/"))


def path_from_url(url: str) -> str:
    from urllib.parse import urlparse

    path = urlparse(url).path or "/"
    return normalize_route(path.rstrip("/") or "/")


def is_same_route(expected_route: str, final_url: str) -> bool:
    return normalize_route(expected_route).rstrip("/") == path_from_url(final_url).rstrip("/")


def is_dynamic_route(route: str) -> bool:
    return ":" in route or "*" in route


def extract_routes_from_react_app(app_file: Path = APP_ROUTES_FILE) -> list[str]:
    """
    Extract static React Router paths from src/App.tsx.

    Dynamic routes like /profile/:id need sample ids or authenticated app state,
    so they are logged and skipped by default.
    """
    if not app_file.exists():
        logger.warning("[SPA Routes] App routes file not found: %s", app_file)
        return DEFAULT_ROUTES

    source = app_file.read_text(encoding="utf-8")
    paths = re.findall(r"<Route\b[^>]*\bpath\s*=\s*[\"']([^\"']+)[\"']", source)
    routes: list[str] = []
    dynamic_routes: list[str] = []

    for path in paths:
        route = normalize_route(path)
        if is_dynamic_route(route):
            dynamic_routes.append(route)
            continue
        if route not in routes:
            routes.append(route)

    if dynamic_routes:
        logger.info("[SPA Routes] Skipped dynamic route patterns: %s", dynamic_routes)
    return routes or DEFAULT_ROUTES


def default_routes(app_file: Path = APP_ROUTES_FILE) -> list[str]:
    """
    Return every default static route we can ingest.

    The hard-coded list keeps ingestion useful even if App.tsx parsing fails.
    Parsed routes are merged in so newly added static routes are picked up.
    """
    routes = [normalize_route(route) for route in DEFAULT_ROUTES]
    for route in extract_routes_from_react_app(app_file):
        route = normalize_route(route)
        if route not in routes:
            routes.append(route)
    return routes


def normalize_text(text: str) -> str:
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def text_hash(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def chunk_id(source_url: str, index: int, text: str) -> str:
    seed = f"{source_url}:{index}:{text_hash(text)}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def build_embedding_text(route: str, title: str, source_url: str, content: str) -> str:
    """Include route identity in embedded text so route-specific questions retrieve it."""
    return normalize_text(
        f"Route: {route}\n"
        f"Page title: {title or route}\n"
        f"URL: {source_url}\n\n"
        f"{content}"
    )


def load_manifest(path: Path = MANIFEST_PATH) -> dict:
    if not path.exists():
        return {"pages": {}, "updated_at": None}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("[SPA Sync] Failed to read manifest %s: %s", path, exc)
        return {"pages": {}, "updated_at": None}


def save_manifest(manifest: dict, path: Path = MANIFEST_PATH) -> None:
    manifest["updated_at"] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def semantic_chunk(text: str, source_url: str, route: str, title: str) -> list[dict]:
    """
    Semantic-ish chunking:
    1. Preserve paragraph boundaries from rendered visible text.
    2. Merge paragraphs up to 280 words.
    3. Carry 40 words of overlap into the next chunk.
    """
    text = normalize_text(text)
    if not text:
        return []

    paragraphs = [
        paragraph.strip()
        for paragraph in re.split(r"\n{2,}", text)
        if len(paragraph.split()) >= 5
    ]
    if not paragraphs:
        paragraphs = [text]

    chunks: list[dict] = []
    current_words: list[str] = []

    def flush() -> None:
        if len(current_words) < MIN_CHUNK_WORDS:
            return
        index = len(chunks)
        visible_text = " ".join(current_words)
        chunk_text = build_embedding_text(route, title, source_url, visible_text)
        chunks.append(
            {
                "chunk_id": chunk_id(source_url, index, chunk_text),
                "text": chunk_text,
                "visible_text": visible_text,
                "source": source_url,
                "route": route,
                "title": title,
                "type": "spa_content",
                "content_hash": text_hash(chunk_text),
                "word_count": len(current_words),
                "chunk_index": index,
            }
        )

    for paragraph in paragraphs:
        words = paragraph.split()
        if len(current_words) + len(words) > CHUNK_SIZE_WORDS and current_words:
            flush()
            current_words = current_words[-CHUNK_OVERLAP_WORDS:]
        current_words.extend(words)

    flush()
    return chunks


async def extract_visible_text(page) -> str:
    """
    Extract visible text from the rendered DOM.

    Navigation, footer, scripts, hidden elements, and common layout chrome are
    ignored in the browser after React has rendered.
    """
    text = await page.evaluate(
        """
        () => {
          const skipTags = new Set([
            'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'IFRAME',
            'NAV', 'FOOTER', 'HEADER', 'ASIDE'
          ]);
          const skipSelector = [
            '[aria-hidden="true"]',
            '[hidden]',
            '[role="navigation"]',
            '[role="banner"]',
            '[role="contentinfo"]',
            '[role="complementary"]',
            '.nav',
            '.navbar',
            '.footer',
            '.sidebar',
            '.menu',
            '.toast',
            '.modal'
          ].join(',');

          const isVisible = (element) => {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) return true;
            if (skipTags.has(element.tagName)) return false;
            if (element.closest(skipSelector)) return false;
            const style = window.getComputedStyle(element);
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              Number(style.opacity) === 0
            ) return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          const root = document.querySelector('main, article, [role="main"], #root') || document.body;
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              const value = node.nodeValue.replace(/\\s+/g, ' ').trim();
              if (!value || value.length < 2) return NodeFilter.FILTER_REJECT;
              return isVisible(node.parentElement)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }
          });

          const lines = [];
          let node;
          while ((node = walker.nextNode())) {
            const value = node.nodeValue.replace(/\\s+/g, ' ').trim();
            if (value) lines.push(value);
          }

          return [...new Set(lines)].join('\\n\\n');
        }
        """
    )
    return normalize_text(text)


async def fetch_route_snapshot(
    context,
    base_url: str,
    route: str,
    timeout_ms: int,
    wait_ms: int,
) -> PageSnapshot | None:
    url = build_route_url(base_url, route)
    page = await context.new_page()
    try:
        logger.info("[SPA Fetch] Rendering %s", url)
        await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        try:
            await page.wait_for_load_state("networkidle", timeout=min(timeout_ms, 10_000))
        except Exception:
            logger.debug("[SPA Fetch] networkidle timeout for %s; continuing", url)
        if wait_ms > 0:
            await page.wait_for_timeout(wait_ms)

        if not is_same_route(route, page.url):
            logger.warning(
                "[SPA Fetch] Skipping %s because browser ended at %s. "
                "Use --storage-state for protected routes.",
                route,
                page.url,
            )
            return None

        title = (await page.title()).strip()
        text = await extract_visible_text(page)
        if not text:
            logger.warning("[SPA Fetch] No visible text extracted from %s", url)
            return None

        return PageSnapshot(
            route=normalize_route(route),
            url=url,
            title=title,
            text=text,
            content_hash=text_hash(text),
        )
    except Exception as exc:
        logger.warning("[SPA Fetch] Failed to render %s: %s", url, exc)
        return None
    finally:
        await page.close()


async def fetch_spa_snapshots(
    base_url: str,
    routes: list[str],
    concurrency: int = 4,
    timeout_ms: int = 30_000,
    wait_ms: int = 500,
    headless: bool = True,
    storage_state: str | None = None,
) -> list[PageSnapshot]:
    """Render predefined SPA routes concurrently with Playwright."""
    from playwright.async_api import async_playwright

    unique_routes = list(dict.fromkeys(normalize_route(route) for route in routes))
    semaphore = asyncio.Semaphore(max(1, concurrency))

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=headless)
        context_kwargs = {}
        if storage_state:
            context_kwargs["storage_state"] = storage_state
        context = await browser.new_context(**context_kwargs)

        async def fetch(route: str) -> PageSnapshot | None:
            async with semaphore:
                return await fetch_route_snapshot(
                    context=context,
                    base_url=base_url,
                    route=route,
                    timeout_ms=timeout_ms,
                    wait_ms=wait_ms,
                )

        try:
            snapshots = await asyncio.gather(*(fetch(route) for route in unique_routes))
        finally:
            await context.close()
            await browser.close()

    return [snapshot for snapshot in snapshots if snapshot is not None]


async def sync_spa_routes(
    base_url: str,
    routes: list[str] | None = None,
    concurrency: int = 4,
    timeout_ms: int = 30_000,
    wait_ms: int = 500,
    headless: bool = True,
    storage_state: str | None = None,
    manifest_path: Path = MANIFEST_PATH,
) -> int:
    """
    Incrementally sync React/Vite SPA routes into the existing FAISS store.

    Unchanged pages are skipped entirely. Changed pages have only their old
    vectors removed, then their new chunks are embedded and appended.
    """
    routes = routes or default_routes()
    manifest = load_manifest(manifest_path)
    manifest_pages = manifest.setdefault("pages", {})

    snapshots = await fetch_spa_snapshots(
        base_url=base_url,
        routes=routes,
        concurrency=concurrency,
        timeout_ms=timeout_ms,
        wait_ms=wait_ms,
        headless=headless,
        storage_state=storage_state,
    )
    if not snapshots:
        logger.warning("[SPA Sync] No pages rendered")
        return 0

    embedder = CohereEmbedder(api_key=os.getenv("COHERE_API_KEY", ""))
    store = VectorStoreManager.get_instance()

    changed_chunks: list[dict] = []
    changed_pages = 0
    removed_vectors = 0

    for snapshot in snapshots:
        previous = manifest_pages.get(snapshot.url)
        if previous and previous.get("hash") == snapshot.content_hash:
            logger.info("[SPA Sync] Unchanged: %s", snapshot.url)
            continue

        changed_pages += 1
        removed_vectors += store.remove_by_source(snapshot.url, content_type="spa_content")

        chunks = semantic_chunk(
            text=snapshot.text,
            source_url=snapshot.url,
            route=snapshot.route,
            title=snapshot.title,
        )
        manifest_pages[snapshot.url] = {
            "route": snapshot.route,
            "title": snapshot.title,
            "hash": snapshot.content_hash,
            "chunk_ids": [chunk["chunk_id"] for chunk in chunks],
            "word_count": len(snapshot.text.split()),
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }

        if chunks:
            changed_chunks.extend(chunks)
        else:
            logger.warning("[SPA Sync] Page changed but produced no chunks: %s", snapshot.url)

    if not changed_chunks:
        if removed_vectors:
            store.save()
            cache = get_cache_manager()
            await cache.invalidate_pattern("vec:search:")
            await cache.invalidate_pattern("rag:response:")
        save_manifest(manifest, manifest_path)
        logger.info(
            "[SPA Sync] Done. changed_pages=%s removed_vectors=%s added_vectors=0 total_vectors=%s",
            changed_pages,
            removed_vectors,
            store.size,
        )
        return 0

    docs = [chunk["text"] for chunk in changed_chunks]
    embeddings = await embedder.embed_documents_cached(docs)
    added_vectors = store.add_unique(
        embeddings=np.asarray(embeddings, dtype=np.float32),
        metadata=changed_chunks,
        unique_key="chunk_id",
    )
    store.save()
    save_manifest(manifest, manifest_path)
    cache = get_cache_manager()
    await cache.invalidate_pattern("vec:search:")
    await cache.invalidate_pattern("rag:response:")

    logger.info(
        "[SPA Sync] Done. changed_pages=%s removed_vectors=%s added_vectors=%s total_vectors=%s",
        changed_pages,
        removed_vectors,
        added_vectors,
        store.size,
    )
    return added_vectors


def routes_from_env(app_file: Path = APP_ROUTES_FILE) -> list[str]:
    raw_routes = os.getenv("SPA_ROUTES", "")
    if not raw_routes.strip():
        return default_routes(app_file)
    return [route.strip() for route in raw_routes.split(",") if route.strip()]


def sync_spa_routes_sync(base_url: str, routes: list[str] | None = None) -> int:
    """Synchronous wrapper for CLI and cron jobs."""
    return asyncio.run(sync_spa_routes(base_url=base_url, routes=routes))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="FitMentor React/Vite SPA ingestion")
    parser.add_argument("--base-url", default=os.getenv("SPA_BASE_URL", "").strip())
    parser.add_argument("--routes", nargs="*", default=None)
    parser.add_argument("--routes-file", default=str(APP_ROUTES_FILE))
    parser.add_argument("--list-routes", action="store_true", help="Print extracted static SPA routes and exit")
    parser.add_argument(
        "--storage-state",
        default=os.getenv("SPA_STORAGE_STATE", "").strip() or None,
        help="Playwright storage_state JSON for authenticated protected routes",
    )
    parser.add_argument("--concurrency", type=int, default=int(os.getenv("SPA_INGEST_CONCURRENCY", "4")))
    parser.add_argument("--timeout-ms", type=int, default=int(os.getenv("SPA_INGEST_TIMEOUT_MS", "30000")))
    parser.add_argument("--wait-ms", type=int, default=int(os.getenv("SPA_INGEST_WAIT_MS", "500")))
    parser.add_argument("--headful", action="store_true", help="Run browser visibly for debugging")
    return parser.parse_args()


if __name__ == "__main__":
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    args = parse_args()
    routes_file = Path(args.routes_file)
    selected_default_routes = default_routes(routes_file)

    if args.list_routes:
        for route in selected_default_routes:
            print(route)
        raise SystemExit(0)

    if not args.base_url:
        raise SystemExit("Provide --base-url or SPA_BASE_URL")

    selected_routes = args.routes if args.routes is not None else routes_from_env(routes_file)
    total = asyncio.run(
        sync_spa_routes(
            base_url=args.base_url,
            routes=selected_routes,
            concurrency=args.concurrency,
            timeout_ms=args.timeout_ms,
            wait_ms=args.wait_ms,
            headless=not args.headful,
            storage_state=args.storage_state,
        )
    )
    print(f"Ingested {total} new or changed SPA chunks into FAISS.")
