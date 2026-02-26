/**
 * Summarize API — wraps the /summarize endpoint.
 *
 * ALL summarization (local LLM + HuggingFace) is routed
 * through the backend.  Frontend never calls HF directly.
 */

import { apiRequest } from './client';

/**
 * Summarize raw text.
 * @returns {{ summary, model_id, mode, provider }}
 */
export async function summarizeText(text, modelId = 'casecut-legal', mode = 'lawyer') {
  const response = await apiRequest('/summarize', {
    method: 'POST',
    body: { text, model_id: modelId, mode },
  });
  return response.data;
}

/**
 * Summarize a file by URL (Firebase Storage download URL).
 * @returns {{ summary, model_id, mode, provider }}
 */
export async function summarizeFile(fileUrl, modelId = 'casecut-legal', mode = 'lawyer') {
  const response = await apiRequest('/summarize', {
    method: 'POST',
    body: { file_url: fileUrl, model_id: modelId, mode },
  });
  return response.data;
}
