# CaseCut Legal Chatbot — Model Documentation

## 🧠 Models Used

### 1. LLM — Llama 3.3 70B Versatile (via Groq)

| Property | Value |
|----------|-------|
| **Model** | `llama-3.3-70b-versatile` |
| **Provider** | Groq (free tier: 14,400 req/day) |
| **Fallback** | Google Gemini 2.0 Flash |
| **Use case** | Legal Q&A, case analysis, mode-based responses |
| **Max tokens** | 800 (output) |
| **Temperature** | 0.3 (low creativity, high accuracy) |

**Why chosen:**
- 70B parameters give strong legal reasoning capability
- Groq provides extremely fast inference (< 1s for most queries)
- Free tier is generous enough for development and moderate production use
- Gemini 2.0 Flash as fallback ensures 99.9% uptime

### 2. Embedding Model — all-MiniLM-L6-v2

| Property | Value |
|----------|-------|
| **Model** | `sentence-transformers/all-MiniLM-L6-v2` |
| **Dimensions** | 384 |
| **Max sequence** | 256 tokens |
| **Size** | ~80 MB |
| **Use case** | Query & document embedding for Qdrant vector search |

**Why chosen:**
- Extremely fast inference (CPU-friendly)
- 384-dim vectors are compact → lower Qdrant storage
- Good semantic understanding for legal text similarity
- No GPU required — runs on any machine

### 3. Summarizer — Flan-T5 Small (Optional Local)

| Property | Value |
|----------|-------|
| **Model** | `google/flan-t5-small` |
| **Size** | ~300 MB |
| **Use case** | Local document summarization (optional) |
| **Fallback** | Cloud LLM (Groq/Gemini) |

**Why chosen:**
- Can run entirely offline for privacy-sensitive documents
- Small footprint, no GPU needed
- Falls back to cloud LLM when transformer libraries aren't installed

---

## 💻 Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8 GB |
| **GPU** | Not required | CUDA GPU (speeds up embedding) |
| **Disk** | 2 GB | 5 GB (for models + data) |
| **Network** | Required (for Groq/Gemini/Qdrant Cloud) | — |

> **Note:** All heavy LLM inference happens on Groq/Gemini cloud. The local machine only runs embedding (MiniLM) and optional Flan-T5 summarization.

---

## 📁 Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app + startup logging
│   ├── core/
│   │   ├── config.py         # Centralized singletons (Qdrant, LLM, embedder)
│   │   ├── logic.py          # RAG pipeline + intelligent PDF processing
│   │   ├── prompts.py        # Role-aware prompt templates (4 modes)
│   │   └── history.py        # User session history
│   ├── models/
│   │   ├── embeddings.py     # Embedding + Qdrant upload utilities
│   │   ├── ranker.py         # Feature-based case re-ranking
│   │   └── summarizer.py     # Optional local Flan-T5 summarizer
│   ├── routers/
│   │   ├── query.py          # /query endpoint (RAG search)
│   │   ├── upload.py         # /upload + /summarize endpoints
│   │   └── feedback.py       # /feedback endpoint
│   └── utils/
│       └── parser.py         # PDF/TXT parsing + metadata extraction
├── data/
│   ├── raw/                  # Input PDFs/TXT files
│   └── processed/            # Parsed JSON metadata
├── model.md                  # ← This file
├── requirements.txt
└── .env                      # API keys (not committed)
```

---

## 🔄 RAG Pipeline

```
User Query
    │
    ▼
┌─────────────┐
│  Embed Query │  ← all-MiniLM-L6-v2 (384-dim)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Qdrant Search   │  ← top-k*2 vectors with optional topic filter
│ (Vector DB)     │
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│ Re-Rank Cases    │  ← Multi-feature scoring:
│                  │     semantic (40%) + IPC match (20%)
│                  │     + topic (15%) + court authority (15%)
│                  │     + recency (10%)
│                  │     + role-aware bias adjustments
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Build Prompt     │  ← Mode-specific system prompt
│ (Role-Aware)     │     + structured output instructions
│                  │     + retrieved case context
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ LLM Generation   │  ← Groq (Llama 3.3 70B) → Gemini fallback
└──────┬───────────┘
       │
       ▼
  Structured Response
  (summary + case citations)
```

---

## 📄 Intelligent PDF Processing

```
PDF Upload
    │
    ▼
┌─────────────────┐
│ Extract Text    │  ← PyMuPDF (fitz)
└──────┬──────────┘
       │
       ▼
  text length > 4000 chars?
       │
  ┌────┴────┐
  │ YES     │ NO
  ▼         ▼
Extract    Send directly
Key Points  to LLM
  │
  ▼
Condensed text
  │
  ▼
Mode-aware LLM Summarization
```

---

## 🚀 Future Scalability Plan

### Short-term
- [ ] Add **BGE-large** or **E5-large** embeddings for better legal retrieval
- [ ] Implement **conversation memory** (multi-turn RAG)
- [ ] Add **citation linking** to actual judgment PDFs

### Medium-term
- [ ] Fine-tune embedding model on Indian legal corpus
- [ ] Add **hybrid search** (dense + sparse/BM25) in Qdrant
- [ ] Implement **streaming responses** via SSE
- [ ] Add **multi-language support** (Hindi legal texts)

### Long-term
- [ ] Fine-tune a legal-specific LLM on Indian judgments
- [ ] Implement **knowledge graph** for case relationships
- [ ] Add **automated case outcome prediction**
- [ ] Deploy on-premise for law firms (fully offline mode)
