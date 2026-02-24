"""
Supreme Court of India PDF scraper.
"""

import requests
from bs4 import BeautifulSoup
import os
import hashlib
import json
import time
import re
from datetime import datetime

DATA_RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
HASH_FILE = os.path.join(DATA_RAW, ".downloaded_hashes.json")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


def _load_hashes():
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, "r") as f:
            return set(json.load(f))
    return set()


def _save_hashes(hashes):
    with open(HASH_FILE, "w") as f:
        json.dump(list(hashes), f)


def _url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def scrape_sci_judgments(max_results: int = 10) -> int:
    """Download PDF judgments from Supreme Court of India."""
    os.makedirs(DATA_RAW, exist_ok=True)
    downloaded_hashes = _load_hashes()
    new_count = 0
    base_url = "https://main.sci.gov.in"

    print(f"\n🔍 Checking Supreme Court of India...")
    try:
        resp = requests.get(f"{base_url}/judgments", headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        pdf_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.endswith(".pdf"):
                full_url = href if href.startswith("http") else base_url + href
                pdf_links.append((a.get_text(strip=True)[:60] or "sci_judgment", full_url))
            if len(pdf_links) >= max_results:
                break

        print(f"   Found {len(pdf_links)} PDF links")
        for title, pdf_url in pdf_links:
            h = _url_hash(pdf_url)
            if h in downloaded_hashes:
                continue
            try:
                time.sleep(1)
                pdf_resp = requests.get(pdf_url, headers=HEADERS, timeout=30)
                pdf_resp.raise_for_status()
                if b"%PDF" not in pdf_resp.content[:10]:
                    continue
                safe_name = re.sub(r"[^\w\s-]", "", title)[:60].strip().replace(" ", "_")
                filename = f"SCI_{safe_name}_{h[:8]}.pdf"
                with open(os.path.join(DATA_RAW, filename), "wb") as f:
                    f.write(pdf_resp.content)
                downloaded_hashes.add(h)
                new_count += 1
                print(f"   ✅ [{new_count}] {filename}")
            except Exception as e:
                print(f"   ❌ Error: {e}")
    except Exception as e:
        print(f"   ⚠️  SCI portal may be unavailable: {e}")

    _save_hashes(downloaded_hashes)
    print(f"📊 Downloaded {new_count} new PDFs from SCI")
    return new_count


if __name__ == "__main__":
    scrape_sci_judgments()
