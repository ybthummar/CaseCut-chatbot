"""
Book search service with resilient provider behavior.

Google Books is the primary source. If it is rate-limited (429) or unavailable,
we fallback to Open Library so the frontend still gets visible book cards.
"""

import logging
import os
import re
import threading
import time
from typing import Any

import requests as http_requests

logger = logging.getLogger("casecut")

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"
OPEN_LIBRARY_SEARCH_API = "https://openlibrary.org/search.json"
OPEN_LIBRARY_BASE_URL = "https://openlibrary.org"
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY", "").strip()
GOOGLE_BOOKS_COUNTRY = os.getenv("GOOGLE_BOOKS_COUNTRY", "IN").strip().upper() or "IN"
GOOGLE_BOOKS_FILTER = os.getenv("GOOGLE_BOOKS_FILTER", "partial").strip() or "partial"
GOOGLE_BOOKS_ORDER_BY = os.getenv("GOOGLE_BOOKS_ORDER_BY", "relevance").strip() or "relevance"

MAX_RESULTS_LIMIT = 40
GOOGLE_RETRY_ATTEMPTS = 3
BOOK_CACHE_TTL_SECONDS = 15 * 60
GOOGLE_RATE_LIMIT_COOLDOWN_SECONDS = 10 * 60
_BOOK_CACHE: dict[tuple[str, int], tuple[float, list[dict[str, Any]]]] = {}
_GOOGLE_RATE_LIMIT_UNTIL = 0.0
_GOOGLE_LOCK = threading.Lock()

# IPC section -> relevant book search terms
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

# Topic -> Google Books search query
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

TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "bail": ("bail", "anticipatory", "interim bail"),
    "murder": ("murder", "homicide", "culpable homicide"),
    "theft": ("theft", "robbery", "dacoity", "stolen"),
    "fraud": ("fraud", "cheating", "forgery", "scam", "420"),
    "cyber": ("cyber", "it act", "digital", "online crime", "phishing"),
    "contract": ("contract", "agreement", "breach", "specific performance"),
    "property": ("property", "land", "title", "partition", "tenancy"),
    "constitutional": ("constitution", "fundamental right", "article"),
    "family": ("family", "marriage", "divorce", "custody", "maintenance"),
    "defamation": ("defamation", "libel", "slander"),
}


