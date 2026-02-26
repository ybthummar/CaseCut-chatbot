"""
Global exception handler middleware.

Catches any unhandled exception and returns a structured JSON response
so the frontend always gets a predictable shape.
"""

import traceback
import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("casecut")


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            logger.error(
                "❌ Unhandled %s on %s %s\n%s",
                type(exc).__name__,
                request.method,
                request.url.path,
                traceback.format_exc(),
            )
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "data": None,
                    "error": {
                        "message": str(exc),
                        "type": type(exc).__name__,
                        "hint": "Check backend logs for full traceback.",
                    },
                },
            )
