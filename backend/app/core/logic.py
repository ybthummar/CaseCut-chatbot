"""
RAG orchestration — the central pipeline.

  embed query → search Qdrant → rank (role-bias) → LLM summarize

Keeps all heavy logic out of the routers.
"""

import os
from groq import Groq
import google.generativeai as genai
from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, MatchAny, Filter
from sentence_transformers import SentenceTransformer

from app.core.prompts import build_rag_prompt, ROLE_RETRIEVAL_BIAS
from app.models.ranker import rank_cases

# ── Lazy singletons (initialised once at import time) ────────────────

_groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_gemini = genai.GenerativeModel("gemini-2.0-flash")

_qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_KEY"),
)

_embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

COLLECTION = "legal_cases"


# ── Public interface ─────────────────────────────────────────────────

def run_query(query: str, role: str = "lawyer", topic: str = "all", k: int = 5) -> dict:
    """
    Full RAG pipeline.

    Returns:
        {
            cases:           list of ranked case dicts,
            summary:         str,
            source:          'groq' | 'gemini' | 'error',
            ranked:          bool,
            total_retrieved: int,
        }
    """
    # 1 — Embed query
    q_vector = _embedder.encode(query).tolist()

    # 2 — Optional topic filter
    search_filter = None
    if topic and topic != "all":
        search_filter = Filter(
            must=[FieldCondition(key="topics", match=MatchAny(any=[topic]))]
        )

    # 3 — Vector search  (retrieve 2x, then re-rank down to k)
    results = _qdrant.search(
        collection_name=COLLECTION,
        query_vector=q_vector,
        query_filter=search_filter,
        limit=k * 2,
        with_payload=True,
    )

    if not results:
        return {
            "cases": [],
            "summary": "No matching cases found. Try a different query or topic filter.",
            "source": "none",
            "ranked": False,
            "total_retrieved": 0,
        }

    # 4 — Prepare cases + similarity scores
    cases, sim_scores = [], []
    for r in results:
        cases.append({
            "id": r.id,
            "payload": {
                "text": r.payload.get("text", ""),
                "file": r.payload.get("file", ""),
                "court": r.payload.get("court", "Unknown"),
                "date": r.payload.get("date", ""),
                "ipc_sections": r.payload.get("ipc_sections", []),
                "topics": r.payload.get("topics", []),
                "outcome": r.payload.get("outcome", "unknown"),
            },
        })
        sim_scores.append(r.score)

    # 5 — Role-aware ranking
    bias = ROLE_RETRIEVAL_BIAS.get(role, {})
    custom_weights = None
    if bias.get("court_weight_boost"):
        custom_weights = {
            "semantic": 0.40,
            "ipc": 0.20,
            "topic": 0.15,
            "court": 0.15 + bias["court_weight_boost"],
            "recency": 0.10 - bias["court_weight_boost"],
        }

    ranked = rank_cases(cases, query, similarity_scores=sim_scores, weights=custom_weights)
    top_cases = ranked[:k]

    # 6 — Format response cases
    response_cases = []
    for c in top_cases:
        p = c.get("payload", {})
        response_cases.append({
            "id": c["id"],
            "text": p.get("text", "")[:300],
            "court": p.get("court", "Unknown"),
            "ipc_sections": p.get("ipc_sections", []),
            "topics": p.get("topics", []),
            "outcome": p.get("outcome", ""),
            "rank_score": c.get("rank_score", 0),
            "features": c.get("features", {}),
        })

    # 7 — Build context block
    context = "\n---\n".join(
        f"[Case from {c['court']}] (IPC: {', '.join(c['ipc_sections'][:3]) or 'N/A'}) "
        f"(Outcome: {c['outcome']})\n{c['text']}"
        for c in response_cases
    )

    # 8 — Generate role-aware summary
    prompt = build_rag_prompt(role, query, context)
    summary, source = _generate_summary(prompt)

    return {
        "cases": response_cases,
        "summary": summary,
        "source": source,
        "ranked": True,
        "total_retrieved": len(results),
    }


# ── Summarisation for uploaded text / PDFs ───────────────────────────

def summarize_document(text: str, model_id: str = "casecut-legal") -> str:
    """
    General-purpose document summarisation.
    Routes locally – HuggingFace routing is done on the frontend.
    """
    prompt = (
        "You are a legal document summariser. Provide a concise, structured "
        "summary of the following text, highlighting key facts, legal issues, "
        "and outcomes.\n\n"
        f"TEXT:\n{text[:6000]}\n\n"
        "SUMMARY:"
    )
    summary, _ = _generate_summary(prompt)
    return summary


# ── Private helpers ──────────────────────────────────────────────────

def _generate_summary(prompt: str) -> tuple[str, str]:
    """Try Groq → fallback Gemini. Returns (text, source)."""
    try:
        resp = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.3,
        )
        return resp.choices[0].message.content, "groq"
    except Exception:
        try:
            resp = _gemini.generate_content(prompt)
            return resp.text, "gemini"
        except Exception as e:
            return f"Error generating summary: {e}", "error"
