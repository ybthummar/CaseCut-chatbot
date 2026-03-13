"""
Mass scraper — downloads 2000+ legal judgments from Indian Kanoon,
processes full documents (parse + embed), and indexes into Qdrant.

Usage:
    cd backend
    python mass_scrape.py

The script uses ~100 diverse legal search queries across:
  - IPC sections (murder, theft, fraud, kidnapping, etc.)
  - Court types (Supreme Court, High Courts)
  - Legal topics (bail, constitutional, family, property, cyber)
  - Specific statutes (NDPS, POCSO, IT Act, etc.)

Each query fetches up to 30 results across 3 pages → ~3000 potential cases.
Deduplication ensures no duplicates.
"""

import sys
import os
import shutil
import time

# Ensure the backend directory is on the path
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, BACKEND_DIR)

from scrapers.kanoon_scraper import scrape_indian_kanoon
from scrapers.ecourts_scraper import scrape_sci_judgments

# Paths
BACKEND_RAW = os.path.join(BACKEND_DIR, "data", "raw")
TOP_LEVEL_RAW = os.path.join(BACKEND_DIR, "..", "data", "raw")

# ── Comprehensive search queries for 2000+ cases ────────────────────

QUERIES = [
    # ── IPC Major Crimes ──
    "Supreme Court murder Section 302",
    "High Court murder conviction",
    "murder case judgment India",
    "culpable homicide Section 304",
    "dowry death Section 304B",
    "Section 302 IPC death sentence",
    "murder appeal Supreme Court",
    "Section 307 attempt to murder",
    "murder acquittal insufficient evidence",
    "honor killing judgment India",

    # ── Theft / Robbery / Dacoity ──
    "theft Section 378 IPC judgment",
    "robbery Section 392 IPC",
    "dacoity Section 395 IPC",
    "robbery with murder judgment",
    "armed robbery conviction",
    "house breaking theft Section 457",
    "extortion Section 384 IPC",

    # ── Fraud / Cheating ──
    "cheating Section 420 IPC",
    "criminal breach of trust Section 406",
    "forgery Section 463 IPC",
    "fraud bank loan judgment",
    "financial fraud Supreme Court",
    "cyber fraud judgment India",
    "investment fraud conviction",
    "insurance fraud case",

    # ── Bail Cases ──
    "anticipatory bail Supreme Court",
    "regular bail High Court",
    "bail murder case India",
    "bail NDPS Act",
    "bail conditions Supreme Court",
    "interim bail judgment",
    "bail cancellation judgment",
    "bail juvenile case",
    "bail sexual assault case",
    "bail economic offence",

    # ── Constitutional Law ──
    "fundamental rights Article 21",
    "Article 14 equality before law",
    "Article 19 freedom of speech",
    "Article 32 writ petition Supreme Court",
    "habeas corpus judgment",
    "writ of mandamus High Court",
    "right to privacy Supreme Court",
    "right to life and liberty judgment",
    "constitutional validity challenge",
    "PIL public interest litigation Supreme Court",

    # ── Family Law ──
    "divorce Hindu Marriage Act",
    "maintenance Section 125 CrPC",
    "child custody judgment India",
    "domestic violence Protection Act",
    "dowry prohibition judgment",
    "mutual consent divorce",
    "cruelty ground divorce",
    "alimony maintenance judgment",
    "guardianship minor child",
    "restitution of conjugal rights",

    # ── Property / Land ──
    "property dispute Supreme Court",
    "land acquisition compensation",
    "specific performance contract",
    "eviction tenant judgment",
    "partition suit property",
    "adverse possession judgment",
    "title dispute land",
    "transfer of property judgment",
    "encroachment public land",
    "succession property Hindu law",

    # ── Sexual Offences / POCSO ──
    "rape Section 376 IPC judgment",
    "POCSO Act conviction",
    "sexual harassment workplace",
    "molestation Section 354",
    "stalking Section 354D",
    "sexual assault minor POCSO",
    "rape acquittal judgment",
    "gang rape conviction",

    # ── Drug Cases (NDPS) ──
    "NDPS Act conviction",
    "drug trafficking judgment India",
    "narcotic substance Section 21 NDPS",
    "commercial quantity NDPS",
    "small quantity drugs bail",

    # ── Cyber Crime ──
    "IT Act Section 66 cyber crime",
    "online fraud Information Technology Act",
    "data theft cyber judgment",
    "social media defamation",
    "cyber stalking judgment",

    # ── Contract / Commercial ──
    "breach of contract damages",
    "contract specific performance",
    "arbitration award challenge",
    "negotiable instruments Section 138",
    "cheque bounce NI Act",
    "partnership dissolution",
    "company law oppression mismanagement",

    # ── Criminal Procedure ──
    "quashing FIR Section 482 CrPC",
    "charge sheet filing judgment",
    "investigation CBI order",
    "stay of criminal proceedings",
    "plea bargaining judgment",
    "compounding of offences",
    "criminal appeal sentencing",

    # ── Labour / Employment ──
    "wrongful termination labor court",
    "industrial dispute judgment",
    "gratuity payment judgment",
    "workman compensation case",
    "sexual harassment POSH Act",

    # ── Motor Accident ──
    "motor accident compensation tribunal",
    "hit and run compensation",
    "death motor vehicle accident claim",
    "permanent disability accident compensation",

    # ── Kidnapping / Abduction ──
    "kidnapping Section 363 IPC",
    "abduction for ransom Section 364A",
    "missing person habeas corpus",

    # ── Defamation / Media ──
    "criminal defamation Section 499",
    "defamation suit media",
    "contempt of court judgment",

    # ── Environment ──
    "environment pollution NGT judgment",
    "forest land encroachment",
    "industrial pollution compensation",

    # ── Miscellaneous Criminal ──
    "rioting Section 147 IPC",
    "criminal conspiracy Section 120B",
    "abetment suicide Section 306",
    "cruelty by husband Section 498A",
    "obscenity Section 292 IPC",
    "sedition Section 124A",
    "corruption Prevention of Corruption Act",
    "money laundering PMLA judgment",
    "arms act illegal possession",
    "SC ST Atrocities Act judgment",
]


