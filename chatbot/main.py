"""
FitMentor AI Backend — Production RAG System
Phase 6: FastAPI Production Backend
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from dotenv import load_dotenv

from chat import router as chat_router
from user import router as user_router
from recommendation import router as recommendation_router
from vector_store import VectorStoreManager
from engine import get_rag_engine
from ingestion import sync_site_knowledge
from ingestion_spa import routes_from_env, sync_spa_routes
from supabase_client import close_http_client

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and tear down resources on startup/shutdown."""
    logger.info("🚀 FitMentor RAG System starting up...")
    # Pre-load vector store on startup
    vs = VectorStoreManager.get_instance()
    logger.info(f"✅ Vector store ready. Vectors: {vs.size}")

    try:
        get_rag_engine()
        logger.info("✅ RAG engine warmed up")
    except Exception as e:
        logger.warning(f"⚠️ RAG engine warmup skipped: {e}")

    site_sync_url = os.getenv("SITE_SYNC_URL", "").strip()
    if site_sync_url:
        logger.info(f"🔄 Site sync enabled: {site_sync_url}")

        async def _sync_site() -> None:
            try:
                total = await sync_site_knowledge(
                    site_sync_url,
                    max_pages=int(os.getenv("SITE_SYNC_MAX_PAGES", "100")),
                    same_domain_only=True,
                )
                logger.info(f"✅ Site sync completed. chunks={total}")
            except Exception as e:
                logger.exception(f"❌ Site sync failed: {e}")

        import asyncio
        asyncio.create_task(_sync_site())

    spa_sync_url = os.getenv("SPA_BASE_URL", "").strip()
    spa_sync_on_startup = os.getenv("SPA_SYNC_ON_STARTUP", "").lower() in {"1", "true", "yes"}
    if spa_sync_url and spa_sync_on_startup:
        logger.info(f"🔄 SPA sync enabled: {spa_sync_url}")

        async def _sync_spa() -> None:
            try:
                total = await sync_spa_routes(
                    base_url=spa_sync_url,
                    routes=routes_from_env(),
                    concurrency=int(os.getenv("SPA_INGEST_CONCURRENCY", "4")),
                    timeout_ms=int(os.getenv("SPA_INGEST_TIMEOUT_MS", "30000")),
                    wait_ms=int(os.getenv("SPA_INGEST_WAIT_MS", "500")),
                    headless=os.getenv("SPA_INGEST_HEADFUL", "").lower() not in {"1", "true", "yes"},
                    storage_state=os.getenv("SPA_STORAGE_STATE", "").strip() or None,
                )
                logger.info(f"✅ SPA sync completed. chunks={total}")
            except Exception as e:
                logger.exception(f"❌ SPA sync failed: {e}")

        import asyncio
        asyncio.create_task(_sync_spa())
    elif spa_sync_url:
        logger.info("SPA sync configured but not run on startup. Set SPA_SYNC_ON_STARTUP=true to enable.")

    yield
    await close_http_client()
    logger.info("🛑 FitMentor shutting down.")


app = FastAPI(
    title="FitMentor AI — Hybrid RAG Backend",
    version="4.0.0",
    description="Production-grade RAG system combining Supabase + FAISS for personalized fitness AI",
    lifespan=lifespan,
)

cors_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    
]

# لو في env override
env_origins = os.getenv("CORS_ORIGINS")

if env_origins:
   
    parsed = [o.strip().strip('"').strip("'") for o in env_origins.split(",") if o.strip()]
    cors_origins = parsed or cors_origins

allow_any_origin = "*" in cors_origins

# Always trust localhost/127.0.0.1 dev origins regardless of port
localhost_origin_regex = r"https?://(localhost|127\.0\.0\.1)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_any_origin else cors_origins,
    allow_origin_regex=localhost_origin_regex,
    # CORS spec: cannot combine allow_credentials=True with wildcard origin
    allow_credentials=not allow_any_origin,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(
    "CORS configured: origins=%s any_origin=%s origin_regex=%s credentials=%s",
    cors_origins,
    allow_any_origin,
    localhost_origin_regex,
    not allow_any_origin,
)

# ── API Routers ────────────────────────────────────────────────────────────────
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(user_router, prefix="/api/user", tags=["User"])
app.include_router(recommendation_router, prefix="/api/recommendation", tags=["Recommendation"])


@app.get("/api/health")
async def health():
    vs = VectorStoreManager.get_instance()
    return {
        "status": "ok",
        "version": "4.0.0",
        "mode": "hybrid_rag",
        "vector_store_size": vs.size,
        "llm_provider": os.getenv("LLM_PROVIDER", "cohere"),
    }


# ── Static Frontend ────────────────────────────────────────────────────────────
WEB_DIR = Path(__file__).resolve().parent.parent / "web"
if WEB_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(WEB_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(str(WEB_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
