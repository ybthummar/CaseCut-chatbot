"""
Structured API response schemas.

Every endpoint returns APIResponse so the frontend has a single,
predictable shape to parse.
"""

from typing import Any, Optional
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    message: str
    type: str = "UnknownError"
    hint: Optional[str] = None


class APIResponse(BaseModel):
    success: bool
    data: Any = None
    error: Optional[ErrorDetail] = None


# ── Helper constructors ──────────────────────────────────────────────

def ok(data: Any) -> dict:
    """Shorthand for a success response dict."""
    return {"success": True, "data": data, "error": None}


def fail(message: str, error_type: str = "ServerError", hint: Optional[str] = None) -> dict:
    """Shorthand for an error response dict."""
    return {
        "success": False,
        "data": None,
        "error": {"message": message, "type": error_type, "hint": hint},
    }
