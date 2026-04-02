"""Upload processed case JSON files to Qdrant using a stronger embedding model.

Behavior:
- Reads case metadata JSON files from data/processed/
- Builds one semantic embedding per case
- Processes 10 case files at a time
- Upserts each 10-case batch to Qdrant
- Skips cases already present (by case_id) for safe reruns
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import warnings
from pathlib import Path

from dotenv import dotenv_values
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PayloadSchemaType, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer

warnings.filterwarnings("ignore", category=FutureWarning, module=r"google\.api_core\._python_version_support")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("processed_uploader")

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = BASE_DIR / "data" / "processed"

EMBED_MODEL = os.getenv("PROCESSED_EMBED_MODEL", "Qwen/Qwen3-Embedding-0.6B")
TARGET_COLLECTION = os.getenv("PROCESSED_QDRANT_COLLECTION", "legal_cases_sota_processed")
DOC_BATCH_SIZE = int(os.getenv("PROCESSED_DOC_BATCH_SIZE", "10"))
EMBED_BATCH_SIZE = int(os.getenv("PROCESSED_EMBED_BATCH_SIZE", "16"))
MAX_FACTS_CHARS = int(os.getenv("PROCESSED_MAX_FACTS_CHARS", "500"))


def _get_qdrant_client() -> QdrantClient:
    env = dotenv_values(str(BASE_DIR / ".env"))
    url = env.get("QDRANT_URL") or os.getenv("QDRANT_URL")
    key = env.get("QDRANT_KEY") or os.getenv("QDRANT_KEY")
    if not url:
        raise RuntimeError("QDRANT_URL is missing in backend/.env")
    return QdrantClient(url=url, api_key=key, timeout=120)


def _load_model(model_id: str) -> SentenceTransformer:
    logger.info("Loading embedding model: %s", model_id)
    try:
        return SentenceTransformer(model_id, local_files_only=True)
    except Exception:
        logger.info("Model not found locally, downloading: %s", model_id)
        return SentenceTransformer(model_id)


def _ensure_collection(client: QdrantClient, collection: str, vector_size: int) -> None:
    collections = {c.name for c in client.get_collections().collections}
    if collection not in collections:
        client.create_collection(
            collection_name=collection,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        logger.info("Created collection '%s' (dim=%d)", collection, vector_size)

    for field in ["source_type", "case_id", "filename", "court", "topics", "ipc_sections", "outcome"]:
        try:
            client.create_payload_index(
                collection_name=collection,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass


def _get_existing_case_ids(client: QdrantClient, collection: str) -> set[str]:
    existing: set[str] = set()
    offset = None

    while True:
        points, offset = client.scroll(
            collection_name=collection,
            limit=1000,
            with_payload=True,
            with_vectors=False,
            offset=offset,
        )
        if not points:
            break

        for point in points:
            payload = point.payload or {}
            case_id = payload.get("case_id")
            if isinstance(case_id, str) and case_id:
                existing.add(case_id)

        if offset is None:
            break

    return existing


def _build_case_text(case: dict) -> str:
    ipc = ", ".join(case.get("ipc_sections", [])[:20]) or "none"
    topics = ", ".join(case.get("topics", [])[:20]) or "none"
    facts = (case.get("facts") or "").strip()
    if len(facts) > MAX_FACTS_CHARS:
        facts = facts[:MAX_FACTS_CHARS]

    parts = [
        f"Case ID: {case.get('id', '')}",
        f"File: {case.get('filename', '')}",
        f"Court: {case.get('court', 'Unknown')}",
        f"Date: {case.get('date', '')}",
        f"Outcome: {case.get('outcome', 'unknown')}",
        f"IPC Sections: {ipc}",
        f"Topics: {topics}",
        "Facts:",
        facts,
    ]
    return "\n".join(parts).strip()


def _point_id(case_id: str, model_id: str) -> int:
    digest = hashlib.sha256(f"{case_id}|{model_id}|processed".encode("utf-8")).hexdigest()[:16]
    return int(digest, 16) % (2**63)


def _iter_batches(items: list[Path], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def run() -> dict:
    if not PROCESSED_DIR.exists():
        raise RuntimeError(f"Processed directory not found: {PROCESSED_DIR}")

    client = _get_qdrant_client()
    model = _load_model(EMBED_MODEL)

    probe_vec = model.encode(["legal case embedding probe"], show_progress_bar=False)
    vector_dim = len(probe_vec[0])
    logger.info("Embedding dimension: %d", vector_dim)

    _ensure_collection(client, TARGET_COLLECTION, vector_dim)

    existing_case_ids = _get_existing_case_ids(client, TARGET_COLLECTION)
    logger.info("Existing cases in target collection: %d", len(existing_case_ids))

    files = sorted(PROCESSED_DIR.glob("*.json"))
    total_files = len(files)
    to_process = []

    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        case_id = str(data.get("id", "")).strip()
        if not case_id:
            continue
        if case_id in existing_case_ids:
            continue
        to_process.append(path)

    logger.info("Processed files total=%d | pending=%d | skipped(existing)=%d", total_files, len(to_process), total_files - len(to_process))

    uploaded_points = 0
    uploaded_cases = 0
    failed_cases = 0

    for batch_index, batch_files in enumerate(_iter_batches(to_process, DOC_BATCH_SIZE), start=1):
        batch_cases = []
        texts = []

        for path in batch_files:
            try:
                case = json.loads(path.read_text(encoding="utf-8"))
                case_id = str(case.get("id", "")).strip()
                if not case_id:
                    failed_cases += 1
                    continue
                case_text = _build_case_text(case)
                if not case_text:
                    failed_cases += 1
                    continue
                batch_cases.append(case)
                texts.append(case_text)
            except Exception as e:
                failed_cases += 1
                logger.warning("[SKIP] %s parse error: %s", path.name, e)

        if not batch_cases:
            continue

        encode_kwargs = {"batch_size": EMBED_BATCH_SIZE, "show_progress_bar": False}
        try:
            prompts = getattr(model, "prompts", {}) or {}
            if isinstance(prompts, dict):
                if "document" in prompts:
                    encode_kwargs["prompt_name"] = "document"
                elif "passage" in prompts:
                    encode_kwargs["prompt_name"] = "passage"
        except Exception:
            pass

        vectors = model.encode(texts, **encode_kwargs)

        points: list[PointStruct] = []
        for case, vector in zip(batch_cases, vectors):
            case_id = str(case.get("id", "")).strip()
            payload = {
                "source_type": "processed_json",
                "case_id": case_id,
                "filename": case.get("filename", ""),
                "court": case.get("court", "Unknown"),
                "date": case.get("date", ""),
                "ipc_sections": case.get("ipc_sections", []),
                "topics": case.get("topics", []),
                "outcome": case.get("outcome", "unknown"),
                "facts": (case.get("facts") or "")[:MAX_FACTS_CHARS],
                "page_count": case.get("page_count", 0),
                "text_length": case.get("text_length", 0),
                "source_url": case.get("source_url", ""),
                "embed_model": EMBED_MODEL,
            }
            points.append(
                PointStruct(
                    id=_point_id(case_id, EMBED_MODEL),
                    vector=vector.tolist(),
                    payload=payload,
                )
            )

        client.upsert(collection_name=TARGET_COLLECTION, points=points)
        uploaded_points += len(points)
        uploaded_cases += len(points)
        logger.info(
            "[BATCH %d] Uploaded %d cases (running total=%d)",
            batch_index,
            len(points),
            uploaded_cases,
        )

    total_points = client.count(collection_name=TARGET_COLLECTION, exact=True).count
    summary = {
        "collection": TARGET_COLLECTION,
        "model": EMBED_MODEL,
        "total_processed_files": total_files,
        "new_cases_uploaded": uploaded_cases,
        "new_points_uploaded": uploaded_points,
        "failed_cases": failed_cases,
        "collection_points_after_run": total_points,
    }
    logger.info("SUMMARY %s", summary)
    return summary


if __name__ == "__main__":
    result = run()
    print(result)
