"""
/feedback router: thumbs up/down logging + structured feedback analysis.
"""

import json
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.feedback_analyzer_service import analyze_feedback

router = APIRouter()

FEEDBACK_FILE = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "feedback.jsonl"
)


class FeedbackRequest(BaseModel):
    query: str
    response_id: Optional[str] = None
    rating: int  # 1 = thumbs up, -1 = thumbs down
    role: str = "lawyer"
    comment: Optional[str] = None

    # Optional payload used for richer analyzer output
    ai_response: Optional[str] = None
    user_feedback: Optional[str] = None  # Helpful / Not Helpful
    user_comment: Optional[str] = None


class FeedbackAnalyzeRequest(BaseModel):
    ai_response: str
    user_feedback: str  # Helpful / Not Helpful
    user_comment: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Store raw user feedback and optional analyzer output."""
    try:
        os.makedirs(os.path.dirname(FEEDBACK_FILE), exist_ok=True)

        resolved_user_feedback = req.user_feedback or ("Helpful" if req.rating > 0 else "Not Helpful")
        resolved_user_comment = req.user_comment if req.user_comment is not None else req.comment

        analysis = None
        if req.ai_response:
            analysis = analyze_feedback(
                ai_response=req.ai_response,
                user_feedback=resolved_user_feedback,
                user_comment=resolved_user_comment,
            )

        entry = {
            "query": req.query,
            "response_id": req.response_id,
            "rating": req.rating,
            "role": req.role,
            "comment": req.comment,
            "ai_response": req.ai_response,
            "user_feedback": resolved_user_feedback,
            "user_comment": resolved_user_comment,
            "analysis": analysis,
            "timestamp": datetime.now().isoformat(),
        }
        with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

        return {
            "status": "ok",
            "message": "Feedback recorded. Thank you!",
            "analysis": analysis,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/feedback/analyze")
async def feedback_analyze(req: FeedbackAnalyzeRequest):
    """
    Analyze one feedback sample and return strict JSON keys:
    feedback_type, issue_detected, improvement_suggestion
    """
    return analyze_feedback(
        ai_response=req.ai_response,
        user_feedback=req.user_feedback,
        user_comment=req.user_comment,
    )
