"""
Summarizer service — handles ALL summarization providers server-side.

Providers:
  • local (casecut-legal) → Groq / Gemini via llm_service
  • huggingface → HuggingFace Inference API (called from backend, NOT browser)

This eliminates the need for frontend to call HuggingFace directly.
"""

import logging
import requests as http_requests

from app.services import llm_service
from app.core.config import (
    PDF_SMART_THRESHOLD,
    HF_API_TOKEN,
    logger as _logger,
)

logger = logging.getLogger("casecut")

# HuggingFace model registry (matches frontend models.js)
HF_MODELS = {
    "hf-bart-large-cnn": "facebook/bart-large-cnn",
    "hf-legal-led": "nsi319/legal-led-base-16384",
    "hf-falconsai": "Falconsai/text_summarization",
}


def summarize(
    text: str,
    model_id: str = "casecut-legal",
    mode: str = "lawyer",
) -> dict:
    """
    Summarize text using the requested model.

    Returns:
        {"summary": str, "model_id": str, "mode": str, "provider": str}
    """
    logger.info(
        "Summarize  │ model=%s │ mode=%s │ text_len=%d",
        model_id, mode, len(text),
    )

    if model_id in HF_MODELS:
        summary = _summarize_huggingface(text, model_id)
        return {"summary": summary, "model_id": model_id, "mode": mode, "provider": "huggingface"}

    # Default: use the CaseCut LLM pipeline (Groq → Gemini)
    summary = _summarize_local(text, mode)
    return {"summary": summary, "model_id": model_id, "mode": mode, "provider": "local"}


# ── Local LLM summarization ─────────────────────────────────────────

def _extract_key_points(text: str) -> str:
    """Extract key points from a long document before final summarization."""
    prompt = (
        "You are a legal document analyst. Extract the **key points** from the "
        "following legal text. Focus on:\n"
        "- Core legal issues\n"
        "- Important facts\n"
        "- Court holdings / decisions\n"
        "- Relevant IPC / BNS sections cited\n"
        "- Final outcome\n\n"
        "Return a concise bullet-point summary (max 1500 words).\n\n"
        f"TEXT:\n{text[:8000]}\n\n"
        "KEY POINTS:"
    )
    result, _, _ = llm_service.generate(prompt)
    return result


def _summarize_local(text: str, mode: str) -> str:
    """Summarize using Groq/Gemini with intelligent processing for long docs."""

    # Condense long documents first
    if len(text) > PDF_SMART_THRESHOLD:
        logger.info("Summarize  │ Long document → extracting key points first")
        source_text = _extract_key_points(text)
    else:
        source_text = text

    mode_instructions = {
        "judge": (
            "Summarize this legal document from a **judicial perspective**. "
            "Focus on ratio decidendi, precedent alignment, and legal reasoning."
        ),
        "lawyer": (
            "Summarize this legal document for a **practicing lawyer**. "
            "Highlight applicable legal principles, strategic implications, "
            "and key IPC/BNS sections."
        ),
        "student": (
            "Summarize this legal document for a **law student**. "
            "Explain key concepts simply, define legal terms, and highlight "
            "why this case matters as a precedent."
        ),
        "summary": (
            "Provide a **concise executive summary** of this legal document. "
            "Use bullet points for key facts, legal issues, holdings, and outcome."
        ),
    }

    instruction = mode_instructions.get(mode, mode_instructions["lawyer"])
    prompt = f"{instruction}\n\nTEXT:\n{source_text[:6000]}\n\nSUMMARY:"

    result, _, _ = llm_service.generate(prompt)
    return result


# ── HuggingFace summarization ────────────────────────────────────────

def _summarize_huggingface(text: str, model_id: str) -> str:
    """Call HuggingFace Inference API from backend (not browser)."""
    hf_model = HF_MODELS.get(model_id)
    if not hf_model:
        raise ValueError(f"Unknown HuggingFace model: {model_id}")

    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN not configured in backend .env")

    logger.info("HF request │ model=%s │ text_len=%d", hf_model, len(text))

    res = http_requests.post(
        f"https://api-inference.huggingface.co/models/{hf_model}",
        headers={
            "Authorization": f"Bearer {HF_API_TOKEN}",
            "Content-Type": "application/json",
        },
        json={
            "inputs": text[:4096],
            "parameters": {"max_length": 512, "min_length": 50},
        },
        timeout=60,
    )

    if not res.ok:
        err = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
        raise RuntimeError(err.get("error", f"HuggingFace API returned {res.status_code}"))

    data = res.json()
    summary = data[0]["summary_text"] if isinstance(data, list) else data.get("summary_text", "")
    logger.info("HF done    │ summary_len=%d", len(summary))
    return summary
