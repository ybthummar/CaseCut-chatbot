"""
/upload router - PDF/TXT file parsing + extraction.

Returns structured metadata and full extracted text for document chat/summarization.
"""

from __future__ import annotations

import logging
import os
import tempfile
from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.responses import ok
from app.utils.parser import parse_document

router = APIRouter()
logger = logging.getLogger("casecut")

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: str = Form("anonymous"),
):
    """Upload a PDF/TXT document and return parsed metadata + full text."""
    logger.info("POST /upload | filename=%s | user=%s", file.filename, user_id)

    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is missing.")

    lower_name = file.filename.lower()
    if not lower_name.endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are accepted.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 20 MB.")

    suffix = ".pdf" if lower_name.endswith(".pdf") else ".txt"
    tmp_path = ""

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode="wb") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        parsed = parse_document(tmp_path)
        if parsed is None:
            raise HTTPException(status_code=422, detail="Could not extract meaningful text from the file.")

        response_data = {
            "id": parsed.get("id", ""),
            "filename": file.filename,
            "court": parsed.get("court", "Unknown"),
            "date": parsed.get("date", ""),
            "ipc_sections": parsed.get("ipc_sections", []),
            "topics": parsed.get("topics", []),
            "outcome": parsed.get("outcome", ""),
            "facts": parsed.get("facts", ""),
            "text_preview": parsed.get("full_text", "")[:500],
            "full_text": parsed.get("full_text", ""),
            "text_length": parsed.get("text_length", 0),
            "page_count": parsed.get("page_count", 0),
            "content_type": file.content_type or "application/octet-stream",
            "user_id": user_id,
            "uploaded_at": datetime.now().isoformat(),
        }

        logger.info(
            "POST /upload done | bytes=%d | pages=%d | text_len=%d",
            len(content),
            response_data["page_count"],
            response_data["text_length"],
        )

        return ok(response_data)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
