"""
Re-index newly scraped documents into Qdrant.
Reads every *.txt and *.pdf in data/raw/, parses them,
and uploads embeddings that aren't already in the collection.
"""

import os
import sys

# Ensure the backend root is on the path so imports resolve.
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

from app.models.embeddings import process_and_upload  # noqa: E402


def main():
    raw_dir = os.path.join(BACKEND_DIR, "data", "raw")
    if not os.path.isdir(raw_dir):
        print("⚠️  data/raw/ not found — nothing to index.")
        return

    files = [
        os.path.join(raw_dir, f)
        for f in os.listdir(raw_dir)
        if f.endswith((".txt", ".pdf")) and not f.startswith(".")
    ]
    if not files:
        print("📂 No new files in data/raw/")
        return

    print(f"📥 Found {len(files)} file(s) in data/raw/")
    process_and_upload(raw_dir)
    print("🏁 Re-indexing complete.")


if __name__ == "__main__":
    main()
