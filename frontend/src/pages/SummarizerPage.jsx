import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Loader2,
  Copy,
  Check,
  Sparkles,
  History,
  Calendar,
  Bot,
  Zap,
  HelpCircle,
  BookOpen,
  Settings,
  FileSearch,
  Eye,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FloatingNav from '../components/FloatingNav';
import { AnimatedSelect } from '../components/ui/animated-select';
import { getModelsByCapability } from '../config/models';
import { summarizeText as apiSummarizeText } from '../api/summarizeApi';
import { uploadPDFToBackend } from '../api/chatApi';
import { addSummaryHistory, getSummaryHistory } from '../services/featureHistoryService';
import logo from '../../assets/Logo.svg';

const isPdfFile = (candidate) =>
  !!candidate &&
  (candidate.type === 'application/pdf' || candidate.name?.toLowerCase().endsWith('.pdf'));

export default function SummarizerPage() {
  const { user } = useAuth();
  const { meta } = useTheme();
  const summarizeModels = getModelsByCapability('summarize');
  const [selectedModel, setSelectedModel] = useState(summarizeModels[0]?.id || '');
  const [mode, setMode] = useState('text');
  const [task, setTask] = useState('summarize');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [history, setHistory] = useState(() => getSummaryHistory(user?.uid));
  const fileInputRef = useRef(null);

  const selectedModelObj = useMemo(
    () => summarizeModels.find((m) => m.id === selectedModel),
    [summarizeModels, selectedModel],
  );

  const refreshHistory = () => setHistory(getSummaryHistory(user?.uid));

  const onFilePick = (picked) => {
    if (isPdfFile(picked)) {
      setFile(picked);
      setError('');
    } else {
      setError('Please upload a valid PDF file.');
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setSummary('');

    try {
      let sourceLabel = 'Pasted text';
      let inputText = text;

      if (mode === 'pdf') {
        if (!file) {
          throw new Error('Please upload a PDF first.');
        }
        sourceLabel = file.name;
        setUploadProgress(20);
        const parsed = await uploadPDFToBackend(file, user?.uid || 'guest');
        const extractedText = parsed?.full_text || '';
        if (extractedText.trim().length < 50) {
          throw new Error('Could not extract enough text from this PDF.');
        }
        inputText = extractedText;
        setUploadProgress(80);
      }

      const result = await apiSummarizeText(
        inputText,
        selectedModel,
        'lawyer',
        task,
        'large',
      );

      setUploadProgress(100);
      const output = result?.summary || '';
      setSummary(output);

      addSummaryHistory(user?.uid, {
        id: `sum_${Date.now()}`,
        createdAt: new Date().toISOString(),
        sourceLabel,
        task,
        model: selectedModelObj?.name || selectedModel,
        summary: output,
      });
      refreshHistory();
    } catch (err) {
      setError(err?.message || 'Summarization failed.');
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${meta.gradient} ${meta.textPrimary}`}>
      <FloatingNav />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-purple-100 rounded-xl">
              <FileText className="size-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Legal Document Summarizer</h1>
              <p className="text-sm text-gray-600 mt-0.5">AI-powered summarization with extractive & abstractive models</p>
            </div>
          </div>
        </div>

        {/* How It Works — Mode Explanation Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className={`rounded-2xl p-4 border shadow-md transition-all cursor-pointer ${
              task === 'summarize'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
                : 'bg-white/60 border-white/40 hover:bg-white/80'
            }`}
            onClick={() => setTask('summarize')}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <FileSearch className="size-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Summarization</h3>
              {task === 'summarize' && <Check className="size-4 text-purple-600 ml-auto" />}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>Extractive</strong> picks the most important original sentences using SBERT embeddings.
              <strong> Abstractive</strong> generates new text using T5/BART/Pegasus models.
              Best for getting quick overviews of judgments and FIRs.
            </p>
            <div className="mt-2 flex gap-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">SBERT</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">T5</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">BART</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className={`rounded-2xl p-4 border shadow-md transition-all cursor-pointer ${
              task === 'case_prediction'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                : 'bg-white/60 border-white/40 hover:bg-white/80'
            }`}
            onClick={() => setTask('case_prediction')}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Eye className="size-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Case Prediction</h3>
              {task === 'case_prediction' && <Check className="size-4 text-blue-600 ml-auto" />}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              AI analyzes the case facts, charges, and legal precedents to predict likely outcomes.
              Uses pattern matching from similar historical judgments to estimate conviction, acquittal, or bail probabilities.
            </p>
            <div className="mt-2 flex gap-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">AI Analysis</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Precedent</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className={`rounded-2xl p-4 border shadow-md transition-all cursor-pointer ${
              task === 'ipc_detection'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                : 'bg-white/60 border-white/40 hover:bg-white/80'
            }`}
            onClick={() => setTask('ipc_detection')}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <BookOpen className="size-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">IPC Detection</h3>
              {task === 'ipc_detection' && <Check className="size-4 text-emerald-600 ml-auto" />}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Automatically identifies all IPC (Indian Penal Code) sections mentioned in the document.
              Extracts section numbers, titles, and associated punishments for quick legal reference.
            </p>
            <div className="mt-2 flex gap-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">IPC Sections</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Auto-detect</span>
            </div>
          </motion.div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Main Panel */}
          <section className="rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-5">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <AnimatedSelect
                  value={selectedModel}
                  onChange={setSelectedModel}
                  label="AI Model"
                  icon={<Bot className="size-4" />}
                  options={summarizeModels.map((m) => ({ value: m.id, label: m.name }))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Input Mode</label>
                <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-white/50 p-1">
                  <button
                    onClick={() => setMode('text')}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${mode === 'text' ? 'bg-black text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    Text Input
                  </button>
                  <button
                    onClick={() => setMode('pdf')}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${mode === 'pdf' ? 'bg-black text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    PDF Upload
                  </button>
                </div>
              </div>
            </div>

            {mode === 'text' ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste judgment text, legal argument, or FIR details..."
                className="h-48 w-full rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300/50"
              />
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onFilePick(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 bg-white/40 p-6 text-center hover:bg-white/60 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => onFilePick(e.target.files?.[0])}
                />
                <Upload className="mx-auto mb-3 size-7 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Drop a PDF here or click to choose</p>
                <p className="mt-1 text-xs text-gray-600">Optimized preview card appears after upload.</p>

                {file && (
                  <div className="mx-auto mt-4 flex max-w-lg items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-left">
                    <FileText className="size-5 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-emerald-800">{file.name}</p>
                      <p className="text-[11px] text-emerald-600">{(file.size / 1024 / 1024).toFixed(2)} MB PDF ready</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploadProgress > 0 && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                  <span>Preparing summary</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <motion.button
                onClick={handleGenerate}
                disabled={loading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-all"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? 'Generating...' : 'Generate Summary'}
              </motion.button>
              {summary && (
                <button
                  onClick={copySummary}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white/60 px-3 py-2 text-xs text-gray-700 hover:bg-white/80 transition-all"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {summary && (
              <div className="mt-5 rounded-2xl bg-white/50 border border-white/40 p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3 text-purple-500" />
                    <span className="font-semibold text-purple-700">AI-Generated Summary</span>
                  </div>
                  <span>{selectedModelObj?.name || selectedModel}</span>
                </div>
                <div className="prose prose-sm max-w-none text-gray-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200/50 flex items-center gap-1.5">
                  <svg className="size-3 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="text-[10px] text-amber-600 italic">AI suggestion — verify before use in legal proceedings</span>
                </div>
              </div>
            )}
          </section>

          {/* History Sidebar */}
          <aside className="rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-4">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white/60 px-3 py-2 hover:bg-white/80 transition-colors"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                <History className="size-4" />
                Summary History
              </span>
              <span className="text-xs text-gray-500">{history.length}</span>
            </button>

            <AnimatePresence>
              {historyOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  {history.length === 0 && (
                    <p className="rounded-xl bg-white/50 border border-white/40 p-3 text-xs text-gray-600">No history yet. Your recent summaries will appear here.</p>
                  )}
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSummary(item.summary || '')}
                      className="w-full rounded-xl bg-white/50 border border-white/40 p-3 text-left hover:bg-white/70 hover:shadow-md transition-all"
                    >
                      <p className="truncate text-xs font-semibold text-gray-900">{item.sourceLabel}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                        <Bot className="size-3" />
                        <span>{item.model}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                        <Calendar className="size-3" />
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 py-8 px-4 mt-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={logo} alt="CaseCut" className="h-5 w-5" />
            <span className="text-xs font-semibold text-gray-900">CaseCut AI</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <svg className="size-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-[11px] text-gray-500">Your legal data is private & सुरक्षित (secure)</span>
          </div>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} CaseCut. Built for the Indian Legal Community.
          </p>
        </div>
      </footer>
    </div>
  );
}
