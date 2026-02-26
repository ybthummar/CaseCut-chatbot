"""
/chat router — RAG search endpoint.

Uses rag_service for the full pipeline.
Returns structured {success, data, error} envelope.
"""

import asyncio
import logging
import traceback

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services import rag_service
from app.schemas.responses import ok, fail

router = APIRouter()
logger = logging.getLogger("casecut")


class ChatRequest(BaseModel):
    query: str
    role: str = "lawyer"
    topic: str = "all"
    k: int = 5


@router.post("/query")
async def chat(req: ChatRequest):
    """Full RAG pipeline: embed → retrieve → rank → summarise."""
    logger.info(
        "📥 /query  │ role=%s │ topic=%s │ k=%d │ '%s'",
        req.role, req.topic, req.k, req.query[:100],
    )

    try:
        result = await asyncio.to_thread(
            rag_service.run_query,
            query=req.query,
            role=req.role,
            topic=req.topic,
            k=req.k,
        )

        logger.info(
            "📤 /query  │ cases=%d │ source=%s │ summary_len=%d │ %dms",
            len(result.get("cases", [])),
            result.get("source", "unknown"),
            len(result.get("summary", "")),
            result.get("llm_time_ms", 0),
        )

        return ok(result)

    except Exception as e:
        logger.error("❌ /query FAILED │ %s", traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content=fail(str(e), type(e).__name__, "Check backend logs for full traceback."),
        )
