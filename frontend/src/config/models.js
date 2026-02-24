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
    id: 'casecut-legal',
    name: 'CaseCut Legal AI',
    provider: 'local',
    description: 'Custom legal research & summarization',
    capabilities: ['chat', 'summarize'],
  },
  {
    id: 'hf-bart-large-cnn',
    name: 'BART Large CNN',
    provider: 'huggingface',
    description: 'Facebook — abstractive summarization',
    capabilities: ['summarize'],
    hfModel: 'facebook/bart-large-cnn',
  },
  {
    id: 'hf-legal-led',
    name: 'Legal LED',
    provider: 'huggingface',
    description: 'Long-document legal summarization',
    capabilities: ['summarize'],
    hfModel: 'nsi319/legal-led-base-16384',
  },
  {
    id: 'hf-falconsai',
    name: 'FalconSAI Summarizer',
    provider: 'huggingface',
    description: 'Lightweight text summarization',
    capabilities: ['summarize'],
    hfModel: 'Falconsai/text_summarization',
  },
];

/** Return models that support a given capability. */
export const getModelsByCapability = (capability) =>
  models.filter((m) => m.capabilities.includes(capability));

/** Look up a single model by its id. */
export const getModelById = (id) => models.find((m) => m.id === id);
