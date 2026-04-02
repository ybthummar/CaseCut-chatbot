"""
/summarize router - text/document summarization endpoint.

Frontend calls this endpoint for both typed text and uploaded document text.
"""

from __future__ import annotations

import logging
import os
import tempfile
import traceback
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

from app.schemas.responses import fail, ok
from app.services import summarizer_service
from app.utils.parser import extract_text_from_file

router = APIRouter()
logger = logging.getLogger("casecut")


class SummarizeRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    text: Optional[str] = None
    file_url: Optional[str] = None
    model_id: str = "casecut-legal"
    mode: str = "lawyer"
    intent: str = "summarize"
    summary_size: str = "large"


@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    """Summarize raw text or a remote file URL."""
    logger.info(
        "POST /summarize | model=%s | mode=%s | intent=%s | size=%s | text_len=%d | file_url=%s",
        req.model_id,
        req.mode,
        req.intent,
        req.summary_size,
        len(req.text or ""),
        bool(req.file_url),
    )

    text = req.text

    if not text and req.file_url:
        import requests as http_requests

        tmp_path: Optional[str] = None
        try:
            response = http_requests.get(req.file_url, timeout=45)
            response.raise_for_status()

            url_lower = (req.file_url or "").lower().split("?")[0]
            content_type = (response.headers.get("content-type") or "").lower()
            is_pdf = url_lower.endswith(".pdf") or "pdf" in content_type
            suffix = ".pdf" if is_pdf else ".txt"

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode="wb") as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            extracted_text, _page_count = extract_text_from_file(tmp_path)
            text = extracted_text
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not fetch or parse file: {exc}") from exc
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    if not text or len(text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Not enough text to summarize.")

    try:
        result = summarizer_service.summarize(
            text=text,
            model_id=req.model_id,
            mode=req.mode,
            intent=req.intent,
            summary_size=req.summary_size,
        )
        logger.info(
            "POST /summarize done | provider=%s | summary_len=%d",
            result.get("provider", "unknown"),
            len(result.get("summary", "")),
        )
        return ok(result)
    except Exception as exc:
        logger.error("POST /summarize failed | %s", traceback.format_exc())
        return JSONResponse(status_code=500, content=fail(str(exc), type(exc).__name__))