def consolidate_data():
    """Copy any existing raw files from top-level data/raw into backend/data/raw."""
    os.makedirs(BACKEND_RAW, exist_ok=True)
    if not os.path.exists(TOP_LEVEL_RAW):
        return 0
    copied = 0
    for f in os.listdir(TOP_LEVEL_RAW):
        if f.startswith("."):
            continue
        src = os.path.join(TOP_LEVEL_RAW, f)
        dst = os.path.join(BACKEND_RAW, f)
        if os.path.isfile(src) and not os.path.exists(dst):
            shutil.copy2(src, dst)
            copied += 1
    return copied


def main():
    print("=" * 70)
    print("  CaseCut MASS Legal Judgment Scraper + Full Document Processor")
    print(f"   Queries: {len(QUERIES)}")
    print(f"   Target : 2000+ cases")
    print("=" * 70)

    # ── Step 0: Consolidate existing data ──
    print("\n[Step 0] Consolidating existing raw data...")
    copied = consolidate_data()
    if copied:
        print(f"   Copied {copied} existing files from top-level data/raw")

    total = 0
    failed_queries = []

    # ── Step 1: Indian Kanoon (text judgments — bulk) ──
    print(f"\n{'=' * 70}")
    print("[Step 1] Scraping Indian Kanoon judgments...")
    print(f"{'=' * 70}")
    for i, query in enumerate(QUERIES, 1):
        print(f"\n{'-' * 60}")
        print(f"[{i}/{len(QUERIES)}] {query}")
        print(f"{'-' * 60}")
        try:
            count = scrape_indian_kanoon(
                query=query,
                max_results=30,   # up to 30 per query
                max_pages=3,      # 3 pages of results
            )
            total += count
            print(f"   Running total: {total} new judgments")
        except Exception as e:
            print(f"   WARNING: Query failed: {e}")
            failed_queries.append(query)

        # Polite delay between queries
        time.sleep(3)

    # -- Step 2: Supreme Court PDF judgments --
    print(f"\n{'-' * 60}")
    print("[Step 2] Scraping Supreme Court PDF judgments...")
    print(f"{'-' * 60}")
    try:
        count = scrape_sci_judgments(max_results=50)
        total += count
    except Exception as e:
        print(f"   WARNING: SCI scraper error: {e}")

    # ── Step 3: Process all raw documents (full text parsing) ──
    print(f"\n{'=' * 70}")
    print("[Step 3] Processing ALL raw documents (full text parsing)...")
    print(f"{'=' * 70}")
    try:
        from app.utils.parser import process_all
        results = process_all()
        print(f"   Parsed {len(results)} documents with full text + metadata")
    except Exception as e:
        print(f"   ERROR: Parsing failed: {e}")
        import traceback
        traceback.print_exc()

    # Count total raw files
    raw_count = len([f for f in os.listdir(BACKEND_RAW) if f.endswith(('.pdf', '.txt'))])

    # ── Step 4: Embed and upload ALL documents to Qdrant ──
    print(f"\n{'=' * 70}")
    print(f"[Step 4] Embedding & uploading {raw_count} documents to Qdrant...")
    print(f"{'=' * 70}")
    try:
        from app.models.embeddings import create_collection, process_and_upload
        create_collection()
        process_and_upload()
        print("   Embedding and upload complete!")
    except Exception as e:
        print(f"   ERROR: Embedding/upload failed: {e}")
        import traceback
        traceback.print_exc()
        print("   You can retry later with:")
        print('   python -c "from app.models.embeddings import create_collection, process_and_upload; create_collection(); process_and_upload()"')

    # ── Summary ──
    print(f"\n{'=' * 70}")
    print(f"  PIPELINE COMPLETE")
    print(f"   New judgments scraped : {total}")
    print(f"   Total raw files      : {raw_count}")
    if failed_queries:
        print(f"   Failed queries       : {len(failed_queries)}")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
