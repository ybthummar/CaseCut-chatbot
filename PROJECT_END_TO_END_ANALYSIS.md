# CaseCut Chatbot - End-to-End Technical Analysis

Generated on: 2026-04-03  
Workspace analyzed: `d:\SEMESTERS\Projects\CaseCut chatbot`

---

## 1) Project Summary

CaseCut is a full-stack legal AI platform for Indian legal workflows with:

- Retrieval-Augmented Generation (RAG) chat over legal documents/cases.
- PDF/document chat and summarization.
- Precedent-focused search.
- Voice conversational legal assistant.
- RAG answer quality evaluator.
- Legal learning hub (news + legal book recommendations).
- User auth and chat persistence.

It is implemented as:

- **Backend:** FastAPI + Qdrant + sentence-transformers + multi-provider LLM fallback.
- **Frontend:** React (Vite) + Tailwind + Firebase Auth/Firestore/Storage.

---

## 2) Main Technologies Used

## Backend

- Python 3.11 runtime in Docker (`backend/Dockerfile`) and GitHub Actions.
- FastAPI (`backend/app/main.py`).
- Qdrant vector DB (`qdrant-client`).
- Embeddings: `sentence-transformers/all-MiniLM-L6-v2`(384-dim) & `Qwen_embeddings` (1024-dim).
- LLM orchestration:
  - Groq (primary, `llama-3.3-70b-versatile`)
  - Gemini (fallback, `gemini-2.0-flash`)
  - OpenAI (final fallback, default `gpt-4.1-mini` if configured)
- PDF parsing: PyMuPDF (`fitz`).
- Optional local summarization models via transformers + torch.

## Frontend

- React 18 + Vite.
- TailwindCSS + Radix UI + Framer Motion.
- Firebase:
  - Auth (email/password + Google sign-in)
  - Firestore (chat/session persistence)
  - Storage (summary metadata helper + optional file pipeline)
- React Router v6.
- React Markdown + GFM.

---

## 3) High-Level Architecture

```text
Frontend (React)
  -> API layer (src/api/*)
    -> FastAPI routers (backend/app/routers/*)
      -> Services (backend/app/services/*)
        -> Models/Core utils (backend/app/models/*, app/core/*, app/utils/*)
          -> External systems:
             - Qdrant (vector search)
             - LLM providers (Groq/Gemini/OpenAI)
             - Google Books API
             - RSS feeds
             - Firebase Auth/Firestore/Storage (frontend-side)
```

---

## 4) End-to-End Functional Flows

## 4.1 Chat RAG Flow (`/query`)

1. User enters query in `frontend/src/pages/ChatPage.jsx`.
2. `useChat.sendMessage()` (`frontend/src/hooks/useChat.js`) sends to `sendQuery()` (`frontend/src/api/chatApi.js`).
3. Backend `/query` route (`backend/app/routers/chat.py`) calls `rag_service.run_query()`.
4. `rag_service`:
   - Sanitizes query.
   - Embeds query via `qdrant_service.embed_query()`.
   - Retrieves candidates from Qdrant (`search`, topic filter, min similarity).
   - Computes retrieval confidence.
   - Runs **LLM reranker** (`reranker_service.rerank_with_llm`), falls back to feature ranker.
   - Builds role/language/context prompt.
   - Generates answer via provider fallback chain.
   - Enforces output language post-generation if needed.
5. Frontend receives structured result with:
   - `summary`
   - `cases`
   - `source`
   - `reranker`
   - `confidence`
6. UI renders markdown, citations, IPC/punishment extraction badges, optional in-chat book recommendations.
7. Chat messages are persisted to Firestore subcollections (if permissions/config allow).

## 4.2 PDF Chat Flow (`/upload` + `/pdf-chat`)

1. User uploads PDF/TXT from chat or summarizer UI.
2. Frontend sends multipart upload to `/upload`.
3. Backend parses via `app.utils.parser.parse_document`:
   - text extraction
   - metadata extraction (court, date, IPC sections, topics, outcome, facts)
