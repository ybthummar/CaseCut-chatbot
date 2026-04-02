"""Backward-compatible shim - canonical code lives in app.models.embeddings."""
try:
	# Preferred import when running from backend root: `python -m app.embeddings`
	from app.models.embeddings import *  # noqa: F401,F403
except ModuleNotFoundError:
	# Fallback for direct execution from backend/app: `python embeddings.py`
	from models.embeddings import *  # type: ignore # noqa: F401,F403

