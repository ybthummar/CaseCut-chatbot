"""
Ranker — feature-based re-ranking for retrieved legal cases.
(Moved from app/ranker.py → app/models/ranker.py — the old file still works as a
 compatibility shim.)
"""

import re
from datetime import datetime
from typing import List, Dict, Optional

COURT_WEIGHTS = {
    "Supreme Court of India": 1.0,
    "High Court": 0.8,
    "District Court": 0.5,
    "Sessions Court": 0.5,
    "Unknown": 0.3,
}


def extract_query_sections(query: str) -> list:
    matches = re.findall(r"[Ss]ection\s+(\d+[A-Z]?)", query)
    numbers = re.findall(r"\b(\d{2,3}[A-Z]?)\b", query)
    return list(set(matches + numbers))


def extract_query_topics(query: str) -> list:
    from app.utils.parser import TOPIC_KEYWORDS

    query_lower = query.lower()
    return [t for t, kws in TOPIC_KEYWORDS.items() if any(k in query_lower for k in kws)]


def court_score(court_name: str) -> float:
    for key, weight in COURT_WEIGHTS.items():
        if key.lower() in court_name.lower():
            return weight
    return 0.3


def ipc_match_score(query_sections: list, case_sections: list) -> float:
    if not query_sections or not case_sections:
        return 0.0
    overlap = len(set(query_sections) & set(case_sections))
    return min(overlap / max(len(query_sections), 1), 1.0)


def topic_match_score(query_topics: list, case_topics: list) -> float:
    if not query_topics or not case_topics:
        return 0.0
    overlap = len(set(query_topics) & set(case_topics))
    return min(overlap / max(len(query_topics), 1), 1.0)


def recency_score(date_str: str) -> float:
    if not date_str:
        return 0.3
    for fmt in [
        "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
        "%B %d, %Y", "%d %B %Y", "%d %B, %Y",
    ]:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            years_ago = (datetime.now() - dt).days / 365.25
            return max(0.1, 1.0 - (years_ago / 20.0))
        except ValueError:
            continue
    return 0.3


def rank_cases(
    cases: List[Dict],
    query: str,
    similarity_scores: Optional[List[float]] = None,
    weights: Optional[Dict[str, float]] = None,
) -> List[Dict]:
    if not cases:
        return []

    w = weights or {
        "semantic": 0.40,
        "ipc": 0.20,
        "topic": 0.15,
        "court": 0.15,
        "recency": 0.10,
    }

    query_sections = extract_query_sections(query)
    query_topics = extract_query_topics(query)

    ranked = []
    for i, case in enumerate(cases):
        payload = case.get("payload", case)
        sim = similarity_scores[i] if similarity_scores and i < len(similarity_scores) else 0.5
        ipc = ipc_match_score(query_sections, payload.get("ipc_sections", []))
        topic = topic_match_score(query_topics, payload.get("topics", []))
        court = court_score(payload.get("court", "Unknown"))
        recency = recency_score(payload.get("date", ""))

        score = (
            w["semantic"] * sim
            + w["ipc"] * ipc
            + w["topic"] * topic
            + w["court"] * court
            + w["recency"] * recency
        )

        ranked.append({
            **case,
            "rank_score": round(score, 4),
            "features": {
                "semantic": round(sim, 3),
                "ipc_match": round(ipc, 3),
                "topic_match": round(topic, 3),
                "court_authority": round(court, 3),
                "recency": round(recency, 3),
            },
        })

    ranked.sort(key=lambda x: x["rank_score"], reverse=True)
    return ranked
