"""
CaseCut Legal RAG API — v3.0

Modular FastAPI app.  All business logic lives under:
  app/core/    – prompts, RAG orchestration, history
  app/models/  – embeddings, ranker, summarizer
  app/routers/ – HTTP endpoints (query, feedback, upload)
  app/utils/   – parser helpers
"""

from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import query, feedback, upload

# ── App ──────────────────────────────────────────────────────────────

app = FastAPI(title="CaseCut Legal RAG API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ────────────────────────────────────────────────

app.include_router(query.router)
app.include_router(feedback.router)
app.include_router(upload.router)

# ── Lightweight endpoints kept inline ────────────────────────────────

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
    """Return available topic filters."""
    return {"topics": TOPICS}


@app.get("/health")
def health():
    """Health check with service status."""
    from app.core.logic import _qdrant  # lazy import avoids circular

    services = {}
    try:
        _qdrant.get_collections()
        services["qdrant"] = "connected"
    except Exception:
        services["qdrant"] = "error"

    services["groq"] = "configured" if os.getenv("GROQ_API_KEY") else "missing"
    services["gemini"] = "configured" if os.getenv("GEMINI_API_KEY") else "missing"
    services["embedder"] = "loaded"

    all_ok = all(v not in ("error", "missing") for v in services.values())
    return {
        "status": "healthy" if all_ok else "degraded",
        "services": services,
        "version": "3.0",
    }


# ── Entrypoint ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
