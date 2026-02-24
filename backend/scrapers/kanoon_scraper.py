"""
Indian Kanoon web scraper — downloads judgment HTML as .txt files.
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


def scrape_indian_kanoon(query: str = "Supreme Court", max_results: int = 20) -> int:
    """Search Indian Kanoon and download judgment text."""
    os.makedirs(DATA_RAW, exist_ok=True)
    downloaded_hashes = _load_hashes()
    new_count = 0

    search_url = f"https://indiankanoon.org/search/?formInput={requests.utils.quote(query)}"
    print(f"🔍 Searching Indian Kanoon: {query}")

    try:
        resp = requests.get(search_url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        result_links = []
        for a in soup.select("a[href*='/doc/']"):
            href = a.get("href", "")
            if "/doc/" in href and href not in [l[1] for l in result_links]:
                title = a.get_text(strip=True)[:80] or "judgment"
                full_url = "https://indiankanoon.org" + href if href.startswith("/") else href
                result_links.append((title, full_url))
            if len(result_links) >= max_results:
                break

        print(f"   Found {len(result_links)} judgment links")

        for title, doc_url in result_links:
            h = _url_hash(doc_url)
            if h in downloaded_hashes:
                continue
            try:
                time.sleep(1.5)
                doc_resp = requests.get(doc_url, headers=HEADERS, timeout=15)
                doc_resp.raise_for_status()
                doc_soup = BeautifulSoup(doc_resp.text, "html.parser")

                judgment_div = (
                    doc_soup.find("div", class_="judgments")
                    or doc_soup.find("div", class_="doc_bench")
                    or doc_soup.find("div", id="maincontent")
                    or doc_soup
                )
                text = judgment_div.get_text(separator="\n", strip=True)
                if len(text) < 200:
                    continue

                safe_name = re.sub(r"[^\w\s-]", "", title)[:60].strip().replace(" ", "_")
                filename = f"{safe_name}_{h[:8]}.txt"
                filepath = os.path.join(DATA_RAW, filename)

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(f"SOURCE: {doc_url}\n")
                    f.write(f"SCRAPED: {datetime.now().isoformat()}\n")
                    f.write(f"TITLE: {title}\n")
                    f.write("=" * 80 + "\n\n")
                    f.write(text)

                downloaded_hashes.add(h)
                new_count += 1
                print(f"   ✅ [{new_count}] {filename}")
            except Exception as e:
                print(f"   ❌ Error downloading {doc_url}: {e}")
    except Exception as e:
        print(f"❌ Search error: {e}")

    _save_hashes(downloaded_hashes)
    print(f"📊 Downloaded {new_count} new judgments from Indian Kanoon")
    return new_count
