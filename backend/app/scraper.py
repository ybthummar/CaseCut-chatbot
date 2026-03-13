"""
Scraper entry point — called by GitHub Actions workflow.

Usage:
    python -m app.scraper

Runs the Indian Kanoon scraper to download new judgments.
"""

import sys
import os

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from scrapers.kanoon_scraper import scrape_indian_kanoon
from scrapers.ecourts_scraper import scrape_sci_judgments


def main():
    """Run all scrapers to download new legal judgments."""
    print("=" * 60)
    print("🏛️  CaseCut Legal Judgment Scraper")
    print("=" * 60)

    total = 0

    # 1 — Indian Kanoon (text judgments)
    queries = [
        "Supreme Court criminal",
        "High Court bail",
        "Supreme Court constitutional",
        "High Court property dispute",
        "Supreme Court fraud",
    ]
    for q in queries:
        try:
            count = scrape_indian_kanoon(query=q, max_results=15, max_pages=2)
            total += count
        except Exception as e:
            print(f"⚠️  Kanoon scraper error for '{q}': {e}")

    # 2 — Supreme Court of India (PDF judgments)
    try:
        count = scrape_sci_judgments(max_results=10)
        total += count
    except Exception as e:
        print(f"⚠️  SCI scraper error: {e}")

    print(f"\n{'=' * 60}")
    print(f"📊 Total new judgments downloaded: {total}")
    print("=" * 60)


if __name__ == "__main__":
    main()

