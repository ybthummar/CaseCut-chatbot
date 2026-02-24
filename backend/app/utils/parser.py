"""
PDF / Text parser — extracts structured metadata from raw legal judgments.
(Canonical location: app/utils/parser.py)
"""

import fitz  # PyMuPDF
import re
import os
import json
import hashlib
from datetime import datetime

DATA_RAW = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
DATA_PROCESSED = os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed")

IPC_PATTERN = re.compile(
    r"[Ss]ection\s+(\d+[A-Z]?)\s+(?:of\s+)?(?:the\s+)?"
    r"(?:Indian\s+Penal\s+Code|I\.?P\.?C\.?|Bharatiya Nyaya Sanhita|BNS)",
    re.IGNORECASE,
)

TOPIC_KEYWORDS = {
    "bail": ["bail", "anticipatory bail", "regular bail", "interim bail"],
    "murder": ["murder", "homicide", "culpable homicide", "section 302", "section 304"],
    "theft": ["theft", "robbery", "dacoity", "section 378", "section 379"],
    "fraud": ["fraud", "cheating", "section 420", "forgery", "misrepresentation"],
    "cyber": ["cyber", "information technology", "IT Act", "data theft", "hacking"],
    "contract": ["contract", "breach of contract", "specific performance", "agreement"],
    "property": ["property", "land dispute", "eviction", "tenancy", "possession"],
    "constitutional": ["fundamental rights", "article 14", "article 19", "article 21", "writ petition"],
    "family": ["divorce", "maintenance", "custody", "domestic violence", "dowry"],
    "defamation": ["defamation", "libel", "slander", "section 499", "section 500"],
}


def extract_text_from_file(filepath: str) -> str:
    if filepath.endswith(".pdf"):
        try:
            doc = fitz.open(filepath)
            text = "\n".join([page.get_text() for page in doc])
            doc.close()
            return text
        except Exception as e:
            print(f"   ❌ PDF error: {e}")
            return ""
    elif filepath.endswith(".txt"):
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    return ""


def extract_ipc_sections(text: str) -> list:
    matches = IPC_PATTERN.findall(text)
    standalone = re.findall(r"[Ss]ection\s+(\d+[A-Z]?)", text)
    return sorted(set(matches + standalone))[:20]


def detect_topics(text: str) -> list:
    text_lower = text.lower()
    return [t for t, kws in TOPIC_KEYWORDS.items() if any(k in text_lower for k in kws)]


def extract_court(text: str) -> str:
    upper = text[:2000].upper()
    if "SUPREME COURT" in upper:
        return "Supreme Court of India"
    hc = re.search(r"HIGH COURT OF ([A-Z\s]+)", upper)
    if hc:
        return f"High Court of {hc.group(1).strip().title()}"
    if "DISTRICT COURT" in upper:
        return "District Court"
    if "SESSIONS COURT" in upper:
        return "Sessions Court"
    return "Unknown"


def extract_date(text: str) -> str:
    patterns = [
        r"(?:dated|decided|pronounced)\s*(?:on)?\s*[:.]?\s*(\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4})",
        r"(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*\d{4})",
    ]
    for pat in patterns:
        m = re.search(pat, text[:3000], re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ""


def extract_outcome(text: str) -> str:
    lower = text[-3000:].lower()
    if any(w in lower for w in ["appeal is allowed", "petition allowed", "conviction set aside"]):
        return "allowed"
    if any(w in lower for w in ["appeal is dismissed", "petition dismissed", "appeal dismissed"]):
        return "dismissed"
    if any(w in lower for w in ["bail granted", "bail is granted"]):
        return "bail_granted"
    if any(w in lower for w in ["bail rejected", "bail refused"]):
        return "bail_rejected"
    if "convicted" in lower:
        return "convicted"
    if "acquitted" in lower:
        return "acquitted"
    return "unknown"


def extract_facts_summary(text: str) -> str:
    facts_match = re.search(
        r"(?:FACTS|Brief Facts|Factual Background)[:\s]*\n(.+?)(?:\n\s*\n|\n[A-Z]{3,})",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if facts_match and len(facts_match.group(1)) > 100:
        return facts_match.group(1).strip()[:2000]

    lines = text.split("\n")
    content_lines, started = [], False
    for line in lines:
        stripped = line.strip()
        if not started and len(stripped) > 80:
            started = True
        if started:
            content_lines.append(stripped)
        if len("\n".join(content_lines)) > 2000:
            break
    return "\n".join(content_lines)[:2000]


def parse_document(filepath: str) -> dict | None:
    text = extract_text_from_file(filepath)
    if not text or len(text) < 100:
        return None

    filename = os.path.basename(filepath)
    doc_hash = hashlib.md5(text[:5000].encode()).hexdigest()[:12]

    return {
        "id": doc_hash,
        "filename": filename,
        "court": extract_court(text),
        "date": extract_date(text),
        "ipc_sections": extract_ipc_sections(text),
        "topics": detect_topics(text),
        "outcome": extract_outcome(text),
        "facts": extract_facts_summary(text),
        "full_text": text,
        "text_length": len(text),
        "parsed_at": datetime.now().isoformat(),
    }


def process_all():
    os.makedirs(DATA_PROCESSED, exist_ok=True)
    if not os.path.exists(DATA_RAW):
        print(f"❌ No raw data directory: {DATA_RAW}")
        return []

    files = [f for f in os.listdir(DATA_RAW) if f.endswith((".pdf", ".txt")) and not f.startswith(".")]
    if not files:
        print(f"⚠️  No documents in {DATA_RAW}")
        return []

    print(f"📄 Processing {len(files)} documents...")
    results = []
    for filename in files:
        filepath = os.path.join(DATA_RAW, filename)
        try:
            parsed = parse_document(filepath)
            if parsed is None:
                print(f"   ⏭️  Skipping {filename} (too short)")
                continue

            json_name = f"case_{parsed['id']}.json"
            json_path = os.path.join(DATA_PROCESSED, json_name)
            json_data = {k: v for k, v in parsed.items() if k != "full_text"}
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)

            results.append(parsed)
            sections_str = ", ".join(parsed["ipc_sections"][:5]) if parsed["ipc_sections"] else "none"
            print(f"   ✅ {filename} → {json_name} | Court: {parsed['court']} | IPC: {sections_str}")
        except Exception as e:
            print(f"   ❌ Error processing {filename}: {e}")

    print(f"\n📊 Processed {len(results)}/{len(files)} documents")
    return results


if __name__ == "__main__":
    process_all()
