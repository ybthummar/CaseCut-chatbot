"""
CaseCut Legal RAG API — v5.0 (Production-Ready)

Architecture:
  app/services/   – business logic  (llm, qdrant, rag, summarizer)
  app/routers/    – HTTP endpoints  (chat, summarize, pdf, feedback)
  app/schemas/    – response models
  app/middleware/  – error handling
  app/core/       – config, prompts, history
  app/models/     – embeddings, ranker
"""

from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat, summarize, pdf, feedback
from app.middleware.error_handler import ErrorHandlerMiddleware

logger = logging.getLogger("casecut")


# ── Startup / Shutdown lifecycle ─────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup checks, then yield to serve, then shutdown."""
    _print_startup_banner()
    yield
    logger.info("CaseCut Backend shutting down.")


def _print_startup_banner():
    """Print rich startup banner with service status checks."""
    from app.core.config import qdrant_client, embedder, COLLECTION

    banner = """
╔══════════════════════════════════════════════════════════╗
║           🏛️  CaseCut Backend Started Successfully       ║
╚══════════════════════════════════════════════════════════╝
"""
    print(banner)

    # — Qdrant —
    try:
        collections = qdrant_client.get_collections()
        names = [c.name for c in collections.collections]
        if COLLECTION in names:
            info = qdrant_client.get_collection(COLLECTION)
            logger.info("✅ Qdrant       │ Connected │ '%s' │ %d vectors", COLLECTION, info.points_count)
        else:
            logger.warning("⚠️  Qdrant       │ Connected │ '%s' NOT FOUND", COLLECTION)
    except Exception as e:
        logger.error("❌ Qdrant       │ Connection FAILED │ %s", e)

    # — LLM —
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    gemini_ok = bool(os.getenv("GEMINI_API_KEY"))
    logger.info(
        "✅ LLM          │ Groq: %s │ Gemini: %s │ Timeout: %ss",
        "configured" if groq_ok else "⚠️  MISSING",
        "configured" if gemini_ok else "⚠️  MISSING",
        os.getenv("LLM_TIMEOUT", "30"),
    )

    # — Embedder —
    dim = embedder.get_sentence_embedding_dimension()
    logger.info("✅ Embedder     │ all-MiniLM-L6-v2 │ dim=%d", dim)

    # — HuggingFace —
    hf_ok = bool(os.getenv("HF_API_TOKEN"))
    logger.info("ℹ️  HuggingFace  │ Token: %s", "configured" if hf_ok else "not set (HF models won't work)")

    logger.info("🚀 API ready    │ http://0.0.0.0:%s │ v5.0", os.getenv("PORT", "8000"))


# ── App ──────────────────────────────────────────────────────────────

app = FastAPI(title="CaseCut Legal RAG API", version="5.0", lifespan=lifespan)

# Global error handler middleware (catches unhandled exceptions)
app.add_middleware(ErrorHandlerMiddleware)

# CORS — restricted to known origins
ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register routers ────────────────────────────────────────────────

app.include_router(chat.router)
app.include_router(summarize.router)
app.include_router(pdf.router)
app.include_router(feedback.router)


# ── Lightweight inline endpoints ─────────────────────────────────────

TOPICS = [
    {"id": "all", "name": "All Topics"},
    {"id": "bail", "name": "Bail"},
    {"id": "murder", "name": "Murder / Homicide"},
    {"id": "theft", "name": "Theft / Robbery"},
    {"id": "fraud", "name": "Fraud / Cheating"},
    {"id": "cyber", "name": "Cyber Crime"},
    {"id": "contract", "name": "Contract Law"},
    {"id": "property", "name": "Property Disputes"},
    {"id": "constitutional", "name": "Constitutional Law"},
    {"id": "family", "name": "Family Law"},
    {"id": "defamation", "name": "Defamation"},
]


@app.get("/topics")
def get_topics():
    return {"topics": TOPICS}


@app.get("/health")
def health():
    """Health check with service status."""
    from app.core.config import qdrant_client

    services = {}
    try:
        qdrant_client.get_collections()
        services["qdrant"] = "connected"
    except Exception:
        services["qdrant"] = "error"

    services["groq"] = "configured" if os.getenv("GROQ_API_KEY") else "missing"
    services["gemini"] = "configured" if os.getenv("GEMINI_API_KEY") else "missing"
    services["embedder"] = "loaded"
    services["huggingface"] = "configured" if os.getenv("HF_API_TOKEN") else "not_set"

    all_ok = all(v not in ("error", "missing") for v in services.values())
    return {
        "status": "healthy" if all_ok else "degraded",
        "services": services,
        "version": "5.0",
    }


# ── Entrypoint ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
