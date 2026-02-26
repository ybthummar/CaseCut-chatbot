"""
/summarize router — text / document summarization.

Routes to summarizer_service which handles ALL providers server-side
(local LLM + HuggingFace).  Frontend never calls HuggingFace directly.
"""

import os
import logging
import tempfile
import traceback

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from typing import Optional

from app.services import summarizer_service
from app.schemas.responses import ok, fail
from app.utils.parser import extract_text_from_file

router = APIRouter()
logger = logging.getLogger("casecut")


class SummarizeRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    text: Optional[str] = None
    file_url: Optional[str] = None
    model_id: str = "casecut-legal"
    mode: str = "lawyer"


@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    """Summarize text or a document via URL."""
    logger.info(
        "📥 /summarize │ model=%s │ mode=%s │ text_len=%d │ file_url=%s",
        req.model_id, req.mode, len(req.text or ""), bool(req.file_url),
    )

    text = req.text

    # If a file URL was passed and no raw text, download + extract
    if not text and req.file_url:
        import requests as http_requests
        try:
            resp = http_requests.get(req.file_url, timeout=30)
            resp.raise_for_status()

            suffix = ".pdf" if "pdf" in (req.file_url or "").lower() else ".txt"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode="wb") as tmp:
                tmp.write(resp.content)
                tmp_path = tmp.name
            text = extract_text_from_file(tmp_path)
            os.unlink(tmp_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not fetch file: {e}")

    if not text or len(text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Not enough text to summarise.")

    try:
        result = summarizer_service.summarize(
            text=text,
            model_id=req.model_id,
            mode=req.mode,
        )
        logger.info("📤 /summarize │ provider=%s │ summary_len=%d", result["provider"], len(result["summary"]))
        return ok(result)

    except Exception as e:
        logger.error("❌ /summarize FAILED │ %s", traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content=fail(str(e), type(e).__name__),
        )
