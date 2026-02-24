"""
Summarizer model wrapper — Flan-T5 (local) or fallback to Groq/Gemini.

When running locally with enough GPU/CPU:
  pip install transformers torch
  The model auto-downloads on first use.

Otherwise the summarize_text() function falls back to the cloud LLM pipeline.
"""

import os

_model = None
_tokenizer = None


def _load_model():
    """Lazy-load Flan-T5 small from HuggingFace hub."""
    global _model, _tokenizer
    if _model is not None:
        return

    try:
        from transformers import T5ForConditionalGeneration, T5Tokenizer

        model_name = os.getenv("SUMMARIZER_MODEL", "google/flan-t5-small")
        print(f"📦 Loading summariser model: {model_name} …")
        _tokenizer = T5Tokenizer.from_pretrained(model_name)
        _model = T5ForConditionalGeneration.from_pretrained(model_name)
        print("✅ Summariser model loaded")
    except ImportError:
        print("⚠️  transformers not installed — local summariser disabled")
    except Exception as e:
        print(f"⚠️  Could not load summariser model: {e}")


def summarize_text(text: str, max_length: int = 512, min_length: int = 50) -> str | None:
    """
    Summarise using local Flan-T5.
    Returns None if the model isn't available (caller should fallback).
    """
    _load_model()
    if _model is None or _tokenizer is None:
        return None

    prompt = f"summarize: {text[:4096]}"
    inputs = _tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True)
    outputs = _model.generate(
        inputs.input_ids,
        max_length=max_length,
        min_length=min_length,
        length_penalty=2.0,
        num_beams=4,
        early_stopping=True,
    )
    return _tokenizer.decode(outputs[0], skip_special_tokens=True)
