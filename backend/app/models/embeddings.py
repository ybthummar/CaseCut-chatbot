"""
Embedding model wrapper.
Re-exports SentenceTransformer with a consistent interface.
Also contains: create_collection(), chunk_text(), process_and_upload()
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType
from sentence_transformers import SentenceTransformer
import os
import hashlib
import time
from dotenv import load_dotenv
from app.utils.parser import parse_document

load_dotenv()

DATA_RAW = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_KEY"),
    timeout=60,
)
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

COLLECTION = "legal_cases"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def create_collection():
    """Create Qdrant collection (run once)."""
    try:
        qdrant.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        print("✅ Collection created successfully!")
    except Exception as e:
        print(f"Collection exists or error: {e}")
    for field in ["topics", "court", "ipc_sections", "outcome"]:
        try:
            qdrant.create_payload_index(
                collection_name=COLLECTION,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
            print(f"   ✅ Index created: {field}")
        except Exception:
            pass


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def process_and_upload(pdf_dir: str = None):
    """Process all raw documents, embed, and upload to Qdrant with metadata."""
    if pdf_dir is None:
        pdf_dir = DATA_RAW

    if not os.path.exists(pdf_dir):
        os.makedirs(pdf_dir, exist_ok=True)
        print(f"Created {pdf_dir} — add PDFs/text files here")
        return

    files = [
        f for f in os.listdir(pdf_dir)
        if f.endswith((".pdf", ".txt")) and not f.startswith(".")
    ]
    if not files:
        print(f"⚠️  No documents found in {pdf_dir}")
        return

    print(f"📄 Processing {len(files)} documents for embedding...")
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
            chunks = chunks[:200]
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
                        },
                    )
                )

            total_chunks += len(chunks)
            sections = ", ".join(parsed.get("ipc_sections", [])[:3]) or "none"
            print(f"   ✅ {filename}: {len(chunks)} chunks | IPC: {sections}")

        except Exception as e:
            print(f"   ❌ Error processing {filename}: {e}")

    if points:
        batch_size = 50
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            for attempt in range(3):
                try:
                    qdrant.upsert(collection_name=COLLECTION, points=batch)
                    print(f"   📤 Uploaded batch {i // batch_size + 1} ({len(batch)} points)")
                    time.sleep(0.5)
                    break
                except Exception as e:
                    if attempt < 2:
                        print(f"   ⚠️  Batch {i // batch_size + 1} retry {attempt + 1}: {e}")
                        time.sleep(3 * (attempt + 1))
                    else:
                        print(f"   ❌ Batch {i // batch_size + 1} failed after 3 attempts: {e}")

        print(f"\n✅ Total: {len(points)} embeddings uploaded to Qdrant")
    else:
        print("⚠️  No valid chunks to upload")


if __name__ == "__main__":
    create_collection()
    process_and_upload()
