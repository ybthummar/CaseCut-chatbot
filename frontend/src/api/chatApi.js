/**
 * Chat API — wraps the /query endpoint.
 *
 * Parses the structured response envelope and returns
 * the inner data object directly.
 */

import { apiRequest } from './client';

/**
 * Send a RAG query to the backend.
 * @returns {{ summary, cases, source, ranked, total_retrieved, llm_time_ms }}
 */
export async function sendQuery(query, role = 'lawyer', topic = 'all', k = 5) {
  const response = await apiRequest('/query', {
    method: 'POST',
    body: { query, role, topic, k },
  });
  // Unwrap structured envelope
  return response.data;
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
