"""
/feedback router — thumbs up / down for continuous learning.
"""

import os
import json
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

FEEDBACK_FILE = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "feedback.jsonl"
)


class FeedbackRequest(BaseModel):
    query: str
    response_id: Optional[str] = None
    rating: int   # 1 = thumbs up, -1 = thumbs down
    role: str = "lawyer"
    comment: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Store user feedback for future model retraining."""
    try:
        os.makedirs(os.path.dirname(FEEDBACK_FILE), exist_ok=True)
        entry = {
            "query": req.query,
            "response_id": req.response_id,
            "rating": req.rating,
            "role": req.role,
            "comment": req.comment,
            "timestamp": datetime.now().isoformat(),
        }
        with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
        return {"status": "ok", "message": "Feedback recorded. Thank you!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
