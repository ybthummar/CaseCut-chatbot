"""
LLM Reranker — uses an LLM to evaluate and rank retrieved legal passages
by legal relevance to the user's query.

Pipeline position:
  Qdrant vector search (top 20) → LLM Reranker → top 5 → answer LLM

The reranker sends a structured prompt with all candidate passages and asks
the LLM to return only ranked passage IDs with relevance scores. This provides
much better legal-reasoning-aware ranking than pure vector similarity or
heuristic feature scoring.

Falls back to the feature-based ranker if the LLM call fails.
"""

import logging
import re
import time
from typing import Optional

from app.services import llm_service

logger = logging.getLogger("casecut")

# ── Master reranker prompt ─────────────────────────────────────────────

RERANKER_SYSTEM = """You are an expert AI legal analysis system designed to assist with Indian legal documents and court judgments.

Your task is to evaluate and rank legal passages retrieved from a vector database and identify the passages that are most relevant to a user's legal query.

You must prioritize both **legal accuracy and relevance** while keeping the reasoning concise.

## LEGAL RELEVANCE CRITERIA

When ranking passages, consider:

1. Whether the passage discusses the **same IPC section or statute**
2. Whether the **crime type matches the query**
3. Whether the **facts of the case are similar**
4. Whether the passage includes **court reasoning**
5. Whether the passage includes **punishment or judgment outcomes**
6. Whether the passage **directly answers the legal question**

Higher weight to passages that explicitly mention the relevant IPC section or clearly discuss the legal issue in the query.

## RANKING INSTRUCTIONS

1. Evaluate each passage independently.
2. Assign a **relevance score between 0 and 1**.
3. Rank passages from **most relevant to least relevant**.
4. Prefer passages with:
   - Direct IPC references
   - Similar criminal facts
   - Legal analysis by the court
5. Discard irrelevant passages (score < 0.3).

## OUTPUT FORMAT

Return ONLY the ranked passages in this exact format (no explanations, no extra text):

1. passage_ID : relevance_score
2. passage_ID : relevance_score
3. passage_ID : relevance_score
4. passage_ID : relevance_score
5. passage_ID : relevance_score

Example:
1. passage_7 : 0.94
2. passage_3 : 0.90
3. passage_1 : 0.87
4. passage_9 : 0.82
5. passage_5 : 0.79
"""


def _build_reranker_prompt(query: str, passages: list[dict]) -> str:
    """
    Build the full reranker prompt with user query and candidate passages.

    Args:
        query: User's legal question.
        passages: List of dicts, each with at least 'id' and 'payload.text'.

    Returns:
        Formatted prompt string.
    """
    passage_blocks = []
    for i, p in enumerate(passages):
        payload = p.get("payload", p)
        text = payload.get("text", "")[:600]  # cap per passage to stay within context
        court = payload.get("court", "Unknown")
        ipc = ", ".join(payload.get("ipc_sections", [])[:5]) or "N/A"
        date = payload.get("date", "N/A") or "N/A"
        outcome = payload.get("outcome", "unknown") or "unknown"

        passage_blocks.append(
            f"Passage_{i + 1}:\n"
            f"[Court: {court}] [IPC: {ipc}] [Date: {date}] [Outcome: {outcome}]\n"
            f"{text}"
        )

    passages_text = "\n\n".join(passage_blocks)

    return (
        f"{RERANKER_SYSTEM}\n\n"
        f"---\n\n"
        f"User Query:\n{query}\n\n"
        f"Candidate Legal Passages:\n\n{passages_text}\n\n"
        f"---\n\n"
        f"Return the top {min(len(passages), 5)} ranked passages now."
    )


def _parse_reranker_response(
    response: str,
    num_passages: int,
) -> list[tuple[int, float]]:
    """
    Parse the LLM's ranked output into a list of (passage_index, score) tuples.

    Expected format per line:  N. passage_X : 0.YZ

    Returns:
        Sorted list of (zero-based index, score) tuples.
    """
    results = []
    # Match lines like: "1. passage_7 : 0.94" or "1. passage_7: 0.94"
    pattern = re.compile(
        r"(?:^|\n)\s*\d+\.\s*passage[_\s]?(\d+)\s*:\s*([\d.]+)",
        re.IGNORECASE,
    )
    for match in pattern.finditer(response):
        passage_num = int(match.group(1))
        score = float(match.group(2))
        idx = passage_num - 1  # convert 1-based to 0-based
        if 0 <= idx < num_passages and 0.0 <= score <= 1.0:
            results.append((idx, score))

    # Deduplicate (keep first mention)
    seen = set()
    deduped = []
    for idx, score in results:
        if idx not in seen:
            seen.add(idx)
            deduped.append((idx, score))

    return deduped


def rerank_with_llm(
    query: str,
    cases: list[dict],
    top_k: int = 5,
    fallback_ranker=None,
    similarity_scores: list[float] | None = None,
    custom_weights: dict | None = None,
) -> tuple[list[dict], bool]:
    """
    Use an LLM to rerank retrieved legal passages by legal relevance.

    Args:
        query:             User's legal question.
        cases:             Candidate passages from vector search.
        top_k:             Number of top results to return.
        fallback_ranker:   Callable(cases, query, similarity_scores, weights) for fallback.
        similarity_scores: Original vector similarity scores (for fallback).
        custom_weights:    Weights dict for fallback ranker.

    Returns:
        (ranked_cases, used_llm)
        - ranked_cases: top_k cases sorted by LLM relevance score.
        - used_llm: True if LLM reranking succeeded, False if fell back.
    """
    if not cases:
        return [], False

    # Don't bother with LLM reranking for very few results
    if len(cases) <= 2:
        if fallback_ranker:
            ranked = fallback_ranker(
                cases, query,
                similarity_scores=similarity_scores,
                weights=custom_weights,
            )
            return ranked[:top_k], False
        return cases[:top_k], False

    logger.info(
        "Reranker   │ candidates=%d │ top_k=%d │ query='%s'",
        len(cases), top_k, query[:60],
    )

    start = time.perf_counter()

    try:
        prompt = _build_reranker_prompt(query, cases)
        response, source, duration = llm_service.generate(prompt)

        ranked_indices = _parse_reranker_response(response, len(cases))

        if not ranked_indices:
            logger.warning(
                "Reranker   │ LLM returned unparseable output, falling back │ response=%s",
                response[:200],
            )
            if fallback_ranker:
                ranked = fallback_ranker(
                    cases, query,
                    similarity_scores=similarity_scores,
                    weights=custom_weights,
                )
                return ranked[:top_k], False
            return cases[:top_k], False

        # Build result list in LLM-ranked order
        reranked = []
        for idx, score in ranked_indices[:top_k]:
            case = cases[idx].copy()
            case["rank_score"] = round(score, 4)
            case["reranker_source"] = source
            reranked.append(case)

        elapsed = int((time.perf_counter() - start) * 1000)
        logger.info(
            "Reranker   │ OK │ source=%s │ returned=%d │ %dms",
            source, len(reranked), elapsed,
        )

        return reranked, True

    except Exception as e:
        elapsed = int((time.perf_counter() - start) * 1000)
        logger.error("Reranker   │ FAILED │ %s │ %dms — falling back", e, elapsed)

        if fallback_ranker:
            ranked = fallback_ranker(
                cases, query,
                similarity_scores=similarity_scores,
                weights=custom_weights,
            )
            return ranked[:top_k], False
        return cases[:top_k], False
