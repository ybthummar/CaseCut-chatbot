"""
Ingest a single PDF into Qdrant.

Usage:
    python backend/cronjobs/ingest_pdf.py --pdf "C:\\path\\to\\file.pdf"

This script:
1) Optionally copies the PDF into backend/data/raw for traceability.
2) Embeds only that PDF (not all files) by using an isolated temp directory.
3) Upserts vectors to the configured Qdrant collection.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.models.embeddings import create_collection, process_and_upload  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest one PDF into Qdrant")
    parser.add_argument("--pdf", required=True, help="Absolute or relative path to the PDF file")
    parser.add_argument(
        "--no-copy",
        action="store_true",
        help="Do not copy the PDF into backend/data/raw before ingestion",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pdf_path = Path(args.pdf).expanduser().resolve()

    if not pdf_path.exists() or not pdf_path.is_file():
        print(f"[ERR] PDF not found: {pdf_path}")
        return 1

    if pdf_path.suffix.lower() != ".pdf":
        print(f"[ERR] Not a PDF file: {pdf_path}")
        return 1

    raw_dir = BACKEND_DIR / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    working_pdf = pdf_path
    if not args.no_copy:
        destination = raw_dir / pdf_path.name
        shutil.copy2(pdf_path, destination)
        working_pdf = destination
        print(f"[INFO] Copied PDF to: {destination}")

    create_collection()

    with tempfile.TemporaryDirectory(prefix="single_pdf_ingest_") as temp_dir:
        temp_pdf = Path(temp_dir) / working_pdf.name
        shutil.copy2(working_pdf, temp_pdf)
        print(f"[INFO] Processing PDF: {temp_pdf.name}")
        process_and_upload(str(Path(temp_dir)))

    print("[DONE] PDF embedding + Qdrant upsert completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
