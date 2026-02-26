"""
CaseCut — Centralized configuration & singleton services.

All shared clients (Qdrant, Groq, Gemini, Embedder) are initialised here
exactly once. Every other module should import from this file.
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("casecut")

# ── LLM clients ─────────────────────────────────────────────────────

from groq import Groq
import google.generativeai as genai

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-2.0-flash")

# ── Qdrant ───────────────────────────────────────────────────────────

from qdrant_client import QdrantClient

qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_KEY"),
    timeout=60,
)

COLLECTION = "legal_cases"

# ── Embedding model ──────────────────────────────────────────────────

from sentence_transformers import SentenceTransformer

embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# ── Tuning constants ────────────────────────────────────────────────

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
PDF_SMART_THRESHOLD = 4000   # chars — above this, extract key points first

# ── Production constants ─────────────────────────────────────────────

LLM_TIMEOUT = 30             # seconds — Groq / Gemini call timeout
LLM_MAX_TOKENS = 800
LLM_TEMPERATURE = 0.3

QDRANT_RETRY_ATTEMPTS = 3    # retries on transient Qdrant failures
QDRANT_RETRY_DELAY = 1.0     # seconds between retries

MIN_SIMILARITY = 0.3         # drop results below this cosine similarity

HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
