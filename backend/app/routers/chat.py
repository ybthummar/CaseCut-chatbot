"""
/chat router — RAG search endpoint + PDF chat.

Uses rag_service for the full pipeline.
Returns structured {success, data, error} envelope.
"""

import asyncio
import logging
import traceback

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from app.services import rag_service
from app.schemas.responses import ok, fail

router = APIRouter()
logger = logging.getLogger("casecut")


class MessageTurn(BaseModel):
    role: str  # 'user' or 'assistant'
    text: str


class ChatRequest(BaseModel):
    query: str
    role: str = "lawyer"
    topic: str = "all"
    k: int = 5
    conversation_history: Optional[list[MessageTurn]] = None


class PDFChatRequest(BaseModel):
    query: str
    document_text: str
    role: str = "lawyer"
    conversation_history: Optional[list[MessageTurn]] = None


@router.post("/query")
async def chat(req: ChatRequest):
    """Full RAG pipeline: embed → retrieve → rank → summarise."""
    logger.info(
        "📥 /query  │ role=%s │ topic=%s │ k=%d │ history=%d │ '%s'",
        req.role, req.topic, req.k,
        len(req.conversation_history or []),
        req.query[:100],
    )

    try:
        # Convert conversation history to plain dicts
        history = None
        if req.conversation_history:
            history = [{"role": t.role, "text": t.text} for t in req.conversation_history]

        result = await asyncio.to_thread(
            rag_service.run_query,
            query=req.query,
            role=req.role,
            topic=req.topic,
            k=req.k,
            conversation_history=history,
        )

        logger.info(
            "📤 /query  │ cases=%d │ source=%s │ confidence=%s │ %dms",
            len(result.get("cases", [])),
            result.get("source", "unknown"),
            result.get("confidence", {}).get("level", "?"),
            result.get("llm_time_ms", 0),
        )

        return ok(result)

    except Exception as e:
        logger.error("❌ /query FAILED │ %s", traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content=fail(str(e), type(e).__name__, "Check backend logs for full traceback."),
        )


@router.post("/pdf-chat")
async def pdf_chat(req: PDFChatRequest):
    """Chat with an uploaded PDF document using RAG over its content."""
    logger.info(
        "📥 /pdf-chat │ role=%s │ doc_len=%d │ '%s'",
        req.role, len(req.document_text), req.query[:100],
    )

    if not req.document_text or len(req.document_text.strip()) < 50:
        return JSONResponse(
            status_code=400,
            content=fail("Document text too short. Upload a valid PDF.", "ValidationError"),
        )

    try:
        history = None
        if req.conversation_history:
            history = [{"role": t.role, "text": t.text} for t in req.conversation_history]

        result = await asyncio.to_thread(
            rag_service.chat_with_pdf,
            query=req.query,
            document_text=req.document_text,
            role=req.role,
            conversation_history=history,
        )

        logger.info(
            "📤 /pdf-chat │ source=%s │ citations=%d │ confidence=%s │ %dms",
            result.get("source", "unknown"),
            len(result.get("citations", [])),
            result.get("confidence", {}).get("level", "?"),
            result.get("llm_time_ms", 0),
        )

        return ok(result)

    except Exception as e:
        logger.error("❌ /pdf-chat FAILED │ %s", traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content=fail(str(e), type(e).__name__, "Check backend logs for full traceback."),
        )