4. Parsed `full_text` is sent with query to `/pdf-chat`.
5. `rag_service.chat_with_pdf()`:
   - chunks text
   - embeds query + chunks
   - cosine similarity ranking
   - builds focused doc-context prompt
   - generates answer + citations (chunk/page-level)

## 4.3 Summarization Flow (`/summarize`)

1. Frontend summarizer page calls `api/summarizeApi.js`.
2. Backend `/summarize` route:
   - accepts direct text or downloads file via URL
   - parses file if needed
   - calls `summarizer_service.summarize(...)`
3. Summarizer service:
   - normalizes summary size (`short|medium|large`)
   - tries local model path for selected model id
   - for `intent=summarize`: local summarizer first, then optional LLM refinement
   - fallback: full LLM summarization pipeline
   - long docs: key-point extraction first, then final summary

## 4.4 Voice Agent Flow (`/voice-chat`)

1. Frontend Web Speech API captures voice (`useVoiceAgent`).
2. Text is sent to `/voice-chat` endpoint.
3. Backend builds conversational prompt (speech-friendly, no markdown) and calls `llm_service.generate`.
4. Frontend TTS speaks response, supports barge-in interrupt.
5. Voice sessions can persist to Firestore (`useVoiceChat`) as chat sessions with role `voice`.

## 4.5 RAG Evaluation Flow (`/evaluate-rag`)

1. User clicks evaluate button on assistant message in chat UI.
2. Frontend sends:
   - `query`
   - `retrieved_context`
   - `model_answer`
3. Backend `rag_eval_service.evaluate_rag_answer()` computes strict scores:
   - context relevance
   - groundedness
   - hallucination
   - completeness
   - accuracy
   - citation quality
4. Returns structured JSON (not envelope), rendered in chat card.

---

## 5) Backend Deep Dive

## 5.1 Entrypoint and Lifecycle

- `backend/app/main.py`
  - Loads env.
  - Registers middleware and all routers.
  - Startup banner validates Qdrant and model config.
  - `/health` and `/topics` endpoints live here.
  - CORS from `CORS_ORIGINS` env.

## 5.2 API Endpoint Map

| Endpoint | Method | Router File | Core Service/Logic |
|---|---|---|---|
| `/query` | POST | `routers/chat.py` | `services/rag_service.run_query` |
| `/pdf-chat` | POST | `routers/chat.py` | `services/rag_service.chat_with_pdf` |
| `/voice-chat` | POST | `routers/chat.py` | `services/llm_service.generate` |
| `/summarize` | POST | `routers/summarize.py` | `services/summarizer_service.summarize` |
| `/upload` | POST | `routers/pdf.py` | `utils/parser.parse_document` |
| `/feedback` | POST | `routers/feedback.py` | file append + optional analyzer |
| `/feedback/analyze` | POST | `routers/feedback.py` | `services/feedback_analyzer_service.analyze_feedback` |
| `/evaluate-rag` | POST | `routers/evaluation.py` | `services/rag_eval_service.evaluate_rag_answer` |
| `/learning/news` | GET | `routers/learning.py` | RSS fetch/cache |
| `/learning/books` | GET | `routers/books.py` | `services/book_service.search_books` |
| `/learning/books/ipc/{section}` | GET | `routers/books.py` | `book_service.get_books_for_ipc` |
| `/learning/books/topic/{topic}` | GET | `routers/books.py` | `book_service.get_books_for_topic` |
| `/learning/books/smart` | POST | `routers/books.py` | `book_service.get_context_aware_books` |
| `/topics` | GET | `main.py` | static list |
| `/health` | GET | `main.py` | runtime service status |

## 5.3 Core Service Responsibilities

- `services/rag_service.py`:
  - end-to-end RAG orchestration.
  - query sanitization, confidence computation, intent inference.
  - reranker integration.
  - language enforcement and response shaping.

- `services/qdrant_service.py`:
  - query embedding.
  - Qdrant search with retry/backoff and similarity threshold.

- `services/reranker_service.py`:
  - LLM-based reranking prompt + parser.
  - fallback to feature ranker if parse/provider fails.

- `services/llm_service.py`:
  - provider failover: Groq -> Gemini -> OpenAI.
  - language-script ratio detection and rewrite.

