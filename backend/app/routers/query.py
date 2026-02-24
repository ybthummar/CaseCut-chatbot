"""
/query router — RAG search endpoint.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.core.logic import run_query
from app.core.history import save_session

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    role: str = "lawyer"
    topic: str = "all"
    k: int = 5
    user_id: str | None = None     # optional — for server-side history


@router.post("/query")
async def search_cases(req: QueryRequest):
    """Full RAG pipeline: embed → retrieve → rank → summarise."""
    try:
        result = run_query(
            query=req.query,
            role=req.role,
            topic=req.topic,
            k=req.k,
        )

        # Persist server-side history (non-blocking best-effort)
        if req.user_id:
            try:
                save_session(
                    user_id=req.user_id,
                    query=req.query,
                    response_summary=result.get("summary", ""),
                    role=req.role,
                    source=result.get("source", ""),
                    cases_count=len(result.get("cases", [])),
                )
            except Exception:
                pass  # don't fail the response

        return result

    except Exception as e:
        return {"error": str(e), "cases": [], "summary": ""}
