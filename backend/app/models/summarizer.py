"""
Local summarizer model wrapper.

This module loads local seq2seq summarizer models from backend/Model.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Iterable

logger = logging.getLogger("casecut")

_model = None
_tokenizer = None
_torch = None
_device = "cpu"
_max_input_tokens = 1024
_loaded_model_ref = ""

SUMMARY_PRESETS = {
    "short": {
        "chunk_chars": 2400,
        "chunk_overlap": 220,
        "max_chunks": 4,
        "chunk_min": 40,
        "chunk_max": 140,
        "final_min": 80,
        "final_max": 180,
    },
    "medium": {
        "chunk_chars": 3000,
        "chunk_overlap": 280,
        "max_chunks": 6,
        "chunk_min": 70,
        "chunk_max": 200,
        "final_min": 140,
        "final_max": 280,
    },
    "large": {
        "chunk_chars": 3800,
        "chunk_overlap": 360,
        "max_chunks": 8,
        "chunk_min": 110,
        "chunk_max": 280,
        "final_min": 220,
        "final_max": 420,
    },
}


def _resolve_model_reference(model_ref: str) -> str:
    """
    Resolve relative/absolute model reference.
    Returns the resolved path (when found) or the original model_ref.
    """
    clean_ref = (model_ref or "").strip()
    if not clean_ref:
        return ""

    ref_path = Path(clean_ref)
    if ref_path.is_absolute() and ref_path.exists():
        return str(ref_path)

    backend_root = Path(__file__).resolve().parents[2]
    relative_candidates = [
        backend_root / clean_ref,
        backend_root / "Model" / clean_ref,
        backend_root / "models" / clean_ref,
    ]

    for candidate in relative_candidates:
        if candidate.exists():
            return str(candidate)

    return clean_ref


def _iter_model_candidates(model_ref: str | None = None) -> Iterable[str]:
    """Yield candidate local/remote model identifiers in priority order."""
    backend_root = Path(__file__).resolve().parents[2]
    seen: set[str] = set()

    def _emit(candidate: str) -> Iterable[str]:
        normalized = (candidate or "").strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            yield normalized

    if model_ref:
        resolved = _resolve_model_reference(model_ref)
        for item in _emit(resolved):
            yield item

    configured_model_path = os.getenv("SUMMARIZER_MODEL_PATH", "").strip()
    configured_model_name = os.getenv("SUMMARIZER_MODEL", "").strip()

    if configured_model_path:
        resolved = _resolve_model_reference(configured_model_path)
        for item in _emit(resolved):
            yield item
    if configured_model_name:
        for item in _emit(configured_model_name):
            yield item

    local_candidates = [
        backend_root / "Model" / "fine_tuned_t5_summarizer",
        backend_root / "Model" / "legal-summarizer-bart",
        backend_root / "Model" / "Pegasus",
        backend_root / "Model" / "LED",
        backend_root / "models" / "fine_tuned_t5_summarizer",
        backend_root / "models" / "legal-summarizer-bart",
    ]

    for candidate in local_candidates:
        if candidate.exists():
            for item in _emit(str(candidate)):
                yield item

    if not model_ref and not configured_model_path and not configured_model_name:
        for item in _emit("google/flan-t5-base"):
            yield item


def _normalize_model_max_length(model_max_length: int) -> int:
    if not model_max_length or model_max_length > 100_000:
        return 1024
    return max(256, min(model_max_length, 4096))


def _load_model(model_ref: str | None = None) -> None:
    """Lazy-load a local seq2seq summarizer model."""
    global _model, _tokenizer, _torch, _device, _max_input_tokens, _loaded_model_ref

    requested_model_ref = _resolve_model_reference(model_ref or "")
    if _model is not None and _tokenizer is not None and (
        not requested_model_ref or requested_model_ref == _loaded_model_ref
    ):
        return

    try:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    except ImportError:
        logger.warning("Local summarizer disabled: install transformers and torch.")
        return

    previous_model = _model
    previous_tokenizer = _tokenizer
    previous_device = _device
    previous_max_input_tokens = _max_input_tokens
    previous_model_ref = _loaded_model_ref

    _torch = torch
    last_error = None

    for candidate in _iter_model_candidates(requested_model_ref or None):
        try:
            logger.info("Loading local summarizer model: %s", candidate)
            tokenizer = AutoTokenizer.from_pretrained(candidate, use_fast=True)
            model = AutoModelForSeq2SeqLM.from_pretrained(candidate)

            _device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(_device)
            model.eval()

            _tokenizer = tokenizer
            _model = model
            _max_input_tokens = _normalize_model_max_length(
                getattr(tokenizer, "model_max_length", 1024)
            )
            _loaded_model_ref = candidate

            logger.info(
                "Local summarizer ready (model=%s, device=%s, max_input_tokens=%d)",
                _loaded_model_ref,
                _device,
                _max_input_tokens,
            )
            return
        except Exception as exc:
            last_error = exc
            logger.warning("Could not load summarizer candidate '%s': %s", candidate, exc)

    # Restore previous working model if new target could not be loaded.
    if previous_model is not None and previous_tokenizer is not None:
        _model = previous_model
        _tokenizer = previous_tokenizer
        _device = previous_device
        _max_input_tokens = previous_max_input_tokens
        _loaded_model_ref = previous_model_ref
        logger.warning(
            "Falling back to previously loaded summarizer model: %s",
            _loaded_model_ref or "unknown",
        )
        return

    _model = None
    _tokenizer = None
    _loaded_model_ref = ""
    logger.warning("No local summarizer model available: %s", last_error or "unknown error")


def _clean_text(text: str) -> str:
    return " ".join((text or "").split())


def _split_text(text: str, chunk_chars: int, overlap_chars: int, max_chunks: int) -> list[str]:
    clean = _clean_text(text)
    if not clean:
        return []
    if len(clean) <= chunk_chars:
        return [clean]

    chunks: list[str] = []
    start = 0
    text_len = len(clean)

    while start < text_len and len(chunks) < max_chunks:
        end = min(text_len, start + chunk_chars)
        chunk = clean[start:end]

        if end < text_len:
            split_at = max(chunk.rfind(". "), chunk.rfind("; "), chunk.rfind(" "))
            if split_at > int(chunk_chars * 0.6):
                end = start + split_at + 1
                chunk = clean[start:end]

        chunks.append(chunk.strip())

        if end >= text_len:
            break
        start = max(0, end - overlap_chars)

    if end < text_len and chunks:
        tail_start = max(0, text_len - chunk_chars)
        tail = clean[tail_start:text_len].strip()
        if tail and tail != chunks[-1]:
            chunks[-1] = f"{chunks[-1]}\n\n{tail}"[: chunk_chars + 1000]

    return chunks


def _generate(prompt: str, min_length: int, max_length: int) -> str:
    if _model is None or _tokenizer is None or _torch is None:
        return ""

    encoded = _tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=_max_input_tokens,
    )

    input_ids = encoded["input_ids"].to(_device)
    attention_mask = encoded.get("attention_mask")
    if attention_mask is not None:
        attention_mask = attention_mask.to(_device)

    with _torch.no_grad():
        output_ids = _model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            min_length=min_length,
            max_length=max_length,
            num_beams=4,
            length_penalty=1.2,
            no_repeat_ngram_size=3,
            repetition_penalty=1.1,
            early_stopping=True,
        )

    return _tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()


def summarize_text(
    text: str,
    summary_size: str = "large",
    model_ref: str | None = None,
) -> str | None:
    """
    Summarize input text using the local model.

    Returns None when no local model is available.
    """
    _load_model(model_ref=model_ref)
    if _model is None or _tokenizer is None:
        return None

    preset = SUMMARY_PRESETS.get((summary_size or "").lower(), SUMMARY_PRESETS["large"])
    chunks = _split_text(
        text,
        chunk_chars=preset["chunk_chars"],
        overlap_chars=preset["chunk_overlap"],
        max_chunks=preset["max_chunks"],
    )

    if not chunks:
        return None

    chunk_summaries: list[str] = []
    for chunk in chunks:
        prompt = (
            "Summarize the following legal text with clear focus on material facts, "
            "legal issues, court reasoning, and final outcome.\n\n"
            f"TEXT:\n{chunk}\n\nSUMMARY:"
        )
        generated = _generate(
            prompt,
            min_length=preset["chunk_min"],
            max_length=preset["chunk_max"],
        )
        if generated:
            chunk_summaries.append(generated)

    if not chunk_summaries:
        return None

    if len(chunk_summaries) == 1:
        return chunk_summaries[0]

    merged = "\n".join(f"- {item}" for item in chunk_summaries)
    final_prompt = (
        "Merge the section summaries into one coherent legal summary with headings: "
        "Case Overview, Material Facts, Legal Issues, Court Reasoning, "
        "Statutory Provisions, and Outcome.\n\n"
        f"SECTION SUMMARIES:\n{merged}\n\nFINAL SUMMARY:"
    )

    final_summary = _generate(
        final_prompt,
        min_length=preset["final_min"],
        max_length=preset["final_max"],
    )

    return final_summary or "\n".join(chunk_summaries)