- `services/summarizer_service.py`:
  - hybrid summarization (local + LLM refinement/fallback).
  - task intents: `summarize`, `case_prediction`, `ipc_detection`.
  - size controls: short/medium/large.

- `services/rag_eval_service.py`:
  - deterministic evaluation engine (no LLM).
  - strict JSON score payload.

- `services/book_service.py`:
  - Google Books integration, IPC/topic-aware recommendations.

- `services/feedback_analyzer_service.py`:
  - classifies user feedback and suggested improvements.

## 5.4 Reranker Model Logic (Important)

Implemented in `backend/app/services/reranker_service.py`.

It is **not a dedicated ML reranker checkpoint** (like cross-encoder).  
It is an **LLM prompt-based reranker**:

1. RAG retrieves candidate passages (up to `max(k*4,20)`).
2. Service builds a legal relevance prompt with all passages and metadata.
3. LLM returns ranked passage IDs with scores `0..1`.
4. Parser extracts ranking lines.
5. If parsing/provider fails: fallback to feature ranker.

Fallback feature ranker (`backend/app/models/ranker.py`) weighted score:

- semantic similarity: 40%
- IPC match: 20%
- topic match: 15%
- court authority: 15%
- recency: 10%

Role-based retrieval bias can modify weights (judge/firm/strategy/student).

## 5.5 Evaluation Model Logic (Important)

Implemented in `backend/app/services/rag_eval_service.py`.

This evaluator is **rule-based + lexical similarity based** and **does not use an external model call**.

Core methods used:

- keyword/token overlap coverage
- SequenceMatcher ratio
- Jaccard similarity
- claim splitting and claim support checks
- citation pattern/source reference checks

Output scores are integer `0..5` by dimension and a final averaged verdict.

So the project currently has:

- Reranker: LLM prompt reranker (+ feature fallback)
- Evaluator: deterministic heuristic evaluator (no LLM)

## 5.6 Parsing, Embedding, and Ingestion Pipeline

- Parser (`app/utils/parser.py`):
  - extracts source URL if scraped.
  - court/date/IPC/topics/outcome/facts.
  - supports PDF and TXT.

- Embeddings (`app/models/embeddings.py`):
  - creates Qdrant collection `legal_cases` (384, cosine).
  - payload indexes for topics/court/ipc_sections/outcome.
  - chunking with overlap.
  - batch upsert with retry.
  - skip existing files by payload filename scan.

- Scrapers:
  - `scrapers/kanoon_scraper.py` for Indian Kanoon text.
  - `scrapers/ecourts_scraper.py` for SCI PDFs.
  - `scrapers/mass_scrape.py` bulk query orchestrator.
  - `app/scraper.py` convenience orchestrator.

- Cronjobs:
  - `cronjobs/update_index.py` re-index raw files.
  - `cronjobs/ingest_pdf.py` single PDF ingestion.
  - `cronjobs/upload_processed_to_qdrant.py` uploads processed JSON into separate collection `legal_cases_sota_processed` using `Qwen/Qwen3-Embedding-0.6B`.
  - `cronjobs/update_cases.sh` Linux shell automation wrapper.

## 5.7 Data Stores and Schemas

## Qdrant

Primary collection: `legal_cases`  
Vector: 384-dim cosine.

Common payload fields:

- `text`
- `file`
- `chunk_id`
- `court`
- `date`
- `ipc_sections`
- `topics`
- `outcome`
- `doc_id`
- `source_url`

Optional second collection from processed uploader:

- `legal_cases_sota_processed` with case-level embeddings and metadata.

## Firestore

From `frontend/src/services/chatService.js` and `firestore.rules`:

- `users/{userId}/chats/{chatId}`
  - `title`, `role`, `createdAt`, `updatedAt`
- `users/{userId}/chats/{chatId}/messages/{messageId}`
  - `role`, `text`, optional `cases`, optional `model`, `timestamp`

Rules enforce `request.auth.uid == userId`.

## Firebase Storage / Metadata

