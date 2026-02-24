"""
/upload & /summarize router — PDF / text upload + summarisation.
"""

import os
import tempfile
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.utils.parser import parse_document, extract_text_from_file
from app.core.logic import summarize_document

router = APIRouter()


class SummarizeRequest(BaseModel):
    text: Optional[str] = None
    file_url: Optional[str] = None
    model_id: str = "casecut-legal"


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: str = Form("anonymous"),
):
    """
    Upload a PDF / TXT file → parse into structured JSON.
    Returns parsed metadata + extracted text.
    """
    if not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are accepted.")

    # Write to temp file so parser can open it
    suffix = ".pdf" if file.filename.lower().endswith(".pdf") else ".txt"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        parsed = parse_document(tmp_path)
        if parsed is None:
            raise HTTPException(status_code=422, detail="Could not extract meaningful text from the file.")

        # Strip overwhelming full_text from response
        response_data = {k: v for k, v in parsed.items() if k != "full_text"}
        response_data["text_preview"] = parsed.get("full_text", "")[:500]
        response_data["user_id"] = user_id
        response_data["uploaded_at"] = datetime.now().isoformat()
        return response_data
    finally:
        os.unlink(tmp_path)


@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    """
    Summarise text or a document referenced by URL.
    The frontend handles HuggingFace models directly;
    this endpoint handles the 'casecut-legal' (local) model.
    """
    text = req.text

    # If a Firebase Storage URL was passed and no raw text, attempt download
    if not text and req.file_url:
        import requests as http_requests
        try:
            resp = http_requests.get(req.file_url, timeout=30)
            resp.raise_for_status()

            # Write to temp file for extraction
            suffix = ".pdf" if "pdf" in req.file_url.lower() else ".txt"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(resp.content)
                tmp_path = tmp.name
            text = extract_text_from_file(tmp_path)
            os.unlink(tmp_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not fetch file: {e}")

    if not text or len(text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Not enough text to summarise.")

    summary = summarize_document(text, model_id=req.model_id)
    return {"summary": summary, "model_id": req.model_id}
