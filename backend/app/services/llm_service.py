"""
LLM service — Groq + Gemini + OpenAI wrapper with failover.

Features:
  • 30-second timeout on every call
  • Groq first → Gemini fallback → OpenAI (ChatGPT) last resort
  • Logs prompt length + wall-clock response time
  • Returns (text, source, duration_ms)
"""

import logging
import os
import time

from app.core.config import (
    groq_client,
    gemini_model,
    LLM_TIMEOUT,
    LLM_MAX_TOKENS,
    LLM_TEMPERATURE,
)

try:
    from openai import OpenAI
except Exception:  # pragma: no cover - optional dependency in local setups
    OpenAI = None

logger = logging.getLogger("casecut")

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
openai_client = OpenAI(api_key=OPENAI_API_KEY) if (OpenAI and OPENAI_API_KEY) else None

SCRIPT_RANGES = {
    "english": [(0x0041, 0x005A), (0x0061, 0x007A)],
    "hindi": [(0x0900, 0x097F)],
    "marathi": [(0x0900, 0x097F)],
    "bengali": [(0x0980, 0x09FF)],
    "tamil": [(0x0B80, 0x0BFF)],
    "telugu": [(0x0C00, 0x0C7F)],
    "gujarati": [(0x0A80, 0x0AFF)],
    "kannada": [(0x0C80, 0x0CFF)],
    "malayalam": [(0x0D00, 0x0D7F)],
    "punjabi": [(0x0A00, 0x0A7F)],
    "urdu": [(0x0600, 0x06FF), (0x0750, 0x077F), (0x08A0, 0x08FF)],
}

LANGUAGE_REWRITE_HINTS = {
    "english": "Rewrite the following legal answer ONLY in English.",
    "hindi": "Rewrite the following legal answer ONLY in Hindi using Devanagari script.",
    "bengali": "Rewrite the following legal answer ONLY in Bengali using Bengali script.",
    "tamil": "Rewrite the following legal answer ONLY in Tamil using Tamil script.",
    "telugu": "Rewrite the following legal answer ONLY in Telugu using Telugu script.",
    "marathi": "Rewrite the following legal answer ONLY in Marathi using Devanagari script.",
    "gujarati": "Rewrite the following legal answer ONLY in Gujarati using Gujarati script.",
    "kannada": "Rewrite the following legal answer ONLY in Kannada using Kannada script.",
    "malayalam": "Rewrite the following legal answer ONLY in Malayalam using Malayalam script.",
    "punjabi": "Rewrite the following legal answer ONLY in Punjabi using Gurmukhi script.",
    "urdu": "Rewrite the following legal answer ONLY in Urdu using Perso-Arabic Urdu script.",
}


def _call_openai(prompt: str) -> str:
    if not openai_client:
        raise RuntimeError("OpenAI is not configured")

    resp = openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=LLM_TEMPERATURE,
        max_tokens=LLM_MAX_TOKENS,
        timeout=LLM_TIMEOUT,
    )
    return (resp.choices[0].message.content or "").strip()


def _call_groq(prompt: str) -> str:
    if not groq_client:
        raise RuntimeError("Groq is not configured")

    resp = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
    )
    return (resp.choices[0].message.content or "").strip()


def _call_gemini(prompt: str) -> str:
    if not gemini_model:
        raise RuntimeError("Gemini is not configured")

    resp = gemini_model.generate_content(
        prompt,
        request_options={"timeout": LLM_TIMEOUT},
    )
    return (resp.text or "").strip()


def generate(prompt: str) -> tuple[str, str, int]:
    """
    Send prompt to LLM providers with fallback.

    Returns:
        (response_text, source, duration_ms)
    """
    prompt_len = len(prompt)
    logger.info("LLM req    │ prompt_len=%d chars", prompt_len)

    start = time.perf_counter()
    last_error = None

    providers = [
        ("groq", _call_groq),
        ("gemini", _call_gemini),
        ("openai", _call_openai),
    ]

    for provider_name, provider_call in providers:
        if provider_name == "openai" and not openai_client:
            continue
        if provider_name == "groq" and not groq_client:
            continue
        if provider_name == "gemini" and not gemini_model:
            continue

        try:
            text = provider_call(prompt)
            dur = int((time.perf_counter() - start) * 1000)
            logger.info("LLM ok     │ source=%s │ %dms │ resp_len=%d", provider_name, dur, len(text))
            return text, provider_name, dur
        except Exception as err:
            last_error = err
            logger.warning("LLM %s   │ FAILED │ %s", provider_name, err)

    dur = int((time.perf_counter() - start) * 1000)
    logger.error("LLM error  │ All providers failed │ %s", last_error)
    return f"Error: All LLM providers failed. Last error: {last_error}", "error", dur