- File uploads helper path: `pdfs/{userId}/{timestamp}_{filename}`
- Summary metadata saved under:
  - `users/{userId}/summaries/{summaryId}`

## Local File-Based Data

- `backend/data/raw/` scraped/uploaded text/PDF corpus.
- `backend/data/processed/` parsed metadata JSON corpus.
- `backend/data/feedback.jsonl` raw feedback log.

Current observed counts:

- `backend/data/raw`: **1418 files**
- `backend/data/processed`: **528 files**

---

## 6) Frontend Deep Dive

## 6.1 Routing and Access Control

`frontend/src/main.jsx` routes:

- Public: `/`, `/about`, `/learning`, `/login`, `/signup`
- Protected: `/chat`, `/voice`, `/summarizer`, `/precedents`

Auth guard wraps protected pages; logged-in users are redirected away from login/signup.

## 6.2 Auth and Theme Context

- `contexts/AuthContext.jsx`:
  - email/password login/signup
  - Google popup login with redirect fallback
  - auth state listener (`onAuthStateChanged`)

- `contexts/ThemeContext.jsx`:
  - themes: `lavender`, `midnight`, `ocean`, `courtroom`
  - persisted in `localStorage`.

## 6.3 API Layer

- `api/client.js`: centralized request/error/health wrapper.
- `api/chatApi.js`: query, pdf-chat, upload, feedback, evaluator, voice calls.
- `api/summarizeApi.js`: text/file summarization calls.

## 6.4 Chat State Management

- `hooks/useChat.js`:
  - Firestore real-time subscriptions for chats/messages.
  - local fallback when Firestore fails.
  - supports standard RAG and PDF chat modes.

- `pages/ChatPage.jsx`:
  - main workbench UI.
  - topic filter, role selector, language selector.
  - PDF upload mode indicator.
  - evaluator panel per assistant response.
  - feedback actions.
  - in-message citation rendering.
  - voice agent overlay integration.

## 6.5 Feature Pages

- `SummarizerPage.jsx`: model/mode/task selection, PDF upload, summary history.
- `PrecedentPage.jsx`: focused precedent search + local history.
- `LearningHubPage.jsx`: learning tracks, legal news, smart books.
- `VoiceAssistantPage.jsx`: dedicated voice session UI with Firestore-backed session history.
- `LandingPage.jsx` / `AboutPage.jsx`: marketing and explanation pages.

## 6.6 Voice Client

- `hooks/useVoiceAgent.js`:
  - Web Speech API recognition
  - TTS playback with chunking
  - barge-in support
  - conversation memory
- `hooks/useVoiceChat.js`:
  - bridges voice turns to Firestore sessions.

---

## 7) File-by-File Connection Map

This section maps **all core code files** and how they connect.

## 7.1 Backend Files

## Entry and Core

- `backend/app/main.py` - FastAPI app, middleware, router registration, health/topics.
- `backend/app/core/config.py` - singleton clients/models/constants.
- `backend/app/core/prompts.py` - prompt templates, role bias, language rules.
- `backend/app/core/history.py` - local user history JSONL helper.
- `backend/app/core/logic.py` - legacy RAG pipeline module (older path).

## Routers

- `backend/app/routers/chat.py` - `/query`, `/pdf-chat`, `/voice-chat`.
- `backend/app/routers/summarize.py` - `/summarize`.
- `backend/app/routers/pdf.py` - `/upload`.
- `backend/app/routers/evaluation.py` - `/evaluate-rag`.
- `backend/app/routers/feedback.py` - `/feedback`, `/feedback/analyze`.
- `backend/app/routers/learning.py` - `/learning/news`.
- `backend/app/routers/books.py` - `/learning/books*`.

## Services

- `backend/app/services/rag_service.py` - main query/pdf orchestration.
- `backend/app/services/qdrant_service.py` - vector search/retry/filter.
- `backend/app/services/reranker_service.py` - LLM reranking + fallback.
- `backend/app/services/llm_service.py` - provider failover + language rewrite.
- `backend/app/services/summarizer_service.py` - summary orchestration.
- `backend/app/services/rag_eval_service.py` - evaluation scoring engine.
- `backend/app/services/book_service.py` - Google Books access layer.
- `backend/app/services/feedback_analyzer_service.py` - feedback classifier.

