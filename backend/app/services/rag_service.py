"""
RAG service — orchestrates the full retrieval-augmented generation pipeline.

  embed query → search Qdrant → rank → build prompt → LLM generate

This is a thin coordinator calling other services.
Includes: confidence scoring, conversation context, PDF chat, strategic mode.
"""

import logging
import re

from app.services import llm_service, qdrant_service
from app.services.reranker_service import rerank_with_llm
from app.core.prompts import (
    build_rag_prompt,
    build_pdf_chat_prompt,
    build_response_profile,
    ROLE_RETRIEVAL_BIAS,
)
from app.models.ranker import rank_cases

logger = logging.getLogger("casecut")


def sanitize_query(query: str) -> str:
    """Strip prompt-injection patterns and cap length."""
    q = re.sub(r'(?i)(ignore|forget|disregard)\s+(all|previous|above)', '', query)
    return q.strip()[:500]


def _compute_confidence(sim_scores: list[float], num_results: int) -> dict:
    """
    Compute a retrieval confidence score to help guardrails.

    Returns:
        {level: 'high'|'medium'|'low', score: float, explanation: str}
    """
    if not sim_scores:
        return {"level": "low", "score": 0.0, "explanation": "No matching documents found."}

    avg_sim = sum(sim_scores) / len(sim_scores)
    top_sim = max(sim_scores)

    if top_sim >= 0.65 and avg_sim >= 0.45:
        return {
            "level": "high",
            "score": round(top_sim, 3),
            "explanation": f"Strong match (top similarity: {top_sim:.2f}, avg: {avg_sim:.2f})",
        }
    elif top_sim >= 0.40:
        return {
            "level": "medium",
            "score": round(top_sim, 3),
            "explanation": f"Moderate match (top: {top_sim:.2f}, avg: {avg_sim:.2f}). Results may be partially relevant.",
        }
    else:
        return {
            "level": "low",
            "score": round(top_sim, 3),
            "explanation": f"Weak match (top: {top_sim:.2f}). Results may not directly address your query.",
        }


def _infer_intent(query: str) -> str:
    """Infer a coarse response intent from user phrasing."""
    q = (query or "").lower()
    if any(k in q for k in ["brief", "short", "in short", "quick summary", "tldr"]):
        return "brief"
    if any(k in q for k in ["detail", "detailed", "in depth", "elaborate", "comprehensive"]):
        return "deep"
    if any(k in q for k in ["compare", "difference", "vs", "versus"]):
        return "compare"
    if any(k in q for k in ["steps", "how to", "next step", "what should i do", "action plan"]):
        return "steps"
    if any(k in q for k in ["explain", "what is", "why"]):
        return "explain"
    return "default"