def search_books(query: str, max_results: int = 6) -> list[dict[str, Any]]:
    """Search books with Google first, then fallback provider if needed."""
    normalized_query = _normalize_query(query)
    if not normalized_query:
        return []

    result_limit = max(1, min(max_results, MAX_RESULTS_LIMIT))
    cache_key = (normalized_query.lower(), result_limit)
    cached = _get_cached_books(cache_key)
    if cached is not None:
        return cached

    query_variants = _build_query_variants(normalized_query)

    # Keep Google request volume low (single attempt per user query) to avoid
    # bursty 429 errors, then use fallback variants to fill any remaining slots.
    final_books: list[dict[str, Any]] = []
    google_books = _search_google_books(query_variants[0], result_limit)
    final_books = _merge_unique_books(final_books, google_books, result_limit)

    for variant in query_variants:
        if len(final_books) >= result_limit:
            break
        fallback_books = _search_open_library_books(variant, result_limit)
        final_books = _merge_unique_books(final_books, fallback_books, result_limit)

    _set_cached_books(cache_key, final_books)
    return final_books


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
    Smart recommendation flow that combines:
    - Query-based search
    - IPC-based recommendations
    - Topic-based recommendations
    """
    results: dict[str, Any] = {"query_books": [], "ipc_books": [], "topic_books": []}

    normalized_query = _normalize_query(query)
    if not normalized_query:
        return results

    inferred_ipc = _extract_ipc_sections(normalized_query)
    combined_ipc = list(dict.fromkeys((detected_ipc or []) + inferred_ipc))

    # 1) Direct query search
    base_query = f"Indian law {normalized_query}"
    primary = search_books(base_query, max_results)
    if len(primary) < max_results:
        # Backup query without forced prefix if recall is low.
        primary = _merge_unique_books(primary, search_books(normalized_query, max_results), max_results)
    results["query_books"] = primary[:max_results]

    # 2) IPC-based books (limited request budget to avoid rate-limit bursts)
    if combined_ipc:
        ipc_books: list[dict[str, Any]] = []
        seen_ids = {b["id"] for b in results["query_books"]}
        for section in combined_ipc[:2]:
            for book in get_books_for_ipc(section, 2):
                if book["id"] not in seen_ids:
                    ipc_books.append(book)
                    seen_ids.add(book["id"])
                if len(ipc_books) >= 4:
                    break
            if len(ipc_books) >= 4:
                break
        results["ipc_books"] = ipc_books

    # 3) Topic-based books
    if topic and topic != "all":
        topic_books: list[dict[str, Any]] = []
        seen_ids = {b["id"] for b in results["query_books"]}
        seen_ids.update(b["id"] for b in results.get("ipc_books", []))
        for book in get_books_for_topic(topic, 4):
            if book["id"] not in seen_ids:
                topic_books.append(book)
                seen_ids.add(book["id"])
            if len(topic_books) >= 4:
                break
        results["topic_books"] = topic_books

    return results


def _search_google_books(query: str, max_results: int) -> list[dict[str, Any]]:
    """Search Google Books with retry/backoff for transient rate limits."""
    global _GOOGLE_RATE_LIMIT_UNTIL

    # If anonymous Google access was recently rate-limited, fail fast to fallback.
    with _GOOGLE_LOCK:
        rate_limited = not GOOGLE_BOOKS_API_KEY and time.time() < _GOOGLE_RATE_LIMIT_UNTIL
    if rate_limited:
        return []

    google_query = _build_google_query(query)
    params: dict[str, Any] = {
        "q": google_query,
        "maxResults": min(max_results, MAX_RESULTS_LIMIT),
        "printType": "books",
        "langRestrict": "en",
        "orderBy": GOOGLE_BOOKS_ORDER_BY,
        "country": GOOGLE_BOOKS_COUNTRY,
    }
    if GOOGLE_BOOKS_FILTER in {"partial", "full", "free-ebooks", "paid-ebooks", "ebooks"}:
        params["filter"] = GOOGLE_BOOKS_FILTER
    if GOOGLE_BOOKS_API_KEY:
        params["key"] = GOOGLE_BOOKS_API_KEY

    headers = {"User-Agent": "CaseCut/1.0 (+local)"}
    delay_seconds = 0.8
    attempt_limit = GOOGLE_RETRY_ATTEMPTS if GOOGLE_BOOKS_API_KEY else 1

    for attempt in range(1, attempt_limit + 1):
        try:
            resp = http_requests.get(GOOGLE_BOOKS_API, params=params, headers=headers, timeout=15)
            if resp.status_code == 403:
                body_lower = (resp.text or "").lower()
                if "books api has not been used" in body_lower or "api has not been used" in body_lower:
                    logger.warning(
                        "Google Books API disabled for this key/project. "
                        "Enable books.googleapis.com in Google Cloud Console."
                    )
                elif "daily limit exceeded" in body_lower or "quota" in body_lower:
                    logger.warning("Google Books quota exceeded | query=%s", google_query)
                return []

            if resp.status_code == 429:
                with _GOOGLE_LOCK:
                    _GOOGLE_RATE_LIMIT_UNTIL = time.time() + GOOGLE_RATE_LIMIT_COOLDOWN_SECONDS
                if attempt < attempt_limit:
                    time.sleep(delay_seconds)
                    delay_seconds *= 2
                    continue
                logger.warning("Google Books rate-limited after %d attempts | query=%s", attempt, google_query)
                if not GOOGLE_BOOKS_API_KEY:
                    logger.warning("Set GOOGLE_BOOKS_API_KEY in backend/.env for higher Google Books quota.")
                break

            resp.raise_for_status()
            data = resp.json()
            items = data.get("items", []) or []
            books = [_normalize_google_book_item(item) for item in items]
            return [book for book in books if book]
        except Exception as exc:
            if attempt < GOOGLE_RETRY_ATTEMPTS:
                time.sleep(delay_seconds)
                delay_seconds *= 2
                continue
            logger.warning("Google Books API failed | query=%s | %s", google_query, exc)

    return []


def _search_open_library_books(query: str, max_results: int) -> list[dict[str, Any]]:
    """Fallback provider used when Google Books is unavailable."""
    try:
        params = {
            "q": query,
            "limit": min(max_results * 2, 20),
            # Open Library reduced default fields in 2025; request explicit fields.
            "fields": "key,title,author_name,first_publish_year,cover_i,subject",
        }
        resp = http_requests.get(OPEN_LIBRARY_SEARCH_API, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        docs = data.get("docs", []) or []

        scored_books: list[tuple[int, dict[str, Any]]] = []
        for doc in docs:
            book = _normalize_open_library_doc(doc)
            if not book:
                continue
            score = _score_open_library_doc(doc, query)
            scored_books.append((score, book))

        # Prefer legal/reference matches first to avoid off-topic fiction results.
        scored_books.sort(key=lambda x: x[0], reverse=True)

        books: list[dict[str, Any]] = []
        for score, book in scored_books:
            if score <= 0:
                continue
            books.append(book)
            if len(books) >= max_results:
                break

        # If strict filtering removes everything, still return top docs so the UI
        # has visible results during provider degradation.
        if not books:
            for _, book in scored_books[:max_results]:
                books.append(book)

        logger.info("Book fallback used (Open Library) | query=%s | count=%d", query, len(books))
        return books
    except Exception as exc:
        logger.warning("Open Library fallback failed | query=%s | %s", query, exc)
        return []


def _normalize_google_book_item(item: dict[str, Any]) -> dict[str, Any] | None:
    info = item.get("volumeInfo", {}) or {}
    image_links = info.get("imageLinks", {}) or {}
    book_id = item.get("id") or info.get("canonicalVolumeLink") or info.get("title")
    if not book_id:
        return None

    preview_link = info.get("previewLink") or info.get("infoLink") or ""
    return {
        "id": str(book_id),
        "title": info.get("title", "Unknown Title"),
        "authors": info.get("authors") or ["Unknown Author"],
        "description": _truncate(_strip_html(info.get("description", "")), 200),
        "thumbnail": _normalize_thumbnail(image_links.get("thumbnail", image_links.get("smallThumbnail", ""))),
        "previewLink": preview_link,
        "publishedDate": str(info.get("publishedDate", "")),
        "pageCount": _safe_int(info.get("pageCount")),
        "categories": info.get("categories") or [],
        "averageRating": _safe_float(info.get("averageRating")),
        "ratingsCount": _safe_int(info.get("ratingsCount")),
    }


def _normalize_open_library_doc(doc: dict[str, Any]) -> dict[str, Any] | None:
    title = doc.get("title")
    key = doc.get("key")
    if not title or not key:
        return None

    cover_id = doc.get("cover_i")
    thumbnail = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else ""

    subjects = doc.get("subject") or []
    if not isinstance(subjects, list):
        subjects = []

    return {
        "id": str(key),
        "title": str(title),
        "authors": doc.get("author_name") or ["Unknown Author"],
        "description": "",
        "thumbnail": thumbnail,
        "previewLink": f"{OPEN_LIBRARY_BASE_URL}{key}",
        "publishedDate": str(doc.get("first_publish_year", "")),
        "pageCount": 0,
        "categories": [str(subject) for subject in subjects[:3]],
        "averageRating": 0.0,
        "ratingsCount": 0,
    }


def _extract_ipc_sections(text: str) -> list[str]:
    matches = re.findall(r"(?:section|ipc|s\.)\s*(\d+[A-Za-z]?)", text, flags=re.IGNORECASE)
    return [match.upper() for match in matches]


def _normalize_query(query: str) -> str:
    return re.sub(r"\s+", " ", (query or "").strip())


def _build_query_variants(query: str) -> list[str]:
    variants = [query]

    no_prefix = re.sub(r"^\s*indian law\s+", "", query, flags=re.IGNORECASE).strip()
    if no_prefix and no_prefix.lower() != query.lower():
        variants.append(no_prefix)

    cleaned = re.sub(r"\b(?:ipc|section|sec|s\.)\b", " ", no_prefix or query, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b\d+[A-Za-z]?\b", " ", cleaned)
    cleaned = _normalize_query(cleaned)
    if cleaned:
        if "law" not in cleaned.lower():
            variants.append(f"Indian {cleaned} law")
        variants.append(cleaned)

    topic_query = _guess_topic_query(query)
    if topic_query:
        variants.append(topic_query)

    variants.append("Indian criminal law")
    variants.append("Indian Penal Code")

    # Deduplicate while preserving order.
    deduped: list[str] = []
    seen: set[str] = set()
    for variant in variants:
        norm = _normalize_query(variant)
        if len(norm) < 2:
            continue
        key = norm.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(norm)
    return deduped


def _build_google_query(query: str) -> str:
    """
    Build a Google Books query with supported operators from the official docs:
    intitle:, subject:, inauthor:, isbn:, etc.
    """
    normalized = _normalize_query(query)
    if not normalized:
        return query

    extracted_isbn = _extract_isbn(normalized)
    if extracted_isbn:
        return f"isbn:{extracted_isbn}"

    ipc_sections = _extract_ipc_sections(normalized)
    topic_query = _guess_topic_query(normalized)

    # High-signal legal query for IPC searches.
    if ipc_sections:
        sec = ipc_sections[0]
        return f'intitle:"Indian Penal Code" subject:law {sec}'

    # Topic-guided query for better legal relevance.
    if topic_query:
        topic_tokens = _normalize_query(topic_query.replace("Indian", "").replace("law", ""))
        return f'subject:law intitle:{topic_tokens} {normalized}'

    # Default legal query bias.
    return f"subject:law {normalized}"


def _guess_topic_query(query: str) -> str | None:
    query_lower = query.lower()
    for topic, words in TOPIC_KEYWORDS.items():
        for word in words:
            if word in query_lower:
                return TOPIC_BOOK_QUERIES.get(topic)
    return None


def _extract_isbn(query: str) -> str | None:
    """
    Return normalized ISBN-10/13 if present in query, else None.
    """
    compact = re.sub(r"[^0-9Xx]", "", query)
    if len(compact) == 10:
        return compact.upper()
    if len(compact) == 13:
        return compact
    return None


def _score_open_library_doc(doc: dict[str, Any], query: str) -> int:
    title = str(doc.get("title", "")).lower()
    subjects_raw = doc.get("subject") or []
    if not isinstance(subjects_raw, list):
        subjects_raw = []
    subjects = " ".join(str(s).lower() for s in subjects_raw)
    corpus = f"{title} {subjects}"

    legal_terms = {
        "law",
        "legal",
        "act",
        "code",
        "penal",
        "criminal",
        "crime",
        "contract",
        "constitutional",
        "constitution",
        "evidence",
        "procedure",
        "procedural",
        "jurisprudence",
        "court",
        "justice",
        "ipc",
        "india",
        "indian",
    }

    score = 0
    for term in legal_terms:
        if term in corpus:
            score += 1

    # Reward overlap with user query words.
    for token in re.findall(r"[A-Za-z]{3,}", query.lower()):
        if token in corpus:
            score += 1

    return score


def _get_cached_books(cache_key: tuple[str, int]) -> list[dict[str, Any]] | None:
    cached = _BOOK_CACHE.get(cache_key)
    if not cached:
        return None
    created_at, books = cached
    if (time.time() - created_at) > BOOK_CACHE_TTL_SECONDS:
        _BOOK_CACHE.pop(cache_key, None)
        return None
    return books


def _set_cached_books(cache_key: tuple[str, int], books: list[dict[str, Any]]) -> None:
    _BOOK_CACHE[cache_key] = (time.time(), books)


def _merge_unique_books(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
    max_results: int,
) -> list[dict[str, Any]]:
    merged = list(existing)
    seen_ids = {str(book.get("id", "")) for book in existing}

    for book in incoming:
        book_id = str(book.get("id", ""))
        if book_id and book_id in seen_ids:
            continue
        merged.append(book)
        if book_id:
            seen_ids.add(book_id)
        if len(merged) >= max_results:
            break

    return merged[:max_results]


def _normalize_thumbnail(url: str) -> str:
    if not url:
        return ""
    return url.replace("http://", "https://")


def _safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except Exception:
        return 0


def _safe_float(value: Any) -> float:
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _strip_html(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"<[^>]+>", "", text)


def _truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rsplit(" ", 1)[0] + "..."
