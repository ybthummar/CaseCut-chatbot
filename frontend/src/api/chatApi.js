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
 * @param {string} language - Output language (hindi|bengali|tamil|telugu|marathi|gujarati|kannada|malayalam|punjabi|urdu|english|any)
 * @param {string} topic - Topic filter
 * @param {number} k - Number of results
 * @param {Array} conversationHistory - Previous turns [{role, text}]
 * @returns {{ summary, cases, source, ranked, total_retrieved, llm_time_ms, confidence }}
 */
export async function sendQuery(query, role = 'lawyer', language = 'english', topic = 'all', k = 5, conversationHistory = null) {
  const body = { query, role, language, topic, k };
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
 * @param {string} language - Output language (hindi|bengali|tamil|telugu|marathi|gujarati|kannada|malayalam|punjabi|urdu|english|any)
 * @param {Array} conversationHistory - Previous turns
 * @returns {{ answer, source, llm_time_ms, citations, confidence }}
 */
export async function chatWithPDF(query, documentText, role = 'lawyer', language = 'english', conversationHistory = null) {
  const body = { query, document_text: documentText, role, language };
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
 * @param {string} query
 * @param {number} rating
 * @param {string} role
 * @param {{ comment?: string, aiResponse?: string, userFeedback?: string, userComment?: string }} options
 */
export async function sendFeedback(query, rating, role = 'lawyer', options = {}) {
  const body = { query, rating, role };

  if (typeof options.comment === 'string' && options.comment.trim()) {
    body.comment = options.comment.trim();
  }
  if (typeof options.aiResponse === 'string' && options.aiResponse.trim()) {
    body.ai_response = options.aiResponse;
  }
  if (typeof options.userFeedback === 'string' && options.userFeedback.trim()) {
    body.user_feedback = options.userFeedback.trim();
  }
  if (typeof options.userComment === 'string' && options.userComment.trim()) {
    body.user_comment = options.userComment.trim();
  }

  return apiRequest('/feedback', {
    method: 'POST',
    body,
  });
}

/**
 * Evaluate a generated answer against retrieved RAG context.
 * Returns strict JSON from /evaluate-rag.
 * @param {string} query
 * @param {Array} retrievedContext
 * @param {string} modelAnswer
 */
export async function evaluateRagAnswer(query, retrievedContext = [], modelAnswer = '') {
  return apiRequest('/evaluate-rag', {
    method: 'POST',
    body: {
      query,
      retrieved_context: Array.isArray(retrievedContext) ? retrievedContext : [],
      model_answer: modelAnswer,
    },
  });
}

/**
 * Analyze feedback sample via backend analyzer endpoint.
 * Returns:
 * {
 *   feedback_type: string,
 *   issue_detected: string,
 *   improvement_suggestion: string
 * }
 */
export async function analyzeFeedback(aiResponse, userFeedback, userComment = '') {
  const body = {
    ai_response: aiResponse,
    user_feedback: userFeedback,
  };
  if (userComment && userComment.trim()) {
    body.user_comment = userComment.trim();
  }

  return apiRequest('/feedback/analyze', {
    method: 'POST',
    body,
  });
}

/**
 * Send a message to the voice agent endpoint.
 * @param {string} message - User's spoken message
 * @param {string} language - Language key
 * @param {Array} conversationMemory - Past turns [{role, text}]
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {{ response: string, source: string, llm_time_ms: number }}
 */
export async function voiceChat(message, language = 'english', conversationMemory = [], signal) {
  const body = { message, language };
  if (conversationMemory && conversationMemory.length > 0) {
    body.conversation_memory = conversationMemory.slice(-10).map(m => ({
      role: m.role,
      text: m.text,
    }));
  }
  const response = await apiRequest('/voice-chat', {
    method: 'POST',
    body,
    signal,
  });
  return response.data;
}
