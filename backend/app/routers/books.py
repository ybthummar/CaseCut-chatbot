"""
/learning/books router — Google Books API integration for legal book search.

Endpoints:
  GET  /learning/books?q=...&max=6       — search books
  GET  /learning/books/ipc/{section}      — books for an IPC section
  GET  /learning/books/topic/{topic}      — books for a legal topic
  POST /learning/books/smart              — context-aware recommendations
"""

import logging
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.book_service import (
    search_books,
    get_books_for_ipc,
    get_books_for_topic,
    get_context_aware_books,
)
from app.schemas.responses import ok, fail

router = APIRouter(prefix="/learning/books", tags=["books"])
logger = logging.getLogger("casecut")


@router.get("")
def search_legal_books(
    q: str = Query(..., min_length=2, description="Search query"),
    max: int = Query(6, ge=1, le=12, description="Max results"),
):
    """Search Google Books for legal literature."""
    logger.info("📚 /learning/books │ q=%s │ max=%d", q[:80], max)
    books = search_books(q, max)
    if not books:
        return ok({"books": [], "message": "No books found. Try a different query."})
    return ok({"books": books, "total": len(books)})


@router.get("/ipc/{section}")
def books_for_ipc_section(section: str, max: int = Query(4, ge=1, le=8)):
    """Get book recommendations for a specific IPC section."""
    logger.info("📚 /learning/books/ipc │ section=%s", section)
    books = get_books_for_ipc(section, max)
    return ok({"section": section, "books": books, "total": len(books)})


@router.get("/topic/{topic}")
def books_for_topic(topic: str, max: int = Query(4, ge=1, le=8)):
    """Get book recommendations for a legal topic."""
    logger.info("📚 /learning/books/topic │ topic=%s", topic)
    books = get_books_for_topic(topic, max)
    return ok({"topic": topic, "books": books, "total": len(books)})


class SmartBookRequest(BaseModel):
    query: str
    detected_ipc: Optional[list[str]] = None
    topic: str = "all"
    max_results: int = 6


@router.post("/smart")
def smart_book_recommendations(req: SmartBookRequest):
    """Context-aware book recommendations that integrate with IPC detection and chat."""
    logger.info(
        "📚 /learning/books/smart │ q=%s │ ipc=%s │ topic=%s",
        req.query[:80],
        req.detected_ipc,
        req.topic,
    )
    results = get_context_aware_books(
        query=req.query,
        detected_ipc=req.detected_ipc,
        topic=req.topic,
        max_results=req.max_results,
    )

    all_books = results["query_books"] + results["ipc_books"] + results["topic_books"]
    return ok({
        "books": results,
        "total": len(all_books),
        "has_ipc_books": len(results["ipc_books"]) > 0,
        "has_topic_books": len(results["topic_books"]) > 0,
    })
