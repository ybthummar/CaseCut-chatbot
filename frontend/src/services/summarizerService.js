/**
 * Summarization service — routes requests to the correct provider.
 *
 * Providers:
 *   local        → POST /summarize on your FastAPI backend
 *   huggingface  → HuggingFace Inference API (direct from browser)
 *
 * For PDF inputs the backend always handles text extraction.
 */

import { getModelById } from '../config/models';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN || '';

/**
 * Summarize text or a PDF URL using the selected model.
 *
 * @param {string} input      – plain text OR a Firebase Storage download URL
 * @param {string} modelId    – model slug from models.js
 * @param {'text'|'pdf'} inputType
 * @returns {Promise<string>} – summary text
 */
export const summarizeText = async (input, modelId, inputType = 'text') => {
  const model = getModelById(modelId);
  if (!model) throw new Error(`Model "${modelId}" not found`);

  // PDFs always go through backend (it handles extraction)
  if (inputType === 'pdf') {
    return summarizeViaBackend(input, modelId);
  }

  if (model.provider === 'local') {
    return summarizeWithLocal(input);
  }

  if (model.provider === 'huggingface') {
    return summarizeWithHuggingFace(input, model.hfModel);
  }

  throw new Error(`Unknown provider: ${model.provider}`);
};

// ─── Provider implementations ────────────────────────────────────────

async function summarizeWithLocal(text) {
  const res = await fetch(`${API_URL}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Local summarization failed');
  const data = await res.json();
  return data.summary;
}

async function summarizeViaBackend(fileUrl, modelId) {
  const res = await fetch(`${API_URL}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_url: fileUrl, model_id: modelId }),
  });
  if (!res.ok) throw new Error('Backend summarization failed');
  const data = await res.json();
  return data.summary;
}

async function summarizeWithHuggingFace(text, hfModel) {
  if (!HF_API_TOKEN) {
    throw new Error(
      'VITE_HF_API_TOKEN is not set. Add it to your .env file.'
    );
  }

  const res = await fetch(
    `https://api-inference.huggingface.co/models/${hfModel}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text.slice(0, 4096), // respect token limits
        parameters: { max_length: 512, min_length: 50 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'HuggingFace summarization failed');
  }

  const data = await res.json();
  return Array.isArray(data) ? data[0]?.summary_text : data.summary_text;
}
