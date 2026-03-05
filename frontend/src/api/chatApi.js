/**
 * Chat API — wraps the /query and /pdf-chat endpoints.
 *
 * Parses the structured response envelope and returns
 * the inner data object directly.
 */

import { apiRequest } from './client';

/**
 * Send a RAG query to the backend.
 * @param {string} query - User's question
 * @param {string} role - Persona (lawyer|judge|student|strategy)
 * @param {string} topic - Topic filter
 * @param {number} k - Number of results
 * @param {Array} conversationHistory - Previous turns [{role, text}]
 * @returns {{ summary, cases, source, ranked, total_retrieved, llm_time_ms, confidence }}
 */
export async function sendQuery(query, role = 'lawyer', topic = 'all', k = 5, conversationHistory = null) {
  const body = { query, role, topic, k };
  if (conversationHistory && conversationHistory.length > 0) {
    body.conversation_history = conversationHistory.slice(-6).map(m => ({
      role: m.role,
      text: m.text,
    }));
  }
  const response = await apiRequest('/query', {
    method: 'POST',
    body,
  });
  return response.data;
}

/**
 * Chat with an uploaded PDF document.
 * @param {string} query - Question about the document
 * @param {string} documentText - Full text of the uploaded PDF
 * @param {string} role - Persona
 * @param {Array} conversationHistory - Previous turns
 * @returns {{ answer, source, llm_time_ms, citations, confidence }}
 */
export async function chatWithPDF(query, documentText, role = 'lawyer', conversationHistory = null) {
  const body = { query, document_text: documentText, role };
  if (conversationHistory && conversationHistory.length > 0) {
    body.conversation_history = conversationHistory.slice(-6).map(m => ({
      role: m.role,
      text: m.text,
    }));
  }
  const response = await apiRequest('/pdf-chat', {
    method: 'POST',
    body,
  });
  return response.data;
}

/**
 * Upload a PDF file to the backend for parsing.
 * @param {File} file - PDF file
 * @param {string} userId - User ID
 * @returns {{ id, filename, court, date, ipc_sections, topics, outcome, facts, full_text, ... }}
 */
export async function uploadPDFToBackend(file, userId = 'anonymous') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data?.error?.message || data?.detail || 'Upload failed');
  }
  return data.data;
}

/**
 * Submit feedback (thumbs up/down) for a response.
 */
export async function sendFeedback(query, rating, role = 'lawyer') {
  return apiRequest('/feedback', {
    method: 'POST',
    body: { query, rating, role },
  });
}
