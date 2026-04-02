"""
Embedding model wrapper.
Re-exports SentenceTransformer with a consistent interface.
Also contains: create_collection(), chunk_text(), process_and_upload()

Uses centralized config from app.core.config.
"""

import hashlib
import os
import time
from typing import Optional

from qdrant_client.models import Distance, PayloadSchemaType, PointStruct, VectorParams

from app.core.config import CHUNK_OVERLAP, CHUNK_SIZE, COLLECTION, embedder, logger, qdrant_client
from app.utils.parser import parse_document

DATA_RAW = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")


def _get_existing_files_in_qdrant() -> set[str]:
    """Return unique payload file names already stored in Qdrant."""
    existing: set[str] = set()
    offset = None

    while True:
        points, offset = qdrant_client.scroll(
            collection_name=COLLECTION,
            limit=1000,
            with_payload=True,
            with_vectors=False,
            offset=offset,
        )
        if not points:
            break

        for point in points:
            payload = point.payload or {}
            filename = payload.get("file")
            if isinstance(filename, str) and filename:
                existing.add(filename)

        if offset is None:
            break

    return existing


def _upsert_with_retry(points: list[PointStruct], filename: str, batch_size: int = 50) -> int:
    """Upload vectors to Qdrant in batches with retries."""
    uploaded = 0
    total_batches = (len(points) + batch_size - 1) // batch_size

    for batch_no, start in enumerate(range(0, len(points), batch_size), start=1):
        batch = points[start : start + batch_size]

        for attempt in range(1, 4):
            try:
                qdrant_client.upsert(collection_name=COLLECTION, points=batch)
                uploaded += len(batch)
                logger.info(
                    "   [UPLOAD] %s | batch %d/%d | %d points",
                    filename,
                    batch_no,
                    total_batches,
                    len(batch),
                )
                time.sleep(0.1)
                break
            except Exception as e:
                if attempt < 3:
                    logger.warning(
                        "   [WARN] %s | batch %d retry %d: %s",
                        filename,
                        batch_no,
                        attempt,
                        e,
                    )
                    time.sleep(2 * attempt)
                else:
                    raise RuntimeError(
                        f"Upload failed for {filename} batch {batch_no}/{total_batches}: {e}"
                    ) from e

    return uploaded


