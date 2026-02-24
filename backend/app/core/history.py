"""
User history persistence.

Stores session history to disk at  user_history/{user_id}/*.jsonl
Optionally syncs to Google Drive (if configured).
"""

import os
import json
from datetime import datetime
from typing import Optional

HISTORY_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "user_history")


def _user_dir(user_id: str) -> str:
    d = os.path.join(HISTORY_DIR, user_id)
    os.makedirs(d, exist_ok=True)
    return d


def save_session(
    user_id: str,
    query: str,
    response_summary: str,
    role: str,
    source: str,
    cases_count: int,
    metadata: Optional[dict] = None,
) -> str:
    """Append a single interaction to the user's history file. Returns entry id."""
    entry = {
        "id": datetime.now().strftime("%Y%m%d%H%M%S%f"),
        "query": query,
        "response_summary": response_summary[:500],
        "role": role,
        "source": source,
        "cases_count": cases_count,
        "timestamp": datetime.now().isoformat(),
        **(metadata or {}),
    }
    filepath = os.path.join(_user_dir(user_id), "history.jsonl")
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    return entry["id"]


def get_history(user_id: str, limit: int = 50) -> list[dict]:
    """Return the most recent `limit` interactions for a user."""
    filepath = os.path.join(_user_dir(user_id), "history.jsonl")
    if not os.path.exists(filepath):
        return []

    lines = open(filepath, "r", encoding="utf-8").readlines()
    entries = [json.loads(l) for l in lines if l.strip()]
    return entries[-limit:]


def get_all_users() -> list[str]:
    """List all user IDs that have history."""
    if not os.path.exists(HISTORY_DIR):
        return []
    return [
        d for d in os.listdir(HISTORY_DIR)
        if os.path.isdir(os.path.join(HISTORY_DIR, d))
    ]
