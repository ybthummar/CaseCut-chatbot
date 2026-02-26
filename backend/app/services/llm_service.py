"""
LLM service — single-responsibility wrapper around Groq + Gemini.

Features:
  • 30-second timeout on every call
  • Groq primary → Gemini fallback
  • Logs prompt length + wall-clock response time
  • Returns (text, source, duration_ms)
"""

import time
import logging

from app.core.config import (
    groq_client,
    gemini_model,
    LLM_TIMEOUT,
    LLM_MAX_TOKENS,
    LLM_TEMPERATURE,
)

logger = logging.getLogger("casecut")


def generate(prompt: str) -> tuple[str, str, int]:
    """
    Send prompt to LLM.  Groq first, Gemini fallback.

    Returns:
        (response_text, source, duration_ms)
    """
    prompt_len = len(prompt)
    logger.info("LLM req    │ prompt_len=%d chars", prompt_len)

    start = time.perf_counter()

    # ── Try Groq ─────────────────────────────────────────────────
    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=LLM_MAX_TOKENS,
            temperature=LLM_TEMPERATURE,
            timeout=LLM_TIMEOUT,
        )
        text = resp.choices[0].message.content
        dur = int((time.perf_counter() - start) * 1000)
        logger.info("LLM ok     │ source=groq │ %dms │ resp_len=%d", dur, len(text))
        return text, "groq", dur

    except Exception as groq_err:
        logger.warning("LLM groq   │ FAILED │ %s — trying Gemini", groq_err)

    # ── Try Gemini fallback ──────────────────────────────────────
    try:
        resp = gemini_model.generate_content(
            prompt,
            request_options={"timeout": LLM_TIMEOUT},
        )
        text = resp.text
        dur = int((time.perf_counter() - start) * 1000)
        logger.info("LLM ok     │ source=gemini │ %dms │ resp_len=%d", dur, len(text))
        return text, "gemini", dur

    except Exception as gemini_err:
        dur = int((time.perf_counter() - start) * 1000)
        logger.error("LLM error  │ Both Groq AND Gemini failed │ %s", gemini_err)
        return f"Error: Both LLMs failed. Groq: {groq_err} | Gemini: {gemini_err}", "error", dur
