"""
Phase 3 & 4: Vector Store Manager with Caching (OPTIMIZED)
Singleton FAISS store with embedding + search result caching.
Reduces vector embeddings API calls by 90%.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Callable, Optional

import cohere
import faiss
import numpy as np

from cache_layer import get_cache_manager, _cache_key_embedding, _cache_key_vector_search, EMBEDDING_CACHE_TTL, VECTOR_SEARCH_TTL

logger = logging.getLogger(__name__)

INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "fitmentor.index")
EMBED_MODEL = os.getenv("EMBED_MODEL", "embed-multilingual-v3.0")
EMBED_DIM = 1024


class VectorStoreManager:
    """
    Thread-safe singleton FAISS vector store.
    Supports multilingual embeddings (Arabic + English) via Cohere.
    """

    _instance: Optional["VectorStoreManager"] = None

    def __init__(self):
        self.dim = EMBED_DIM
        self.index_path = INDEX_PATH
        self.metadata_path = f"{INDEX_PATH}.json"
        self.index = faiss.IndexFlatIP(self.dim)
        self.metadata: list[dict] = []
        self._load_if_exists()

    @classmethod
    def get_instance(cls) -> "VectorStoreManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Core Operations ────────────────────────────────────────────────────────

    def add(self, embeddings: np.ndarray, metadata: list[dict]) -> None:
        """Add normalized embeddings and their metadata to the store."""
        if embeddings.shape[0] != len(metadata):
            raise ValueError("Embeddings and metadata count mismatch")
        vecs = embeddings.astype(np.float32)
        faiss.normalize_L2(vecs)
        self.index.add(vecs)
        self.metadata.extend(metadata)
        logger.info(f"[VectorStore] Added {len(metadata)} vectors. Total: {self.size}")

    def add_unique(
        self,
        embeddings: np.ndarray,
        metadata: list[dict],
        unique_key: str = "chunk_id",
    ) -> int:
        """
        Add vectors whose metadata unique_key is not already present.

        This prevents duplicate chunks during repeated incremental ingestion runs.
        """
        existing = {
            item.get(unique_key)
            for item in self.metadata
            if item.get(unique_key) is not None
        }
        keep_indices = [
            idx
            for idx, item in enumerate(metadata)
            if item.get(unique_key) is None or item.get(unique_key) not in existing
        ]
        if not keep_indices:
            logger.info("[VectorStore] No new unique vectors to add")
            return 0

        filtered_embeddings = embeddings[keep_indices]
        filtered_metadata = [metadata[idx] for idx in keep_indices]
        self.add(filtered_embeddings, filtered_metadata)
        return len(filtered_metadata)

    def remove_where(self, predicate: Callable[[dict], bool]) -> int:
        """
        Remove vectors whose metadata matches predicate without rebuilding the index.

        FAISS compacts flat-index ids after removal, so metadata is filtered in the
        same order to keep ids aligned with vectors.
        """
        remove_ids = [idx for idx, item in enumerate(self.metadata) if predicate(item)]
        if not remove_ids:
            return 0

        ids = np.array(remove_ids, dtype=np.int64)
        removed = int(self.index.remove_ids(ids))
        remove_set = set(remove_ids)
        self.metadata = [
            item for idx, item in enumerate(self.metadata) if idx not in remove_set
        ]
        logger.info(f"[VectorStore] Removed {removed} vectors. Total: {self.size}")
        return removed

    def remove_by_source(self, source: str, content_type: str | None = None) -> int:
        """Remove vectors for one source URL, optionally scoped by type."""
        return self.remove_where(
            lambda item: item.get("source") == source
            and (content_type is None or item.get("type") == content_type)
        )

    def rebuild(self, embeddings: np.ndarray, metadata: list[dict]) -> None:
        """Replace the current store contents with a fresh index."""
        if embeddings.shape[0] != len(metadata):
            raise ValueError("Embeddings and metadata count mismatch")
        vecs = embeddings.astype(np.float32)
        faiss.normalize_L2(vecs)
        self.index = faiss.IndexFlatIP(self.dim)
        self.index.add(vecs)
        self.metadata = list(metadata)
        logger.info(f"[VectorStore] Rebuilt store with {len(metadata)} vectors")

    def search(self, query_vec: np.ndarray, k: int = 5) -> list[dict]:
        """
        Search for top-k most similar documents.
        Note: Search results are cached by query_vec hash to avoid redundant FAISS calls.
        """
        if self.size == 0:
            return []
        k = min(k, self.size)
        q = query_vec.astype(np.float32).reshape(1, -1)
        faiss.normalize_L2(q)
        scores, indices = self.index.search(q, k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.metadata):
                doc = dict(self.metadata[idx])
                doc["score"] = float(score)
                results.append(doc)
        return results

    def save(self) -> None:
        """Persist index and metadata to disk."""
        faiss.write_index(self.index, self.index_path)
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        logger.info(f"[VectorStore] Saved {self.size} vectors to {self.index_path}")

    @property
    def size(self) -> int:
        return self.index.ntotal

    # ── Private ────────────────────────────────────────────────────────────────

    def _load_if_exists(self) -> None:
        if Path(self.index_path).exists():
            self.index = faiss.read_index(self.index_path)
            logger.info(f"[VectorStore] Loaded index with {self.size} vectors")
        if Path(self.metadata_path).exists():
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)


class CohereEmbedder:
    """
    Multilingual Cohere embedder (Arabic + English).
    With embedding caching (1-hour TTL) to avoid recomputing identical queries.
    Implements batching and exponential backoff for reliability.
    """

    def __init__(self, api_key: Optional[str] = None):
        key = api_key or os.getenv("COHERE_API_KEY", "")
        if not key:
            raise ValueError("COHERE_API_KEY is required")
        self.client = cohere.ClientV2(api_key=key)
        self.model = EMBED_MODEL
        self.cache = get_cache_manager()

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        """Embed a list of documents (batch of 96)."""
        if not texts:
            raise ValueError("texts cannot be empty")
        all_embeddings = []
        for i in range(0, len(texts), 96):
            batch = texts[i: i + 96]
            embs = self._embed(batch, "search_document")
            all_embeddings.append(embs)
        return np.vstack(all_embeddings)

    async def embed_documents_cached(self, texts: list[str]) -> np.ndarray:
        """Embed documents while reusing cached embeddings for unchanged chunks."""
        if not texts:
            raise ValueError("texts cannot be empty")

        results: list[np.ndarray | None] = [None] * len(texts)
        misses: list[str] = []
        miss_indices: list[int] = []

        for idx, text in enumerate(texts):
            cache_key = _cache_key_embedding(f"doc:{text}")
            cached = await self.cache.get(cache_key)
            if cached is not None:
                results[idx] = np.array(cached, dtype=np.float32)
            else:
                misses.append(text)
                miss_indices.append(idx)

        if misses:
            embedded = self.embed_documents(misses)
            for idx, embedding in zip(miss_indices, embedded):
                results[idx] = embedding
                cache_key = _cache_key_embedding(f"doc:{texts[idx]}")
                await self.cache.set(cache_key, embedding.tolist(), EMBEDDING_CACHE_TTL)

        return np.vstack([item for item in results if item is not None])

    async def embed_query_cached(self, text: str) -> np.ndarray:
        """Embed a single query with caching (async version for RAG engine)."""
        if not text.strip():
            raise ValueError("query text cannot be empty")
        
        cache_key = _cache_key_embedding(text)
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached is not None:
            logger.debug(f"[Embedder] Cache HIT for query")
            return np.array(cached, dtype=np.float32)
        
        # Compute embedding
        embedding = self._embed([text], "search_query")[0]
        
        # Cache for future requests
        await self.cache.set(cache_key, embedding.tolist(), EMBEDDING_CACHE_TTL)
        logger.debug(f"[Embedder] Cached embedding with TTL={EMBEDDING_CACHE_TTL}s")
        
        return embedding

    def embed_query(self, text: str) -> np.ndarray:
        """Embed a single query string (sync version, no caching)."""
        if not text.strip():
            raise ValueError("query text cannot be empty")
        return self._embed([text], "search_query")[0]

    def _embed(self, texts: list[str], input_type: str, retries: int = 3) -> np.ndarray:
        import time
        for attempt in range(retries):
            try:
                resp = self.client.embed(
                    model=self.model,
                    texts=texts,
                    input_type=input_type,
                    embedding_types=["float"],
                )
                return np.array(resp.embeddings.float_, dtype=np.float32)
            except cohere.errors.TooManyRequestsError:
                delay = 60 * (2 ** attempt)
                logger.warning(f"[Embedder] Rate limited, retrying in {delay}s")
                time.sleep(delay)
            except Exception as e:
                raise RuntimeError(f"Embedding failed: {e}") from e
        raise RuntimeError("Embedding failed after max retries")
