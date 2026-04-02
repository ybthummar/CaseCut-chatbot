/**
 * Central AI model configuration.
 * Add new models here — they auto-appear in every dropdown across the app.
 *
 * Shape:
 *   id          – unique slug used in API calls and Firestore
 *   name        – human-readable label
 *   provider    – 'local' | 'huggingface' (extend as needed)
 *   description – one-liner shown in the UI
 *   capabilities – array of feature flags: 'chat' | 'summarize'
 *   hfModel     – (HuggingFace only) model repo path
 */

export const models = [
  {
    id: 'fine_tuned_t5_summarizer',
    name: 'fine_tuned_t5_summarizer',
    provider: 'local',
    description: 'backend/Model/fine_tuned_t5_summarizer',
    capabilities: ['summarize'],
  },
  {
    id: 'legal-summarizer-bart',
    name: 'legal-summarizer-bart',
    provider: 'local',
    description: 'backend/Model/legal-summarizer-bart',
    capabilities: ['summarize'],
  },
  {
    id: 'Pegasus',
    name: 'Pegasus',
    provider: 'local',
    description: 'backend/Model/Pegasus',
    capabilities: ['summarize'],
  },
  {
    id: 'LED',
    name: 'LED',
    provider: 'local',
    description: 'backend/Model/LED',
    capabilities: ['summarize'],
  },
  {
    id: 'casecut-legal',
    name: 'CaseCut Hybrid (Recommended)',
    provider: 'local',
    description: 'Local model first, then API refinement for long legal summaries',
    capabilities: ['chat', 'summarize'],
  },
  {
    id: 'hf-bart-large-cnn',
    name: 'BART Large CNN',
    provider: 'huggingface',
    description: 'Facebook — abstractive summarization',
    capabilities: ['summarize'],
  },
  {
    id: 'hf-legal-led',
    name: 'Legal LED',
    provider: 'huggingface',
    description: 'Long-document legal summarization',
    capabilities: ['summarize'],
  },
  {
    id: 'hf-falconsai',
    name: 'FalconSAI Summarizer',
    provider: 'huggingface',
    description: 'Lightweight text summarization',
    capabilities: ['summarize'],
  },
];

/** Return models that support a given capability. */
export const getModelsByCapability = (capability) =>
  models.filter((m) => m.capabilities.includes(capability));

/** Look up a single model by its id. */
export const getModelById = (id) => models.find((m) => m.id === id);
