"""
CaseCut - centralized configuration and singleton services.

All shared clients (Qdrant, Groq, Gemini, Embedder) are initialized here
exactly once. Every other module should import from this file.
"""

import logging
import os
import sys
import warnings

from dotenv import load_dotenv

load_dotenv()

# Keep backend startup logs clean on Python 3.10 until runtime is upgraded.
warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    module=r"google\.api_core\._python_version_support",
)


def _configure_console_encoding() -> None:
    """Avoid UnicodeEncodeError on Windows cp1252 consoles."""
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream is None or not hasattr(stream, "reconfigure"):
            continue
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            # If reconfigure is not supported by this stream implementation.
            pass


_configure_console_encoding()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("casecut")

# LLM clients
try:
    from groq import Groq
except Exception:
    Groq = None

try:
    import google.generativeai as genai
except Exception:
    genai = None

groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
groq_client = Groq(api_key=groq_api_key) if (Groq and groq_api_key) else None

gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
if genai and gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel("gemini-2.0-flash")
else:
    gemini_model = None

# Qdrant
from qdrant_client import QdrantClient

qdrant_url = os.getenv("QDRANT_URL", "").strip()
qdrant_key = os.getenv("QDRANT_KEY", "").strip() or None
qdrant_client = QdrantClient(
    url=qdrant_url or None,
    api_key=qdrant_key,
    timeout=60,
)

COLLECTION = "legal_cases"

# Embedding model
from sentence_transformers import SentenceTransformer

try:
    # Prefer local cache to avoid startup warnings on locked cache refs files.
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", local_files_only=True)
except Exception:
    logger.warning("Embedding cache missing locally; downloading sentence-transformers/all-MiniLM-L6-v2")
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Tuning constants
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
PDF_SMART_THRESHOLD = 4000   # chars - above this, extract key points first

# Production constants
LLM_TIMEOUT = 60
LLM_MAX_TOKENS = 4096
LLM_TEMPERATURE = 0.3

QDRANT_RETRY_ATTEMPTS = 3
QDRANT_RETRY_DELAY = 1.0

MIN_SIMILARITY = 0.3