## Models / Utils

- `backend/app/models/embeddings.py` - chunk/embed/upsert pipeline.
- `backend/app/models/ranker.py` - weighted heuristic ranker.
- `backend/app/models/summarizer.py` - local seq2seq summarization wrapper.
- `backend/app/utils/parser.py` - PDF/TXT parser + metadata extraction.

## Middleware/Schemas

- `backend/app/middleware/error_handler.py` - global exception envelope.
- `backend/app/schemas/responses.py` - standard `{success,data,error}` helpers.

## Compatibility Shims

- `backend/app/embeddings.py` - re-export shim to canonical model module.
- `backend/app/ranker.py` - re-export shim.
- `backend/app/parser.py` - re-export shim.

## Ingestion/Scraping Jobs

- `backend/app/scraper.py` - scraper orchestrator.
- `backend/scrapers/kanoon_scraper.py` - Indian Kanoon crawler.
- `backend/scrapers/ecourts_scraper.py` - SCI PDF crawler.
- `backend/scrapers/mass_scrape.py` - bulk crawler + parse + upload.
- `backend/cronjobs/update_index.py` - incremental embedding update.
- `backend/cronjobs/ingest_pdf.py` - single PDF ingestion CLI.
- `backend/cronjobs/upload_processed_to_qdrant.py` - processed JSON uploader (alt collection).
- `backend/cronjobs/update_cases.sh` - end-to-end Linux cron script.

## 7.2 Frontend Files

## App Bootstrapping

- `frontend/src/main.jsx` - router + protected/public route wrappers.
- `frontend/src/lib/firebase.js` - Firebase init.
- `frontend/src/contexts/AuthContext.jsx` - auth provider/hooks.
- `frontend/src/contexts/ThemeContext.jsx` - theme provider/hooks.

## API and Data Services

- `frontend/src/api/client.js` - base request wrapper.
- `frontend/src/api/chatApi.js` - chat/pdf/feedback/eval/voice APIs.
- `frontend/src/api/summarizeApi.js` - summarize APIs.
- `frontend/src/services/chatService.js` - Firestore chat CRUD/listeners.
- `frontend/src/services/storageService.js` - storage upload + summary metadata write.
- `frontend/src/services/featureHistoryService.js` - localStorage feature histories.

## Hooks

- `frontend/src/hooks/useChat.js` - chat orchestration and persistence fallback.
- `frontend/src/hooks/useVoiceAgent.js` - speech recognition + TTS logic.
- `frontend/src/hooks/useVoiceChat.js` - voice sessions with Firestore.

## Pages

- `frontend/src/pages/LandingPage.jsx`
- `frontend/src/pages/AboutPage.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/SignupPage.jsx`
- `frontend/src/pages/ChatPage.jsx`
- `frontend/src/pages/SummarizerPage.jsx`
- `frontend/src/pages/PrecedentPage.jsx`
- `frontend/src/pages/LearningHubPage.jsx`
- `frontend/src/pages/VoiceAssistantPage.jsx`

## Reusable Components

- `frontend/src/components/FloatingNav.jsx`
- `frontend/src/components/ThemeToggle.jsx`
- `frontend/src/components/ToolsDropdown.jsx`
- `frontend/src/components/BookCard.jsx`
- `frontend/src/components/SummarizerModal.jsx` (modal implementation; currently not wired in ChatPage render)
- `frontend/src/components/icons/GoogleIcon.jsx`

## UI Primitive/Experimental Components

- `frontend/src/components/ui/animated-select.jsx`
- `frontend/src/components/ui/bolt-style-chat.jsx`
- `frontend/src/components/ui/ai-input.tsx`
- `frontend/src/components/ui/flux-card-hero.tsx`
- `frontend/src/components/ui/ia-siri-chat.tsx`
- `frontend/src/components/ui/button.jsx`
- `frontend/src/components/ui/input.jsx`
- `frontend/src/components/ui/dropdown-menu.tsx`
- `frontend/src/components/ui/interfaces-avatar.tsx`
- `frontend/src/components/ui/shining-text.tsx`
- `frontend/src/components/ui/hero-shutter-text.jsx`

