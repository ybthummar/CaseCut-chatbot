"""
Book Search Service — Google Books API integration.

Provides context-aware legal book recommendations based on:
- Direct search queries
- Detected IPC sections
- Legal topic classification
"""

import logging
import re
from typing import Any

import requests as http_requests

logger = logging.getLogger("casecut")

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"

# IPC section → relevant book search terms
IPC_BOOK_MAPPING: dict[str, str] = {
    "420": "Indian fraud cheating law",
    "302": "Indian murder homicide criminal law",
    "304": "Indian culpable homicide law",
    "376": "Indian criminal law sexual offences",
    "498": "Indian dowry cruelty women law",
    "506": "Indian criminal intimidation law",
    "307": "Indian attempt murder criminal law",
    "354": "Indian assault criminal force women",
    "406": "Indian criminal breach trust",
    "467": "Indian forgery law",
    "120B": "Indian criminal conspiracy law",
    "34": "Indian common intention criminal law",
    "149": "Indian unlawful assembly law",
    "304A": "Indian negligence death law",
    "379": "Indian theft law",
    "392": "Indian robbery law",
    "395": "Indian dacoity law",
    "409": "Indian criminal breach trust public servant",
    "499": "Indian defamation law",
    "500": "Indian defamation punishment",
}

# Topic → Google Books search query
TOPIC_BOOK_QUERIES: dict[str, str] = {
    "bail": "Indian bail law practice",
    "murder": "Indian criminal law murder IPC",
    "theft": "Indian theft robbery criminal law",
    "fraud": "Indian fraud cheating IPC 420",
    "cyber": "Indian cyber crime IT Act law",
    "contract": "Indian contract law",
    "property": "Indian property law disputes",
    "constitutional": "Indian constitutional law",
    "family": "Indian family law marriage divorce",
    "defamation": "Indian defamation law",
}


def search_books(query: str, max_results: int = 6) -> list[dict[str, Any]]:
    """Search Google Books API and return structured results."""
    try:
        params = {
            "q": query,
            "maxResults": min(max_results, 12),
            "printType": "books",
            "langRestrict": "en",
            "orderBy": "relevance",
        }
        resp = http_requests.get(GOOGLE_BOOKS_API, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        books = []
        for item in data.get("items", []):
            info = item.get("volumeInfo", {})
            image_links = info.get("imageLinks", {})

            books.append({
                "id": item.get("id", ""),
                "title": info.get("title", "Unknown Title"),
                "authors": info.get("authors", ["Unknown Author"]),
                "description": _truncate(info.get("description", ""), 200),
                "thumbnail": image_links.get("thumbnail", image_links.get("smallThumbnail", "")),
                "previewLink": info.get("previewLink", ""),
                "publishedDate": info.get("publishedDate", ""),
                "pageCount": info.get("pageCount", 0),
                "categories": info.get("categories", []),
                "averageRating": info.get("averageRating", 0),
                "ratingsCount": info.get("ratingsCount", 0),
            })

        return books
    except Exception as exc:
        logger.warning("Google Books API failed │ query=%s │ %s", query, exc)
        return []


def get_books_for_ipc(section: str, max_results: int = 4) -> list[dict[str, Any]]:
    """Get book recommendations for a specific IPC section."""
    clean = re.sub(r"[^0-9A-Za-z]", "", section)
    query_hint = IPC_BOOK_MAPPING.get(clean, f"Indian Penal Code Section {section}")
    return search_books(query_hint, max_results)


def get_books_for_topic(topic: str, max_results: int = 4) -> list[dict[str, Any]]:
    """Get book recommendations for a legal topic."""
    query = TOPIC_BOOK_QUERIES.get(topic.lower(), f"Indian {topic} law")
    return search_books(query, max_results)


def get_context_aware_books(
    query: str,
    detected_ipc: list[str] | None = None,
    topic: str = "all",
    max_results: int = 6,
) -> dict[str, Any]:
    """
    Smart book recommendation that combines:
    - Query-based search
    - IPC-based recommendations
    - Topic-based recommendations
    """
    results: dict[str, Any] = {"query_books": [], "ipc_books": [], "topic_books": []}

    # 1. Direct query search
    search_query = f"Indian law {query}"
    results["query_books"] = search_books(search_query, max_results)

    # 2. IPC-based books
    if detected_ipc:
        ipc_books = []
        seen_ids = {b["id"] for b in results["query_books"]}
        for section in detected_ipc[:3]:
            for book in get_books_for_ipc(section, 2):
                if book["id"] not in seen_ids:
                    ipc_books.append(book)
                    seen_ids.add(book["id"])
        results["ipc_books"] = ipc_books[:4]

    # 3. Topic-based books
    if topic and topic != "all":
        topic_books = []
        seen_ids = {b["id"] for b in results["query_books"]}
        seen_ids.update(b["id"] for b in results.get("ipc_books", []))
        for book in get_books_for_topic(topic, 4):
            if book["id"] not in seen_ids:
                topic_books.append(book)
                seen_ids.add(book["id"])
        results["topic_books"] = topic_books[:4]

    return results


def _truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rsplit(" ", 1)[0] + "…"