def run_query(
    query: str,
    role: str = "lawyer",
    topic: str = "all",
    k: int = 5,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Full RAG pipeline.

    Returns:
        {cases, summary, source, ranked, total_retrieved, llm_time_ms, confidence}
    """
    clean_query = sanitize_query(query)
    logger.info("RAG start  │ role=%s │ topic=%s │ k=%d │ '%s'", role, topic, k, clean_query[:80])

    # 1 — Embed query
    q_vector = qdrant_service.embed_query(clean_query)

    # 2 — Vector search (with retry + min similarity)
    #     Retrieve more candidates (up to 20) so the LLM reranker has
    #     a richer pool to evaluate for legal relevance.
    retrieval_limit = max(k * 4, 20)
    results = qdrant_service.search(q_vector, topic=topic, limit=retrieval_limit)

    if not results:
        return {
            "cases": [],
            "summary": "⚠️ No matching cases found in the legal database. Try a different query or topic filter.",
            "source": "none",
            "ranked": False,
            "total_retrieved": 0,
            "llm_time_ms": 0,
            "confidence": _compute_confidence([], 0),
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
                "page_number": r.payload.get("page_number", ""),
                "section_title": r.payload.get("section_title", ""),
                "doc_id": r.payload.get("doc_id", ""),
                "chunk_id": r.payload.get("chunk_id", ""),
                "source_url": r.payload.get("source_url", ""),
            },
        })
        sim_scores.append(r.score)

    # 4 — Compute retrieval confidence
    confidence = _compute_confidence(sim_scores, len(results))

    # 5 — LLM Reranker (with feature-based fallback)
    #     The LLM reranker evaluates each passage for legal relevance,
    #     IPC section alignment, court reasoning, and outcome matching.
    #     Falls back to the feature-based ranker if the LLM call fails.
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

    top_cases, used_llm_reranker = rerank_with_llm(
        query=clean_query,
        cases=cases,
        top_k=k,
        fallback_ranker=rank_cases,
        similarity_scores=sim_scores,
        custom_weights=custom_weights,
    )

    # 6 — Format response cases with enhanced citation metadata
    response_cases = []
    for c in top_cases:
        p = c.get("payload", {})
        response_cases.append({
            "id": c["id"],
            "text": p.get("text", "")[:500],
            "court": p.get("court", "Unknown"),
            "date": p.get("date", ""),
            "ipc_sections": p.get("ipc_sections", []),
            "topics": p.get("topics", []),
            "outcome": p.get("outcome", ""),
            "file": p.get("file", ""),
            "page_number": p.get("page_number", ""),
            "section_title": p.get("section_title", ""),
            "doc_id": p.get("doc_id", ""),
            "chunk_id": p.get("chunk_id", ""),
            "source_url": p.get("source_url", ""),
            "rank_score": c.get("rank_score", 0),
            "similarity": round(sim_scores[0], 3) if sim_scores else 0,
        })

    # 7 — Build context block with richer citations
    context = "\n---\n".join(
        f"[Case from {c['court']}] "
        f"(File: {c.get('file', 'N/A')}) "
        f"(IPC: {', '.join(c['ipc_sections'][:3]) or 'N/A'}) "
        f"(Date: {c.get('date', 'N/A')}) "
        f"(Outcome: {c['outcome']}) "
        f"(Source: {c.get('source_url', 'N/A')})\n{c['text']}"
        for c in response_cases
    )

    # 8 — Generate role-aware summary with conversation history
    intent = _infer_intent(clean_query)
    profile = build_response_profile(role, intent)
    prompt = build_rag_prompt(role, clean_query, context, conversation_history, profile)
    summary, source, duration = llm_service.generate(prompt)

    logger.info("RAG done   │ source=%s │ cases=%d │ confidence=%s │ reranker=%s │ %dms",
                source, len(response_cases), confidence["level"],
                "llm" if used_llm_reranker else "feature", duration)

    return {
        "cases": response_cases,
        "summary": summary,
        "source": source,
        "ranked": True,
        "reranker": "llm" if used_llm_reranker else "feature",
        "total_retrieved": len(results),
        "llm_time_ms": duration,
        "confidence": confidence,
    }


# ── PDF Chat (query an uploaded document) ─────────────────────────────

def chat_with_pdf(
    query: str,
    document_text: str,
    role: str = "lawyer",
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Chat with an uploaded PDF document.

    Chunks the document, embeds the query, finds relevant chunks,
    and sends them to the LLM with the query.

    Returns:
        {answer, source, llm_time_ms, citations, confidence}
    """
    from app.models.embeddings import chunk_text
    from app.core.config import embedder
    import numpy as np

    clean_query = sanitize_query(query)
    logger.info("PDF Chat   │ role=%s │ doc_len=%d │ '%s'", role, len(document_text), clean_query[:80])

    # 1 — Chunk the document
    chunks = chunk_text(document_text, chunk_size=500, overlap=100)
    if not chunks:
        return {
            "answer": "⚠️ Could not extract meaningful content from the document.",
            "source": "none",
            "llm_time_ms": 0,
            "citations": [],
            "confidence": {"level": "low", "score": 0.0, "explanation": "No content extracted."},
        }

    # 2 — Embed query and chunks
    q_vector = embedder.encode(clean_query)
    chunk_vectors = embedder.encode(chunks)

    # 3 — Cosine similarity search
    similarities = np.dot(chunk_vectors, q_vector) / (
        np.linalg.norm(chunk_vectors, axis=1) * np.linalg.norm(q_vector) + 1e-8
    )

    # 4 — Get top-5 relevant chunks
    top_indices = np.argsort(similarities)[::-1][:5]
    top_chunks = []
    top_scores = []
    for idx in top_indices:
        if similarities[idx] >= 0.2:  # minimum relevance threshold
            idx_int = int(idx)
            approx_page = int(max(1, (idx_int * 500) // 3000 + 1))
            top_chunks.append({
                "text": chunks[idx_int],
                "chunk_index": idx_int,
                "similarity": round(float(similarities[idx]), 3),
                "approximate_page": approx_page,  # rough page estimate
            })
            top_scores.append(float(similarities[idx]))

    if not top_chunks:
        return {
            "answer": "⚠️ The requested information was not found in this document. Try rephrasing your question.",
            "source": "none",
            "llm_time_ms": 0,
            "citations": [],
            "confidence": {"level": "low", "score": 0.0, "explanation": "No relevant sections found."},
        }

    # 5 — Confidence
    confidence = _compute_confidence(top_scores, len(top_chunks))

    # 6 — Build document context
    doc_context = "\n---\n".join(
        f"[Section ~Page {c['approximate_page']}, Chunk {c['chunk_index']+1}] "
        f"(Relevance: {c['similarity']:.2f})\n{c['text']}"
        for c in top_chunks
    )

    # 7 — Generate answer
    intent = _infer_intent(clean_query)
    profile = build_response_profile(role, intent)
    prompt = build_pdf_chat_prompt(role, clean_query, doc_context, conversation_history, profile)
    answer, source, duration = llm_service.generate(prompt)

    logger.info("PDF Chat done │ source=%s │ chunks=%d │ confidence=%s │ %dms",
                source, len(top_chunks), confidence["level"], duration)

    return {
        "answer": answer,
        "source": source,
        "llm_time_ms": duration,
        "citations": top_chunks,
        "confidence": confidence,
    }
