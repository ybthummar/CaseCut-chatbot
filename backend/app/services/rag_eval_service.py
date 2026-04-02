"""
Strict RAG answer evaluation service.

Evaluates a model answer against:
  1) user query
  2) retrieved context chunks

No external knowledge is used. All judgments are computed only from provided text.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any


STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "to", "of", "in",
    "on", "for", "by", "with", "from", "at", "as", "is", "are", "was", "were", "be",
    "been", "being", "this", "that", "these", "those", "it", "its", "into", "about",
    "under", "over", "between", "within", "without", "what", "which", "who", "whom",
    "when", "where", "why", "how", "does", "do", "did", "can", "could", "should",
    "would", "may", "might", "must", "shall", "than", "such", "any", "all",
}

VAGUE_TERMS = {
    "generally", "usually", "often", "typically", "commonly", "likely", "may", "might",
    "can", "possibly", "in many cases", "tends to",
}


@dataclass
class ContextChunk:
    source: str
    text: str


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9_]+", (text or "").lower())


def _keyword_tokens(text: str) -> list[str]:
    tokens = _tokenize(text)
    return [t for t in tokens if len(t) > 2 and t not in STOPWORDS]


def _clamp_score(v: float) -> int:
    return int(max(0, min(5, round(v))))


def _first_non_empty(mapping: dict[str, Any], keys: list[str]) -> str:
    for key in keys:
        value = mapping.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _flatten_context_item(item: Any, index: int) -> ContextChunk:
    default_source = f"context_{index + 1}"

    if isinstance(item, str):
        return ContextChunk(source=default_source, text=item)

    if isinstance(item, dict):
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}

        source = _first_non_empty(
            item,
            ["source", "id", "title", "case_name", "citation", "doc_id"],
        )
        if not source:
            source = _first_non_empty(payload, ["source", "id", "title", "case_name", "citation"])
        if not source:
            source = default_source

        text = _first_non_empty(
            item,
            ["text", "content", "chunk", "excerpt", "full_text", "summary"],
        )
        if not text:
            text = _first_non_empty(
                payload,
                ["text", "content", "chunk", "excerpt", "full_text", "summary"],
            )

        return ContextChunk(source=source, text=text)

    return ContextChunk(source=default_source, text=str(item))


def _normalize_context(retrieved_context: list[Any]) -> list[ContextChunk]:
    return [_flatten_context_item(item, idx) for idx, item in enumerate(retrieved_context or [])]


def _split_claims(answer: str) -> list[str]:
    if not answer:
        return []

    cleaned = answer.replace("\r", "\n")
    # Split by sentence boundaries and bullet lines.
    parts = re.split(r"[\n]+|(?<=[.!?])\s+", cleaned)
    claims = []
    for p in parts:
        c = p.strip(" -\t")
        if len(c) >= 20:
            claims.append(c)
    return claims


def _jaccard_similarity(a: str, b: str) -> float:
    ta = set(_keyword_tokens(a))
    tb = set(_keyword_tokens(b))
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0


def _claim_support_score(claim: str, context_text: str) -> float:
    if not claim or not context_text:
        return 0.0

    claim_l = claim.lower()
    ctx_l = context_text.lower()

    if len(claim_l) >= 32 and claim_l in ctx_l:
        return 1.0

    seq = SequenceMatcher(None, claim_l, ctx_l).ratio()
    jac = _jaccard_similarity(claim_l, ctx_l)

    # Weighted blend favors token overlap over raw sequence matching.
    return (0.35 * seq) + (0.65 * jac)


def _best_support(claim: str, contexts: list[ContextChunk]) -> tuple[float, str]:
    best = 0.0
    best_source = ""
    for chunk in contexts:
        s = _claim_support_score(claim, chunk.text)
        if s > best:
            best = s
            best_source = chunk.source
    return best, best_source


def _coverage_ratio(query: str, text: str) -> float:
    q_tokens = set(_keyword_tokens(query))
    if not q_tokens:
        return 0.0
    t_tokens = set(_keyword_tokens(text))
    if not t_tokens:
        return 0.0
    return len(q_tokens & t_tokens) / len(q_tokens)


def _extract_missing_points(query: str, answer: str, limit: int = 6) -> list[str]:
    q_tokens = [t for t in _keyword_tokens(query) if len(t) > 3]
    a_tokens = set(_keyword_tokens(answer))
    missing = []
    seen = set()
    for token in q_tokens:
        if token not in a_tokens and token not in seen:
            seen.add(token)
            missing.append(token)
        if len(missing) >= limit:
            break
    return missing


def _detect_citations(answer: str, sources: list[str]) -> tuple[int, int, list[str]]:
    ans = answer or ""
    source_hits = 0
    normalized_sources = [s.strip() for s in sources if s and s.strip()]

    for src in normalized_sources:
        if src.lower() in ans.lower():
            source_hits += 1

    citation_patterns = [
        r"\[[^\]]+\]",
        r"\(source[^\)]*\)",
        r"\bcited?\b",
        r"\b📎\s*sources?\b",
        r"\bsources?\s*:",
    ]
    pattern_hits = 0
    for pat in citation_patterns:
        if re.search(pat, ans, flags=re.IGNORECASE):
            pattern_hits += 1

    issues = []
    if pattern_hits == 0 and source_hits == 0:
        issues.append("No explicit citations or source references detected.")
    if normalized_sources and source_hits == 0:
        issues.append("Answer does not reference any provided context source identifiers.")
    if pattern_hits > 0 and source_hits == 0 and normalized_sources:
        issues.append("Citation style present, but citations are not traceable to provided source labels.")

    return pattern_hits, source_hits, issues


def evaluate_rag_answer(query: str, retrieved_context: list[Any], model_answer: str) -> dict[str, Any]:
    contexts = _normalize_context(retrieved_context)
    context_text = "\n".join(chunk.text for chunk in contexts if chunk.text)
    sources = [chunk.source for chunk in contexts]

    query = (query or "").strip()
    model_answer = (model_answer or "").strip()

    # 1) Context relevance
    context_coverage = _coverage_ratio(query, context_text)
    context_relevance_score = _clamp_score(context_coverage * 5.0)
    if not contexts or not context_text.strip():
        context_relevance_score = 0
        context_relevance_reason = "Retrieved context is empty or unusable for the query."
    elif context_relevance_score >= 4:
        context_relevance_reason = "Retrieved context strongly matches the core query terms and likely contains required details."
    elif context_relevance_score >= 2:
        context_relevance_reason = "Retrieved context is partially relevant but may miss some query-specific legal details."
    else:
        context_relevance_reason = "Retrieved context has weak lexical overlap with the query and likely lacks key information."

    # Claims support analysis for sections 2, 3, and 5.
    claims = _split_claims(model_answer)
    unsupported_claims: list[str] = []
    hallucinated_parts: list[str] = []
    supported_count = 0

    for claim in claims:
        support_score, _best_source = _best_support(claim, contexts)
        if support_score >= 0.42:
            supported_count += 1
        else:
            unsupported_claims.append(claim)
            hallucinated_parts.append(claim)

    total_claims = len(claims)
    support_ratio = (supported_count / total_claims) if total_claims else 0.0

    # 2) Groundedness
    groundedness_score = _clamp_score(support_ratio * 5.0)
    if total_claims == 0:
        groundedness_score = 0
        groundedness_reason = "No verifiable factual claims detected in model answer."
    elif groundedness_score >= 4:
        groundedness_reason = "Most claims are traceable to retrieved context."
    elif groundedness_score >= 2:
        groundedness_reason = "Answer is partially grounded; some claims are not directly supported by context."
    else:
        groundedness_reason = "Answer has low traceability; many claims are unsupported by retrieved context."

    # 3) Hallucination detection
    unsupported_ratio = (len(hallucinated_parts) / total_claims) if total_claims else 1.0
    hallucination_score = _clamp_score((1.0 - unsupported_ratio) * 5.0)
    if total_claims == 0:
        hallucination_score = 0
        hallucination_reason = "Unable to verify hallucination risk because no factual claims were detected."
    elif hallucination_score == 5:
        hallucination_reason = "No hallucinated factual statements detected against provided context."
    elif hallucination_score >= 3:
        hallucination_reason = "Some likely hallucinated or ungrounded statements were detected."
    else:
        hallucination_reason = "Severe hallucination risk: multiple statements are not present in retrieved context."

    # 4) Completeness
    query_answer_coverage = _coverage_ratio(query, model_answer)
    missing_points = _extract_missing_points(query, model_answer)
    completeness_score = _clamp_score(query_answer_coverage * 5.0)

    if completeness_score >= 4 and not missing_points:
        completeness_reason = "Answer addresses the key query elements comprehensively."
    elif completeness_score >= 2:
        completeness_reason = "Answer addresses part of the query but omits some important legal aspects."
    else:
        completeness_reason = "Answer does not sufficiently cover the important query requirements."

    # Optional advanced check: vague legal language penalty.
    vague_hits = []
    lower_answer = model_answer.lower()
    for term in VAGUE_TERMS:
        if term in lower_answer:
            vague_hits.append(term)
    if len(vague_hits) >= 3 and completeness_score > 0:
        completeness_score = max(0, completeness_score - 1)
        completeness_reason += " Vague legal phrasing reduces completeness confidence."

    # 5) Accuracy (context-only)
    accuracy_score = _clamp_score((support_ratio * 4.0) + (query_answer_coverage * 1.0))
    errors = []
    if unsupported_claims:
        errors.extend(unsupported_claims[:8])
    if not context_text.strip() and model_answer:
        errors.append("Model answer provides facts despite empty retrieved context.")

    if accuracy_score >= 4:
        accuracy_reason = "Answer is factually aligned with provided context and shows no major contradictions."
    elif accuracy_score >= 2:
        accuracy_reason = "Answer has partial factual alignment; several statements are uncertain from context alone."
    else:
        accuracy_reason = "Answer is factually unreliable relative to the retrieved context."

    # 6) Citation quality
    pattern_hits, source_hits, citation_issues = _detect_citations(model_answer, sources)
    citation_quality_score = 0
    if pattern_hits > 0 and source_hits > 0:
        citation_quality_score = 5 if source_hits >= 2 else 4
    elif pattern_hits > 0 or source_hits > 0:
        citation_quality_score = 2
    else:
        citation_quality_score = 0

    if citation_quality_score >= 4:
        citation_reason = "Citations are present and traceable to provided context sources."
    elif citation_quality_score >= 2:
        citation_reason = "Citations are present but incomplete or weakly traceable."
    else:
        citation_reason = "Citation quality is poor; factual claims are not properly referenced to context."

    # Final verdict
    all_scores = [
        context_relevance_score,
        groundedness_score,
        hallucination_score,
        completeness_score,
        accuracy_score,
        citation_quality_score,
    ]
    overall_score = round(sum(all_scores) / len(all_scores), 2)

    if overall_score >= 4.0:
        confidence = "HIGH"
    elif overall_score >= 2.5:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    summary = (
        "Evaluation completed using only retrieved context. "
        f"Supported claims: {supported_count}/{total_claims}. "
        f"Potential hallucinations: {len(hallucinated_parts)}."
    )

    return {
        "query": query,
        "scores": {
            "context_relevance": {
                "score": context_relevance_score,
                "reason": context_relevance_reason,
            },
            "groundedness": {
                "score": groundedness_score,
                "reason": groundedness_reason,
                "unsupported_claims": unsupported_claims,
            },
            "hallucination": {
                "score": hallucination_score,
                "reason": hallucination_reason,
                "hallucinated_parts": hallucinated_parts,
            },
            "completeness": {
                "score": completeness_score,
                "reason": completeness_reason,
                "missing_points": missing_points,
            },
            "accuracy": {
                "score": accuracy_score,
                "reason": accuracy_reason,
                "errors": errors,
            },
            "citation_quality": {
                "score": citation_quality_score,
                "reason": citation_reason,
                "issues": citation_issues,
            },
        },
        "final_verdict": {
            "overall_score": overall_score,
            "confidence": confidence,
            "summary": summary,
        },
    }
