"""
Summarizer service.

Handles document summarization across:
- local model wrappers from app/models/summarizer.py
- Groq/Gemini LLM pipeline
- HuggingFace Inference API models
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path

import requests as http_requests

from app.core.config import PDF_SMART_THRESHOLD, HF_API_TOKEN
from app.models import summarizer as local_summarizer
from app.services import llm_service

logger = logging.getLogger("casecut")

HF_MODELS = {
    "hf-bart-large-cnn": "facebook/bart-large-cnn",
    "hf-legal-led": "nsi319/legal-led-base-16384",
    "hf-falconsai": "Falconsai/text_summarization",
}

BACKEND_ROOT = Path(__file__).resolve().parents[2]

LOCAL_SUMMARIZER_MODELS = {
    "casecut-legal": BACKEND_ROOT / "Model" / "fine_tuned_t5_summarizer",
    "local-finetuned-t5": BACKEND_ROOT / "Model" / "fine_tuned_t5_summarizer",
    "fine_tuned_t5_summarizer": BACKEND_ROOT / "Model" / "fine_tuned_t5_summarizer",
    "local-legal-bart": BACKEND_ROOT / "Model" / "legal-summarizer-bart",
    "legal-summarizer-bart": BACKEND_ROOT / "Model" / "legal-summarizer-bart",
    "local-pegasus": BACKEND_ROOT / "Model" / "Pegasus",
    "Pegasus": BACKEND_ROOT / "Model" / "Pegasus",
    "local-led": BACKEND_ROOT / "Model" / "LED",
    "LED": BACKEND_ROOT / "Model" / "LED",
}

SUMMARY_SIZE_CONFIG = {
    "short": {
        "hf_min_length": 60,
        "hf_max_length": 220,
        "context_chars": 5000,
        "key_points_chars": 6000,
        "target_words": "120-220 words",
        "format_instruction": "Use 4-6 concise bullets.",
    },
    "medium": {
        "hf_min_length": 100,
        "hf_max_length": 320,
        "context_chars": 8000,
        "key_points_chars": 10000,
        "target_words": "300-500 words",
        "format_instruction": "Use short headings and compact bullets.",
    },
    "large": {
        "hf_min_length": 160,
        "hf_max_length": 480,
        "context_chars": 12000,
        "key_points_chars": 15000,
        "target_words": "700-1100 words (when source length supports it)",
        "format_instruction": (
            "Use headings: Case Overview, Material Facts, Legal Issues, "
            "Court Reasoning, Cited Provisions, Outcome, Practical Takeaways."
        ),
    },
}


def _normalize_summary_size(summary_size: str) -> str:
    normalized = (summary_size or "").strip().lower()
    return normalized if normalized in SUMMARY_SIZE_CONFIG else "large"


def _llm_keys_configured() -> bool:
    return bool(
        os.getenv("OPENAI_API_KEY")
        or os.getenv("GROQ_API_KEY")
        or os.getenv("GEMINI_API_KEY")
    )


def _resolve_local_model_ref(model_id: str) -> str:
    """
    Resolve local model path for model_id.
    Returns empty string when no configured local path exists.
    """
    candidate = LOCAL_SUMMARIZER_MODELS.get(model_id)
    if not candidate:
        return ""

    if candidate.exists():
        return str(candidate)

    logger.warning("Configured local summarizer model does not exist: %s", candidate)
    return ""


def summarize(
    text: str,
    model_id: str = "casecut-legal",
    mode: str = "lawyer",
    intent: str = "summarize",
    summary_size: str = "large",
) -> dict:
    """
    Summarize text using the requested model/provider.

    Returns:
        {
            "summary": str,
            "model_id": str,
            "mode": str,
            "intent": str,
            "summary_size": str,
            "provider": str,
        }
    """
    summary_size = _normalize_summary_size(summary_size)

    logger.info(
        "Summarize | model=%s | mode=%s | intent=%s | size=%s | text_len=%d",
        model_id,
        mode,
        intent,
        summary_size,
        len(text),
    )

    local_model_ref = _resolve_local_model_ref(model_id)

    if model_id in HF_MODELS:
        summary = _summarize_huggingface(text, model_id, summary_size)
        provider = "huggingface"
    else:
        summary, provider = _summarize_casecut(
            text=text,
            mode=mode,
            intent=intent,
            summary_size=summary_size,
            model_ref=local_model_ref,
            model_id=model_id,
        )

    return {
        "summary": summary,
        "model_id": model_id,
        "mode": mode,
        "intent": intent,
        "summary_size": summary_size,
        "provider": provider,
        "resolved_model": Path(local_model_ref).name if local_model_ref else "default",
    }


def _extract_key_points(text: str, summary_size: str) -> str:
    """Extract key points for long documents before final summarization."""
    cfg = SUMMARY_SIZE_CONFIG[summary_size]

    prompt = (
        "You are a legal document analyst. Extract key points from the text below. "
        "Capture only source-backed facts and legal reasoning.\n\n"
        "Return sections for: Material Facts, Legal Issues, Court Reasoning, "
        "Statutory Provisions, and Outcome.\n\n"
        f"TEXT:\n{text[:cfg['key_points_chars']]}\n\n"
        "KEY POINTS:"
    )

    result, source, _ = llm_service.generate(prompt)
    if source == "error" or not result or result.strip().lower().startswith("error:"):
        logger.warning("Key point extraction failed; using truncated source text.")
        return text[: cfg["context_chars"]]
    return result


def _summarize_casecut(
    text: str,
    mode: str,
    intent: str,
    summary_size: str,
    model_ref: str = "",
    model_id: str = "casecut-legal",
) -> tuple[str, str]:
    """
    CaseCut default summarization pipeline.

    1) If intent is summarize, try local summarizer model first.
    2) Optionally refine local output using API-key LLMs for better clarity.
    3) Fallback to full LLM summarization pipeline.
    """
    if intent == "summarize":
        local_summary = local_summarizer.summarize_text(
            text,
            summary_size=summary_size,
            model_ref=model_ref or None,
        )
        if local_summary:
            refined = _refine_local_summary(local_summary, text, mode, summary_size)
            if refined:
                return refined, f"local+llm:{model_id}"
            return local_summary, f"local-model:{model_id}"

    return _summarize_with_llm(text, mode, intent, summary_size), f"llm:{model_id}"


def _refine_local_summary(draft_summary: str, source_text: str, mode: str, summary_size: str) -> str:
    """Improve local-model draft summary using Groq/Gemini when API keys exist."""
    if not _llm_keys_configured():
        return ""

    cfg = SUMMARY_SIZE_CONFIG[summary_size]

    mode_instructions = {
        "judge": "Keep judicial neutrality and emphasize ratio decidendi.",
        "lawyer": "Highlight strategic legal implications and actionable points.",
        "student": "Explain legal concepts plainly while preserving legal precision.",
        "summary": "Keep executive clarity and remove redundant detail.",
        "firm": "Focus on business risk, litigation impact, and recommendations.",
    }

    prompt = (
        "You are a senior legal editor. Improve the draft summary below.\n"
        "Requirements:\n"
        "- Keep all facts source-grounded (no hallucinations).\n"
        f"- Target depth: {cfg['target_words']}.\n"
        f"- Format: {cfg['format_instruction']}\n"
        f"- Audience style: {mode_instructions.get(mode, mode_instructions['lawyer'])}\n\n"
        f"SOURCE TEXT (truncated):\n{source_text[:cfg['context_chars']]}\n\n"
        f"DRAFT SUMMARY:\n{draft_summary}\n\n"
        "IMPROVED SUMMARY:"
    )

    result, source, _ = llm_service.generate(prompt)
    if source == "error" or not result or result.strip().lower().startswith("error:"):
        return ""
    return result.strip()


def _summarize_with_llm(text: str, mode: str, intent: str, summary_size: str) -> str:
    """Summarize with Groq/Gemini pipeline with long-document handling."""
    cfg = SUMMARY_SIZE_CONFIG[summary_size]

    if len(text) > PDF_SMART_THRESHOLD:
        logger.info("Long document detected; extracting key points before summarization.")
        source_text = _extract_key_points(text, summary_size)
    else:
        source_text = text

    mode_instructions = {
        "judge": (
            "Summarize from a judicial perspective with focus on legal reasoning, "
            "ratio decidendi, and precedent consistency."
        ),
        "lawyer": (
            "Summarize for a practicing lawyer and emphasize material facts, "
            "holding, litigation strategy, and legal exposure."
        ),
        "student": (
            "Summarize for a law student. Define terms briefly and explain why the "
            "decision matters."
        ),
        "summary": "Provide an executive legal summary optimized for quick review.",
        "firm": (
            "Summarize for a law-firm strategy team with risk implications, "
            "recommended next steps, and practical impact."
        ),
    }

    intent_instructions = {
        "summarize": "Task: Produce a structured summary of the document.",
        "case_prediction": (
            "Task: Predict likely outcome grounded only in provided text and explain "
            "confidence (high/medium/low) with decisive factors."
        ),
        "ipc_detection": (
            "Task: Extract IPC/BNS sections explicitly present or strongly implied. "
            "For each section, include one-line justification from facts."
        ),
    }

    depth_instructions = {
        "short": "Keep output concise and highly scannable.",
        "medium": "Provide balanced detail with short sections.",
        "large": (
            "Provide deep and comprehensive coverage with clear headings and bullets "
            "where useful."
        ),
    }

    summary_specific_instruction = ""
    if intent == "summarize":
        summary_specific_instruction = (
            f"Target depth: {cfg['target_words']}. "
            f"Format requirement: {cfg['format_instruction']}"
        )

    prompt = (
        f"{mode_instructions.get(mode, mode_instructions['lawyer'])}\n"
        f"{intent_instructions.get(intent, intent_instructions['summarize'])}\n"
        f"{depth_instructions[summary_size]}\n"
        f"{summary_specific_instruction}\n"
        "Use only information present in the source text. If data is missing, say 'Not specified'.\n\n"
        f"TEXT:\n{source_text[:cfg['context_chars']]}\n\n"
        "RESPONSE:"
    )

    result, source, _ = llm_service.generate(prompt)
    if source == "error" or not result:
        raise RuntimeError("Summarization failed because no LLM provider was available.")
    return result.strip()


def _extract_hf_summary(data: object) -> str:
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and item.get("summary_text"):
                return str(item["summary_text"]).strip()
            if isinstance(item, dict) and item.get("generated_text"):
                return str(item["generated_text"]).strip()
    if isinstance(data, dict):
        if data.get("summary_text"):
            return str(data["summary_text"]).strip()
        if data.get("generated_text"):
            return str(data["generated_text"]).strip()
    return ""


def _summarize_huggingface(text: str, model_id: str, summary_size: str) -> str:
    """Call HuggingFace Inference API from backend."""
    hf_model = HF_MODELS.get(model_id)
    if not hf_model:
        raise ValueError(f"Unknown HuggingFace model: {model_id}")

    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN is not configured in backend environment.")

    cfg = SUMMARY_SIZE_CONFIG[summary_size]
    logger.info("HF summarize | model=%s | size=%s | text_len=%d", hf_model, summary_size, len(text))

    payload = {
        "inputs": text[: cfg["context_chars"]],
        "parameters": {
            "max_length": cfg["hf_max_length"],
            "min_length": cfg["hf_min_length"],
            "do_sample": False,
        },
        "options": {"wait_for_model": True},
    }

    for attempt in range(1, 4):
        res = http_requests.post(
            f"https://api-inference.huggingface.co/models/{hf_model}",
            headers={
                "Authorization": f"Bearer {HF_API_TOKEN}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=90,
        )

        data = None
        if "application/json" in (res.headers.get("content-type") or ""):
            try:
                data = res.json()
            except Exception:
                data = None

        if res.ok:
            summary = _extract_hf_summary(data)
            if summary:
                logger.info("HF summarize done | summary_len=%d", len(summary))
                return summary
            raise RuntimeError("HuggingFace response did not contain a summary.")

        error_message = ""
        if isinstance(data, dict):
            error_message = str(data.get("error") or "")

        if res.status_code in (429, 503) and attempt < 3:
            wait_seconds = 2.0
            if isinstance(data, dict) and data.get("estimated_time"):
                try:
                    wait_seconds = float(data["estimated_time"])
                except Exception:
                    wait_seconds = 2.0
            wait_seconds = max(1.0, min(wait_seconds, 10.0))
            logger.warning(
                "HF temporary failure (status=%d). Retrying in %.1fs [attempt %d/3].",
                res.status_code,
                wait_seconds,
                attempt,
            )
            time.sleep(wait_seconds)
            continue

        raise RuntimeError(error_message or f"HuggingFace API returned {res.status_code}")

    raise RuntimeError("HuggingFace summarization failed after retries.")
