"""
Automated unit tests for CaseCut Chatbot bug fixes.
"""

import sys
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import rag_service
from app.services.book_service import search_books, _GOOGLE_LOCK


class TestBugFixes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_fix_1_rag_similarity_score_mapping(self):
        """Test that each case gets its own individual similarity score."""
        mock_scored_points = [
            MagicMock(id="case_1", score=0.85, payload={"text": "Text 1", "court": "Supreme Court"}),
            MagicMock(id="case_2", score=0.62, payload={"text": "Text 2", "court": "High Court"}),
            MagicMock(id="case_3", score=0.41, payload={"text": "Text 3", "court": "District Court"}),
        ]

        with patch("app.services.qdrant_service.search", return_value=mock_scored_points), \
             patch("app.services.qdrant_service.embed_query", return_value=[0.1] * 384), \
             patch("app.services.llm_service.generate", return_value=("Test Summary", "mock", 100)), \
             patch("app.services.llm_service.enforce_output_language", side_effect=lambda text, lang: (text, False)):

            res = rag_service.run_query("murder", k=3)
            cases = res["cases"]

            self.assertEqual(len(cases), 3)
            # Verify each case preserved its individual similarity score (not hardcoded to sim_scores[0])
            self.assertEqual(cases[0]["similarity"], 0.85)
            self.assertEqual(cases[1]["similarity"], 0.62)
            self.assertEqual(cases[2]["similarity"], 0.41)

    def test_fix_2_evaluate_rag_envelope(self):
        """Test that /evaluate-rag returns the standard {success, data, error} envelope."""
        response = self.client.post(
            "/evaluate-rag",
            json={
                "query": "What is IPC 302?",
                "retrieved_context": [{"source": "case1", "text": "Punishment for murder."}],
                "model_answer": "IPC Section 302 provides punishment for murder.",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIn("final_verdict", data.get("data", {}))
        self.assertIn("scores", data.get("data", {}))

    def test_fix_3_feedback_error_handling(self):
        """Test that /feedback returns standard ok() envelope on success."""
        response = self.client.post(
            "/feedback",
            json={
                "query": "Test query",
                "rating": 1,
                "role": "lawyer",
                "comment": "Great answer",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["data"]["status"], "ok")

    def test_fix_4_pdf_chat_length_limit(self):
        """Test that /pdf-chat rejects document text larger than 1,000,000 chars with 413."""
        large_text = "A" * 1_000_001
        response = self.client.post(
            "/pdf-chat",
            json={
                "query": "What is this document about?",
                "document_text": large_text,
            },
        )
        self.assertEqual(response.status_code, 413)
        data = response.json()
        self.assertFalse(data.get("success"))
        self.assertEqual(data["error"]["type"], "PayloadTooLarge")

    def test_fix_5_book_service_thread_lock(self):
        """Test that _GOOGLE_LOCK is initialized and accessible."""
        self.assertIsNotNone(_GOOGLE_LOCK)


if __name__ == "__main__":
    unittest.main()
