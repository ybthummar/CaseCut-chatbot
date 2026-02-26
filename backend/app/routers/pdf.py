"""
/upload router — PDF file parsing + extraction.
"""

import os
import logging
import tempfile
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.utils.parser import parse_document
from app.schemas.responses import ok

router = APIRouter()
logger = logging.getLogger("casecut")


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: str = Form("anonymous"),
):
    """Upload a PDF / TXT file → parse into structured JSON."""
    logger.info("📥 /upload │ file=%s │ user=%s", file.filename, user_id)

    if not file.filename or not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are accepted.")

    suffix = ".pdf" if file.filename.lower().endswith(".pdf") else ".txt"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode="wb") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        parsed = parse_document(tmp_path)
        if parsed is None:
            raise HTTPException(status_code=422, detail="Could not extract meaningful text from the file.")

        response_data = {k: v for k, v in parsed.items() if k != "full_text"}
        response_data["text_preview"] = parsed.get("full_text", "")[:500]
        response_data["user_id"] = user_id
        response_data["uploaded_at"] = datetime.now().isoformat()

        logger.info("📤 /upload │ keys=%d │ preview=%d chars", len(response_data), len(response_data["text_preview"]))
        return ok(response_data)

    finally:
        os.unlink(tmp_path)
