"""
RAG orchestration — the central pipeline.

  embed query → search Qdrant → rank (role-bias) → LLM summarize

Keeps all heavy logic out of the routers.
"""

from app.core.config import (
    groq_client,
    gemini_model,
    qdrant_client,
    embedder,
    logger,
    COLLECTION,
    PDF_SMART_THRESHOLD,
)
from qdrant_client.models import FieldCondition, MatchAny, Filter

from app.core.prompts import build_rag_prompt, ROLE_RETRIEVAL_BIAS
from app.models.ranker import rank_cases

# Re-export for backward compatibility (health endpoint uses _qdrant)
_qdrant = qdrant_client


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
    logger.info("RAG query  │ role=%s │ topic=%s │ k=%d │ %s", role, topic, k, query[:80])

    # 1 — Embed query
    q_vector = embedder.encode(query).tolist()

    # 2 — Optional topic filter
    search_filter = None
    if topic and topic != "all":
        search_filter = Filter(
            must=[FieldCondition(key="topics", match=MatchAny(any=[topic]))]
        )

    # 3 — Vector search  (retrieve 2x, then re-rank down to k)
    results = qdrant_client.search(
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

    logger.info("RAG done   │ source=%s │ cases=%d", source, len(response_cases))
    return {
        "cases": response_cases,
        "summary": summary,
        "source": source,
        "ranked": True,
        "total_retrieved": len(results),
    }


# ── Summarisation for uploaded text / PDFs ───────────────────────────

def _extract_key_points(text: str) -> str:
    """
    Extract key points from a long legal document before sending to LLM.
    This reduces token usage and focuses the LLM on important content.
    """
    prompt = (
        "You are a legal document analyst. Extract the **key points** from the "
        "following legal text. Focus on:\n"
        "- Core legal issues\n"
        "- Important facts\n"
        "- Court holdings / decisions\n"
        "- Relevant IPC / BNS sections cited\n"
        "- Final outcome\n\n"
        "Return a concise bullet-point summary (max 1500 words).\n\n"
        f"TEXT:\n{text[:8000]}\n\n"
        "KEY POINTS:"
    )
    result, _ = _generate_summary(prompt)
    return result


def summarize_document(text: str, model_id: str = "casecut-legal", mode: str = "lawyer") -> str:
    """
    General-purpose document summarisation with intelligent processing.

    If text is long (> PDF_SMART_THRESHOLD), extract key points first,
    then summarize the condensed version using mode-aware prompting.
    """
    logger.info(
        "Summarize  │ model=%s │ mode=%s │ text_len=%d",
        model_id, mode, len(text),
    )

    # Intelligent processing: condense long documents first
    if len(text) > PDF_SMART_THRESHOLD:
        logger.info("Summarize  │ Long document detected, extracting key points first")
        condensed = _extract_key_points(text)
        source_text = condensed
    else:
        source_text = text

    # Mode-aware summarization prompt
    mode_instructions = {
        "judge": (
            "Summarize this legal document from a **judicial perspective**. "
            "Focus on ratio decidendi, precedent alignment, and legal reasoning. "
            "Use an authoritative, neutral tone."
        ),
        "lawyer": (
            "Summarize this legal document for a **practicing lawyer**. "
            "Highlight applicable legal principles, strategic implications, "
            "and key IPC/BNS sections. Use precise legal terminology."
        ),
        "student": (
            "Summarize this legal document for a **law student**. "
            "Explain key concepts simply, define legal terms, and highlight "
            "why this case matters as a precedent. Use accessible language."
        ),
        "summary": (
            "Provide a **concise executive summary** of this legal document. "
            "Use bullet points for key facts, legal issues, holdings, and outcome. "
            "Keep it brief and scannable."
        ),
    }

    instruction = mode_instructions.get(mode, mode_instructions["lawyer"])

    prompt = (
        f"{instruction}\n\n"
        f"TEXT:\n{source_text[:6000]}\n\n"
        "SUMMARY:"
    )
    summary, _ = _generate_summary(prompt)
    return summary


# ── Private helpers ──────────────────────────────────────────────────

def _generate_summary(prompt: str) -> tuple[str, str]:
    """Try Groq → fallback Gemini. Returns (text, source)."""
    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.3,
        )
        return resp.choices[0].message.content, "groq"
    except Exception:
        try:
            resp = gemini_model.generate_content(prompt)
            return resp.text, "gemini"
        except Exception as e:
            logger.error("LLM error: %s", e)
            return f"Error generating summary: {e}", "error"