## Styling

- `frontend/src/index.css` - Tailwind + CSS vars + theme overrides.
- `frontend/src/App.css` - markdown + legacy global styles used by ChatPage import.

---

## 8) Deployment, Automation, and Operations

## Deployment Config

- Backend Docker: `backend/Dockerfile`
- Railway deploy config: `backend/railway.json`
- Frontend deploy config: `frontend/vercel.json`
- Firebase rules config:
  - `firebase.json`
  - `firestore.rules`
  - `.firebaserc`

## Local Scripts

- `setup.ps1` - first-time setup (venv + npm install + env templates).
- `start.ps1` - starts backend/frontend with dynamic backend port.
- `start.bat` - backend launcher with dependency checks.

## GitHub Automation

- `.github/workflows/scraper.yml`
  - scheduled daily scraping and embedding job.
  - runs scraper/parser/embeddings.
  - commits dataset updates.

---

## 9) Reranker and Evaluator - Final Clarification

If your question is specifically "what reranker model and evaluation model are used?":

## Reranker

- **Type:** Prompt-based LLM reranker (not a dedicated cross-encoder).
- **Providers:** same as generation chain (Groq/Gemini/OpenAI via `llm_service.generate`).
- **Fallback:** feature-based weighted ranker (`app/models/ranker.py`).

## Evaluator

- **Type:** deterministic heuristic evaluator (`app/services/rag_eval_service.py`).
- **Model usage:** no external LLM call.
- **Method:** token overlap + sequence similarity + rule-based citation/claim checks.

---

## 10) Important Observations and Gaps

1. `app/core/logic.py` is a legacy pipeline and duplicates behavior already implemented in `services/rag_service.py`.
2. Compatibility shims (`app/embeddings.py`, `app/ranker.py`, `app/parser.py`) are maintained for backward compatibility.
3. Summarizer docs/comments mention HuggingFace APIs, but active summarization path is local model wrapper + LLM fallback; no direct HF inference API call path is currently active.
4. `ChatPage.jsx` has a comment for a summarizer modal section but no mounted modal render.
5. GitHub workflow commits `data/` at repo root, while scraper/parser pipelines primarily write to `backend/data/`; this likely misses intended dataset commits.
6. Environment/version conventions vary:
   - Docker/GHA use Python 3.11.
   - local scripts often create/use Python 3.10 venvs.
7. Health endpoint marks missing providers as degraded; this can show degraded even when one provider is sufficient for runtime.

---

## 11) Project Main Features (Condensed)

- Multi-role legal AI chat (`lawyer`, `judge`, `student`, `firm`, `summary`).
- Topic-filtered precedent search.
- PDF upload + document-grounded chat.
- Summarization (text/PDF, task-specific modes).
- Voice legal assistant with conversational memory.
- RAG quality evaluator (6-dimension scoring).
- Feedback capture + analysis.
- Learning hub (legal news + book recommendations).
- Firestore-backed chat history with real-time sync.

---

## 12) What Connects to What (One-Look Map)

```text
ChatPage -> useChat -> api/chatApi -> /query -> rag_service
                                      -> /pdf-chat -> rag_service.chat_with_pdf
                                      -> /feedback -> feedback router/service
                                      -> /evaluate-rag -> rag_eval_service
                                      -> /voice-chat -> llm_service

SummarizerPage -> api/summarizeApi -> /summarize -> summarizer_service
               -> uploadPDFToBackend -> /upload -> parser

PrecedentPage -> sendQuery -> /query -> rag_service

LearningHubPage -> /learning/news -> RSS parser
                -> /learning/books* -> book_service -> Google Books API

All frontend chat/session persistence -> chatService -> Firestore
Embedding/search index pipeline -> parser + embeddings -> Qdrant
```

---

If you want, I can generate a second `.md` file that is only:

- sequence diagrams (Mermaid),
- exact API request/response schemas,
- and a "new developer onboarding checklist" for this codebase.