def create_collection():
    """Create Qdrant collection (run once)."""
    try:
        qdrant_client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        logger.info("[OK] Collection created successfully!")
    except Exception as e:
        logger.info("Collection exists or error: %s", e)

    for field in ["topics", "court", "ipc_sections", "outcome"]:
        try:
            qdrant_client.create_payload_index(
                collection_name=COLLECTION,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
            logger.info("   [OK] Index created: %s", field)
        except Exception:
            pass


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    """
    Split text into overlapping chunks.

    Args:
        text:       input text
        chunk_size: number of characters per chunk (default 500)
        overlap:    overlap between chunks (default 100)

    Returns:
        List of text chunks.
    """
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        step = chunk_size - overlap
        if step <= 0:
            step = chunk_size  # prevent infinite loop
        start += step
    return chunks


def process_and_upload(pdf_dir: Optional[str] = None, skip_existing: bool = True) -> dict:
    """
    Process raw documents, embed, and upload to Qdrant with metadata.

    Args:
        pdf_dir: Folder containing .pdf/.txt files.
        skip_existing: If True, skip files already present in Qdrant payloads.

    Returns:
        Summary dict with processing statistics.
    """
    if pdf_dir is None:
        pdf_dir = DATA_RAW

    if not os.path.exists(pdf_dir):
        os.makedirs(pdf_dir, exist_ok=True)
        logger.info("Created %s - add PDFs/text files here", pdf_dir)
        return {
            "raw_total": 0,
            "to_process": 0,
            "skipped_existing": 0,
            "processed_docs": 0,
            "failed_docs": 0,
            "uploaded_points": 0,
            "skipped_parse": 0,
            "skipped_empty_chunks": 0,
        }

    files = [
        f for f in os.listdir(pdf_dir) if f.endswith((".pdf", ".txt")) and not f.startswith(".")
    ]
    if not files:
        logger.warning("[WARN] No documents found in %s", pdf_dir)
        return {
            "raw_total": 0,
            "to_process": 0,
            "skipped_existing": 0,
            "processed_docs": 0,
            "failed_docs": 0,
            "uploaded_points": 0,
            "skipped_parse": 0,
            "skipped_empty_chunks": 0,
        }

    files = sorted(files)
    raw_total = len(files)

    existing_files: set[str] = set()
    if skip_existing:
        try:
            existing_files = _get_existing_files_in_qdrant()
            logger.info("[INFO] Existing files in Qdrant: %d", len(existing_files))
        except Exception as e:
            logger.warning("[WARN] Could not fetch existing files from Qdrant: %s", e)

    files_to_process = [f for f in files if f not in existing_files] if skip_existing else files
    skipped_existing = raw_total - len(files_to_process)

    logger.info(
        "[INFO] Raw docs=%d | to process=%d | skipped existing=%d",
        raw_total,
        len(files_to_process),
        skipped_existing,
    )

    if not files_to_process:
        logger.info("[DONE] No new documents to upload.")
        return {
            "raw_total": raw_total,
            "to_process": 0,
            "skipped_existing": skipped_existing,
            "processed_docs": 0,
            "failed_docs": 0,
            "uploaded_points": 0,
            "skipped_parse": 0,
            "skipped_empty_chunks": 0,
        }

    processed_docs = 0
    failed_docs = 0
    uploaded_points = 0
    skipped_parse = 0
    skipped_empty_chunks = 0

    for idx, filename in enumerate(files_to_process, start=1):
        filepath = os.path.join(pdf_dir, filename)
        try:
            parsed = parse_document(filepath)
            if parsed is None:
                skipped_parse += 1
                logger.warning(
                    "   [SKIP] %s (%d/%d): parser returned empty/short text",
                    filename,
                    idx,
                    len(files_to_process),
                )
                continue

            all_chunks = chunk_text(parsed["full_text"])
            chunks = [(i, c) for i, c in enumerate(all_chunks) if len(c.strip()) >= 30]
            chunks = chunks[:500]  # up to 500 chunks per doc for full coverage
            if not chunks:
                skipped_empty_chunks += 1
                logger.warning("   [SKIP] %s (%d/%d): no valid chunks", filename, idx, len(files_to_process))
                continue

            texts = [c for _, c in chunks]
            vectors = embedder.encode(texts, batch_size=64, show_progress_bar=False)

            doc_points: list[PointStruct] = []
            for (i, chunk), vector in zip(chunks, vectors):
                point_id = hashlib.md5(f"{filename}_{i}".encode()).hexdigest()[:16]
                doc_points.append(
                    PointStruct(
                        id=int(point_id, 16) % (2**63),
                        vector=vector.tolist(),
                        payload={
                            "text": chunk,
                            "file": filename,
                            "chunk_id": i,
                            "court": parsed.get("court", "Unknown"),
                            "date": parsed.get("date", ""),
                            "ipc_sections": parsed.get("ipc_sections", []),
                            "topics": parsed.get("topics", []),
                            "outcome": parsed.get("outcome", "unknown"),
                            "doc_id": parsed.get("id", ""),
                            "source_url": parsed.get("source_url", ""),
                        },
                    )
                )

            sections = ", ".join(parsed.get("ipc_sections", [])[:3]) or "none"
            logger.info(
                "   [OK] %s (%d/%d): %d chunks | IPC: %s",
                filename,
                idx,
                len(files_to_process),
                len(chunks),
                sections,
            )

            uploaded_points += _upsert_with_retry(doc_points, filename, batch_size=50)
            processed_docs += 1

        except Exception as e:
            failed_docs += 1
            logger.error("   [ERR] Error processing %s: %s", filename, e)

    if uploaded_points == 0:
        logger.warning("[WARN] No valid chunks to upload")
    else:
        logger.info("[OK] Total: %d embeddings uploaded to Qdrant", uploaded_points)

    summary = {
        "raw_total": raw_total,
        "to_process": len(files_to_process),
        "skipped_existing": skipped_existing,
        "processed_docs": processed_docs,
        "failed_docs": failed_docs,
        "uploaded_points": uploaded_points,
        "skipped_parse": skipped_parse,
        "skipped_empty_chunks": skipped_empty_chunks,
    }
    logger.info("[DONE] %s", summary)
    return summary


if __name__ == "__main__":
    create_collection()
    process_and_upload()