def _script_ratio(text: str, ranges: list[tuple[int, int]]) -> float:
    letters = [ch for ch in text if ch.isalpha()]
    if not letters:
        return 0.0
    hits = []
    for ch in letters:
        cp = ord(ch)
        if any(start <= cp <= end for start, end in ranges):
            hits.append(ch)
    return len(hits) / len(letters)


def _word_count(text: str) -> int:
    return len([token for token in (text or "").split() if token.strip()])


def _rewrite_to_target_length(text: str, language: str, target_words: int) -> str:
    """Rewrite text in the same language while targeting a specific word count."""
    hint = LANGUAGE_REWRITE_HINTS.get(language, "Rewrite in the same language.")
    prompt = (
        f"{hint} Keep all facts and citations unchanged. "
        f"Target approximately {target_words} words (acceptable +/-10%). "
        "Do not add new facts.\n\n"
        f"ORIGINAL ANSWER:\n{text}"
    )
    adjusted_text, source, _ = generate(prompt)
    if source == "error" or not adjusted_text.strip():
        return text
    return adjusted_text


def enforce_output_language(text: str, language: str) -> tuple[str, bool]:
    """
    Rewrite output if it does not match requested language.

    Returns:
        (final_text, rewritten)
    """
    requested = (language or "english").strip().lower()
    if requested == "any":
        return text, False
    if requested not in SCRIPT_RANGES:
        return text, False
    if not text or text.startswith("Error:"):
        return text, False

    target_ratio = _script_ratio(text, SCRIPT_RANGES[requested])

    if target_ratio >= 0.55:
        return text, False

    rewrite_prompt = LANGUAGE_REWRITE_HINTS[requested] + (
        " Keep the meaning, structure, citations, and all factual details unchanged. "
        "Do not add new facts. Keep approximately the same length and section detail as the original answer.\n\n"
    )
    rewrite_prompt += f"ORIGINAL ANSWER:\n{text}"

    rewritten_text, source, _ = generate(rewrite_prompt)
    if source == "error" or not rewritten_text.strip():
        return text, False

    rewritten_ratio = _script_ratio(rewritten_text, SCRIPT_RANGES[requested])
    original_words = max(1, _word_count(text))
    rewritten_words = _word_count(rewritten_text)
    length_ratio = rewritten_words / original_words

    if rewritten_ratio < 0.55:
        logger.warning(
            "Language enforce fallback │ requested=%s │ ratio_before=%.2f │ ratio_after=%.2f",
            requested,
            target_ratio,
            rewritten_ratio,
        )
        return text, False

    if length_ratio < 0.85 or length_ratio > 1.20:
        logger.warning(
            "Language length mismatch │ requested=%s │ original_words=%d │ rewritten_words=%d",
            requested,
            original_words,
            rewritten_words,
        )

        best_text = rewritten_text
        best_words = rewritten_words
        best_ratio = length_ratio
        best_diff = abs(1.0 - length_ratio)

        candidate_text = rewritten_text
        for _ in range(2):
            candidate_text = _rewrite_to_target_length(candidate_text, requested, original_words)
            candidate_script_ratio = _script_ratio(candidate_text, SCRIPT_RANGES[requested])
            if candidate_script_ratio < 0.55:
                continue

            candidate_words = _word_count(candidate_text)
            candidate_length_ratio = candidate_words / original_words
            candidate_diff = abs(1.0 - candidate_length_ratio)

            if candidate_diff < best_diff:
                best_text = candidate_text
                best_words = candidate_words
                best_ratio = candidate_length_ratio
                best_diff = candidate_diff

            if 0.85 <= candidate_length_ratio <= 1.20:
                return candidate_text, True

        logger.warning(
            "Language length best-effort │ requested=%s │ original_words=%d │ best_words=%d │ best_ratio=%.2f",
            requested,
            original_words,
            best_words,
            best_ratio,
        )
        return best_text, True

    return rewritten_text, True
