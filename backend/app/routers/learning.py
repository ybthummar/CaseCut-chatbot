"""
/learning router — learning hub support APIs.
Provides daily Indian legal news feed for the frontend learning page.
"""

from datetime import datetime
import logging
from typing import Any
import xml.etree.ElementTree as ET

import requests as http_requests
from fastapi import APIRouter

from app.schemas.responses import ok

router = APIRouter(prefix="/learning", tags=["learning"])
logger = logging.getLogger("casecut")

_NEWS_CACHE: dict[str, Any] = {"date": "", "items": []}

RSS_FEEDS = [
    "https://www.livelaw.in/rss/top-stories",
    "https://www.barandbench.com/rss",
]


def _parse_rss_items(xml_text: str, source_name: str, max_items: int = 8) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return items

    for node in root.findall(".//item")[:max_items]:
        title = (node.findtext("title") or "").strip()
        link = (node.findtext("link") or "").strip()
        pub_date = (node.findtext("pubDate") or "").strip()
        if not title or not link:
            continue
        items.append(
            {
                "title": title,
                "url": link,
                "published_at": pub_date,
                "source": source_name,
            }
        )
    return items


def _fallback_news() -> list[dict[str, str]]:
    today = datetime.now().strftime("%Y-%m-%d")
    return [
        {
            "title": "Supreme Court updates: key hearings and constitutional matters",
            "url": "https://www.sci.gov.in",
            "published_at": today,
            "source": "Supreme Court of India",
        },
        {
            "title": "High Court roundup: significant procedural and bail rulings",
            "url": "https://ecommitteesci.gov.in",
            "published_at": today,
            "source": "e-Courts",
        },
    ]


@router.get("/news")
def get_daily_legal_news():
    """Fetch and return daily Indian legal news for the Learning Hub."""
    today = datetime.now().strftime("%Y-%m-%d")
    if _NEWS_CACHE["date"] == today and _NEWS_CACHE["items"]:
        return ok({"date": today, "items": _NEWS_CACHE["items"], "cached": True})

    all_items: list[dict[str, str]] = []
    for feed_url in RSS_FEEDS:
        try:
            resp = http_requests.get(feed_url, timeout=12)
            resp.raise_for_status()
            source_name = "LiveLaw" if "livelaw" in feed_url else "Bar & Bench"
            all_items.extend(_parse_rss_items(resp.text, source_name))
        except Exception as exc:
            logger.warning("News feed fetch failed │ %s │ %s", feed_url, exc)

    if not all_items:
        all_items = _fallback_news()

    all_items = all_items[:12]
    _NEWS_CACHE["date"] = today
    _NEWS_CACHE["items"] = all_items

    return ok({"date": today, "items": all_items, "cached": False})
