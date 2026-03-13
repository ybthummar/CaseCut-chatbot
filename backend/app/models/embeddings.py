"""
Embedding model wrapper.
Re-exports SentenceTransformer with a consistent interface.
Also contains: create_collection(), chunk_text(), process_and_upload()

Uses centralized config from app.core.config.
"""

import os
import hashlib
import time
from typing import Optional

from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType

from app.core.config import qdrant_client, embedder, COLLECTION, CHUNK_SIZE, CHUNK_OVERLAP, logger
from app.utils.parser import parse_document

DATA_RAW = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")


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


def process_and_upload(pdf_dir: Optional[str] = None):
    """Process all raw documents, embed, and upload to Qdrant with metadata."""
    if pdf_dir is None:
        pdf_dir = DATA_RAW

    if not os.path.exists(pdf_dir):
        os.makedirs(pdf_dir, exist_ok=True)
        logger.info("Created %s — add PDFs/text files here", pdf_dir)
        return

    files = [
        f for f in os.listdir(pdf_dir)
        if f.endswith((".pdf", ".txt")) and not f.startswith(".")
    ]
    if not files:
        logger.warning("[WARN] No documents found in %s", pdf_dir)
        return

    logger.info("[INFO] Processing %d documents for embedding...", len(files))
    points = []
    total_chunks = 0

    for filename in files:
        filepath = os.path.join(pdf_dir, filename)
        try:
            parsed = parse_document(filepath)
            if parsed is None:
                continue

            all_chunks = chunk_text(parsed["full_text"])
            chunks = [(i, c) for i, c in enumerate(all_chunks) if len(c.strip()) >= 30]
            chunks = chunks[:500]  # up to 500 chunks per doc for full coverage
            if not chunks:
                continue

            texts = [c for _, c in chunks]
            vectors = embedder.encode(texts, batch_size=64, show_progress_bar=False)

            for (i, chunk), vector in zip(chunks, vectors):
                point_id = hashlib.md5(f"{filename}_{i}".encode()).hexdigest()[:16]
                points.append(
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

            total_chunks += len(chunks)
            sections = ", ".join(parsed.get("ipc_sections", [])[:3]) or "none"
            logger.info("   [OK] %s: %d chunks | IPC: %s", filename, len(chunks), sections)

        except Exception as e:
            logger.error("   [ERR] Error processing %s: %s", filename, e)

    if points:
        batch_size = 50
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            for attempt in range(3):
                try:
                    qdrant_client.upsert(collection_name=COLLECTION, points=batch)
                    logger.info("   [UPLOAD] Uploaded batch %d (%d points)", i // batch_size + 1, len(batch))
                    time.sleep(0.5)
                    break
                except Exception as e:
                    if attempt < 2:
                        logger.warning("   [WARN] Batch %d retry %d: %s", i // batch_size + 1, attempt + 1, e)
                        time.sleep(3 * (attempt + 1))
                    else:
                        logger.error("   [ERR] Batch %d failed after 3 attempts: %s", i // batch_size + 1, e)

        logger.info("[OK] Total: %d embeddings uploaded to Qdrant", len(points))
    else:
        logger.warning("[WARN] No valid chunks to upload")


if __name__ == "__main__":
    create_collection()
    process_and_upload()
