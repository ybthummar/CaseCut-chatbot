/**
 * Summarize API - wraps the /summarize endpoint.
 *
 * All summarization requests are routed through backend.
 */

import { apiRequest } from './client'

/**
 * Summarize raw text.
 * @returns {{ summary, model_id, mode, provider, summary_size }}
 */
export async function summarizeText(
  text,
  modelId = 'casecut-legal',
  mode = 'lawyer',
  intent = 'summarize',
  summarySize = 'large'
) {
  const response = await apiRequest('/summarize', {
    method: 'POST',
    body: { text, model_id: modelId, mode, intent, summary_size: summarySize },
  })
  return response.data
}

/**
 * Summarize a file by URL.
 * @returns {{ summary, model_id, mode, provider, summary_size }}
 */
export async function summarizeFile(
  fileUrl,
  modelId = 'casecut-legal',
  mode = 'lawyer',
  intent = 'summarize',
  summarySize = 'large'
) {
  const response = await apiRequest('/summarize', {
    method: 'POST',
    body: { file_url: fileUrl, model_id: modelId, mode, intent, summary_size: summarySize },
  })
  return response.data
}
