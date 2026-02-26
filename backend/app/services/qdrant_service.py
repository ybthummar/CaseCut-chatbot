"""
Qdrant service — vector search with retry logic + minimum similarity.

Features:
  • 3 retries with exponential backoff on transient failures
  • Minimum similarity threshold (drops noisy results)
  • Optional topic metadata filter
  • Logs chunk count retrieved
"""

import time
import logging

from qdrant_client.models import FieldCondition, MatchAny, Filter

from app.core.config import (
    qdrant_client,
    embedder,
    COLLECTION,
    QDRANT_RETRY_ATTEMPTS,
    QDRANT_RETRY_DELAY,
    MIN_SIMILARITY,
)

logger = logging.getLogger("casecut")


def embed_query(query: str) -> list[float]:
    """Encode a text query into a 384-dim vector."""
    return embedder.encode(query).tolist()


def search(
    query_vector: list[float],
    topic: str = "all",
    limit: int = 10,
) -> list:
    """
    Search Qdrant with retry logic.

    Returns list of ScoredPoint objects (filtered by MIN_SIMILARITY).
    """
    # Optional topic filter
    search_filter = None
    if topic and topic != "all":
        search_filter = Filter(
            must=[FieldCondition(key="topics", match=MatchAny(any=[topic]))]
        )

    last_err = None
    for attempt in range(1, QDRANT_RETRY_ATTEMPTS + 1):
        try:
            results = qdrant_client.search(
                collection_name=COLLECTION,
                query_vector=query_vector,
                query_filter=search_filter,
                limit=limit,
                with_payload=True,
            )

            # Apply minimum similarity threshold
            filtered = [r for r in results if r.score >= MIN_SIMILARITY]

            logger.info(
                "Qdrant     │ attempt=%d │ raw=%d │ filtered=%d (min_sim=%.2f) │ topic=%s",
                attempt, len(results), len(filtered), MIN_SIMILARITY, topic,
            )
            return filtered

        except Exception as e:
            last_err = e
            logger.warning(
                "Qdrant     │ attempt %d/%d FAILED │ %s",
                attempt, QDRANT_RETRY_ATTEMPTS, e,
            )
            if attempt < QDRANT_RETRY_ATTEMPTS:
                time.sleep(QDRANT_RETRY_DELAY * attempt)

    logger.error("Qdrant     │ All %d attempts failed │ %s", QDRANT_RETRY_ATTEMPTS, last_err)
    return []
