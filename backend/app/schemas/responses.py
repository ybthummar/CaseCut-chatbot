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

def _to_json_safe(value: Any) -> Any:
    """Recursively normalize values so FastAPI can JSON-encode responses."""
    if isinstance(value, dict):
        return {str(k): _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_json_safe(v) for v in value]

    # Handle numpy scalars/arrays without requiring numpy import at startup.
    if hasattr(value, "tolist") and callable(getattr(value, "tolist")):
        try:
            return _to_json_safe(value.tolist())
        except Exception:
            pass
    if hasattr(value, "item") and callable(getattr(value, "item")):
        try:
            return _to_json_safe(value.item())
        except Exception:
            pass

    return value

def ok(data: Any) -> dict:
    """Shorthand for a success response dict."""
    return {"success": True, "data": _to_json_safe(data), "error": None}


def fail(message: str, error_type: str = "ServerError", hint: Optional[str] = None) -> dict:
    """Shorthand for an error response dict."""
    return {
        "success": False,
        "data": None,
        "error": {"message": message, "type": error_type, "hint": hint},
    }
