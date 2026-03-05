"""
/upload router — PDF file parsing + extraction.
Returns structured metadata AND full text for PDF chat.
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
    """Upload a PDF / TXT file → parse into structured JSON with full text for chat."""
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

        response_data = {
            "id": parsed.get("id", ""),
            "filename": parsed.get("filename", file.filename),
            "court": parsed.get("court", "Unknown"),
            "date": parsed.get("date", ""),
            "ipc_sections": parsed.get("ipc_sections", []),
            "topics": parsed.get("topics", []),
            "outcome": parsed.get("outcome", ""),
            "facts": parsed.get("facts", ""),
            "text_preview": parsed.get("full_text", "")[:500],
            "full_text": parsed.get("full_text", ""),  # needed for PDF chat
            "text_length": parsed.get("text_length", 0),
            "page_count": parsed.get("page_count", 0),
            "user_id": user_id,
            "uploaded_at": datetime.now().isoformat(),
        }

        logger.info(
            "📤 /upload │ pages=%d │ text_len=%d │ sections=%s",
            response_data["page_count"],
            response_data["text_length"],
            ", ".join(response_data["ipc_sections"][:3]) or "none",
        )
        return ok(response_data)

    finally:
        os.unlink(tmp_path)
