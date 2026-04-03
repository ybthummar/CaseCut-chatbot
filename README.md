# CaseCut AI: Legal RAG + Summarizer + Precedent Finder

CaseCut is a full-stack legal assistant platform for Indian legal workflows.

It provides:
- Retrieval-Augmented legal chat
- PDF/text summarization
- Precedent-focused retrieval
- Per-feature history in UI
- Strict RAG answer evaluator endpoint
- Multi-provider LLM orchestration (OpenAI, Groq, Gemini)

## What The Project Does

CaseCut is built for practical legal research and drafting support:
- `Chat`: asks legal questions over retrieved legal context and returns role-aware answers.
- `Summarizer`: summarizes uploaded legal documents or pasted text with task-specific modes.
- `Precedent Finder`: runs focused precedent retrieval by topic, role, and language.
- `RAG Evaluator`: audits generated answers for relevance, groundedness, hallucination, completeness, accuracy, and citation quality.

## Current Tech Stack

### Backend
- FastAPI
- Qdrant (vector database)
- sentence-transformers embeddings (`all-MiniLM-L6-v2`)
- Optional providers: OpenAI / Groq / Gemini
- PyMuPDF for PDF extraction

### Frontend
- React + Vite
- Tailwind CSS
- Firebase Auth + Firestore-backed chat history
- Framer Motion + Lucide icons

## High-Level Architecture

1. User sends query from frontend.
2. Backend creates embedding for query.
3. Similar chunks are retrieved from Qdrant.
4. Relevant chunks are ranked/filtered.
5. Prompt is assembled with:
   - query
   - role
   - language
   - context chunks
6. LLM generates answer.
7. Response returns summary + supporting chunks + metadata.
8. Optional `/evaluate-rag` scores answer quality against retrieved context.

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── cronjobs/
│   ├── data/
│   ├── Model/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── data/
├── firestore.rules
└── README.md
```

## Backend API

Base URL (local): `http://localhost:8000`

### Core routes
- `POST /query`: legal RAG query
- `POST /pdf-chat`: ask questions about uploaded document text
- `POST /upload`: upload and parse PDF
- `POST /summarize`: summarization and related tasks
- `POST /feedback`: store feedback
- `POST /feedback/analyze`: classify feedback quality/issues
- `POST /evaluate-rag`: strict RAG quality evaluator (JSON)
- `GET /news`: legal learning/news feed
- `GET /topics`: topic list
- `GET /health`: service health

## RAG Evaluator Output Format

`POST /evaluate-rag` returns strict JSON with:
- `query`
- `scores.context_relevance`
- `scores.groundedness`
- `scores.hallucination`
- `scores.completeness`
- `scores.accuracy`
- `scores.citation_quality`
- `final_verdict.overall_score`
- `final_verdict.confidence`
- `final_verdict.summary`

This evaluator is context-only and does not use external legal knowledge.

## Frontend Pages

- `/`: redesigned landing page with clear feature selection
- `/chat`: legal chat workspace
- `/summarizer`: dedicated summarization page (text/PDF)
- `/precedents`: dedicated precedent search page
- `/learning`: legal learning hub
- `/about`: project info

Theme modes are available in the UI and persisted client-side.

## Environment Setup

### 1) Backend env
Copy:
- `backend/.env.example` -> `backend/.env`

Fill at minimum:
- `QDRANT_URL`
- `QDRANT_KEY`
- one LLM provider key (`OPENAI_API_KEY` or `GROQ_API_KEY` or `GEMINI_API_KEY`)

Optional:
- `CORS_ORIGINS`

### 2) Frontend env
Copy:
- `frontend/.env.example` -> `frontend/.env`

Set:
- `VITE_API_URL`
- Firebase values (`VITE_FIREBASE_*`)

## Local Run

### Backend
```powershell
cd backend
py -3.10 -m venv .venv310
.\.venv310\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

Default local URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Health: `http://localhost:8000/health`

If port `8000` is already in use, startup scripts automatically select the next free port in `8000-8100` and print the active URL.

## Build and Quality Checks

### Frontend
```powershell
cd frontend
npm run build
npm run lint
```

### Backend
```powershell
cd backend
python -m compileall app cronjobs
```

## Data and Indexing Workflow

1. Put raw legal files into `backend/data/raw/`.
2. Run indexing job (`backend/cronjobs/update_index.py`) or app embedding pipeline.
3. Embeddings are uploaded to Qdrant collection.
4. Query-time retrieval uses this indexed corpus.

## Security Notes

- Never commit real API keys to `.env.example`, docs, or source code.
- Keep `.env` local-only.
- Rotate any key that has ever been exposed.
- Firestore rules should remain user-scoped (already configured in `firestore.rules`).

## Deployment Notes

- Backend can run on Railway (Dockerfile present).
- Frontend can run on Vercel (`frontend/vercel.json` present).
- Update CORS and `VITE_API_URL` for production domains.

## Troubleshooting

- `WinError 10013` on backend startup:
   - Cause: `8000` is occupied or blocked.
   - Fix: use `start.bat` or `start.ps1` (they now auto-pick a free port), or free the port manually:
      - `Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess`
      - `Stop-Process -Id <PID> -Force`
- `404 on /evaluate-rag`: ensure backend includes evaluation router and is restarted.
- `Cannot reach backend`: verify `VITE_API_URL` and backend process.
- `No vectors found`: verify Qdrant config and indexing completed.
- `Firestore chat history not saving`: verify Firebase config and auth rules.
- `Windows encoding issues in logs`: avoid emoji in backend console logs.
- `ModuleNotFoundError: No module named 'app'` while running embeddings:
   - Run from backend root: `python -m app.models.embeddings`
   - Or run shim from `backend/app`: `python embeddings.py`

## License / Usage

Internal/student project usage unless your repository defines another license.
