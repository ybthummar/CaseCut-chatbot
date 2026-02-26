"""
RAG service — orchestrates the full retrieval-augmented generation pipeline.

  embed query → search Qdrant → rank → build prompt → LLM generate

This is a thin coordinator calling other services.
"""

import logging
import re

from app.services import llm_service, qdrant_service
from app.core.prompts import build_rag_prompt, ROLE_RETRIEVAL_BIAS
from app.models.ranker import rank_cases

logger = logging.getLogger("casecut")


def sanitize_query(query: str) -> str:
    """Strip prompt-injection patterns and cap length."""
    q = re.sub(r'(?i)(ignore|forget|disregard)\s+(all|previous|above)', '', query)
    return q.strip()[:500]


def run_query(query: str, role: str = "lawyer", topic: str = "all", k: int = 5) -> dict:
    """
    Full RAG pipeline.

    Returns:
        {cases, summary, source, ranked, total_retrieved, llm_time_ms}
    """
    clean_query = sanitize_query(query)
    logger.info("RAG start  │ role=%s │ topic=%s │ k=%d │ '%s'", role, topic, k, clean_query[:80])

    # 1 — Embed query
    q_vector = qdrant_service.embed_query(clean_query)

    # 2 — Vector search (with retry + min similarity)
    results = qdrant_service.search(q_vector, topic=topic, limit=k * 2)

    if not results:
        return {
            "cases": [],
            "summary": "No matching cases found. Try a different query or topic filter.",
            "source": "none",
            "ranked": False,
            "total_retrieved": 0,
            "llm_time_ms": 0,
        }

    # 3 — Prepare cases + similarity scores
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

    # 4 — Role-aware ranking
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

    ranked = rank_cases(cases, clean_query, similarity_scores=sim_scores, weights=custom_weights)
    top_cases = ranked[:k]

    # 5 — Format response cases
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
        })

    # 6 — Build context block
    context = "\n---\n".join(
        f"[Case from {c['court']}] (IPC: {', '.join(c['ipc_sections'][:3]) or 'N/A'}) "
        f"(Outcome: {c['outcome']})\n{c['text']}"
        for c in response_cases
    )

    # 7 — Generate role-aware summary
    prompt = build_rag_prompt(role, clean_query, context)
    summary, source, duration = llm_service.generate(prompt)

    logger.info("RAG done   │ source=%s │ cases=%d │ %dms", source, len(response_cases), duration)

    return {
        "cases": response_cases,
        "summary": summary,
        "source": source,
        "ranked": True,
        "total_retrieved": len(results),
        "llm_time_ms": duration,
    }
