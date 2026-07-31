"""
RAG evaluation router.

Returns strict JSON with legal-focused scoring dimensions.
"""

import logging
import traceback
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.services.rag_eval_service import evaluate_rag_answer


from app.schemas.responses import ok, fail

router = APIRouter()
logger = logging.getLogger("casecut")


class RAGEvaluationRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    query: str = Field(..., min_length=1)
    retrieved_context: list[Any] = Field(default_factory=list)
    model_answer: str = Field(..., min_length=1)


@router.post("/evaluate-rag")
async def evaluate_rag(req: RAGEvaluationRequest):
    """
    Evaluate a RAG answer using only query, retrieved context, and model answer.

    Returns structured {success, data, error} envelope.
    """
    try:
        logger.info(
            "[EVAL] /evaluate-rag | context_items=%d | query_len=%d | answer_len=%d",
            len(req.retrieved_context or []),
            len(req.query),
            len(req.model_answer),
        )

        result = evaluate_rag_answer(
            query=req.query,
            retrieved_context=req.retrieved_context,
            model_answer=req.model_answer,
        )

        logger.info(
            "[EVAL] /evaluate-rag complete | overall=%.2f | confidence=%s",
            result["final_verdict"]["overall_score"],
            result["final_verdict"]["confidence"],
        )
        return ok(result)

    except Exception as e:
        logger.error("[EVAL] /evaluate-rag failed | %s", traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content=fail(str(e), type(e).__name__, "Evaluation service error."),
        )
