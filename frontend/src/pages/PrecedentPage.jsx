import { useState } from 'react';
import {
  History,
  Loader2,
  Search,
  Calendar,
  BookOpen,
  ExternalLink,
  Scale,
  Briefcase,
  GraduationCap,
  Building2,
  FileText,
  Globe,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import FloatingNav from '../components/FloatingNav';
import { AnimatedSelect } from '../components/ui/animated-select';
import { sendQuery } from '../api/chatApi';
import { addPrecedentHistory, getPrecedentHistory } from '../services/featureHistoryService';
import logo from '../../assets/Logo.svg';

const TOPICS = [
  { id: 'all', name: 'All Topics' },
  { id: 'bail', name: 'Bail' },
  { id: 'murder', name: 'Murder / Homicide' },
  { id: 'fraud', name: 'Fraud / Cheating' },
  { id: 'cyber', name: 'Cyber Crime' },
  { id: 'contract', name: 'Contract Law' },
  { id: 'property', name: 'Property Disputes' },
  { id: 'constitutional', name: 'Constitutional Law' },
  { id: 'family', name: 'Family Law' },
];

export default function PrecedentPage() {
  const { meta } = useTheme();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [role, setRole] = useState('lawyer');
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => getPrecedentHistory(user?.uid));

  const runSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);

    try {
      const data = await sendQuery(query.trim(), role, language, topic, 6, null);
      setResult(data);

      addPrecedentHistory(user?.uid, {
        id: `prec_${Date.now()}`,
        createdAt: new Date().toISOString(),
        query: query.trim(),
        topic,
        answer: data?.summary || '',
        cases: data?.cases || [],
      });
      setHistory(getPrecedentHistory(user?.uid));
    } catch (err) {
      setResult({ summary: `Error: ${err?.message || 'Search failed.'}`, cases: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${meta.gradient} ${meta.textPrimary}`}>
      <FloatingNav />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-5">
          <h1 className="text-3xl font-thin text-gray-900">Case Precedent Finder</h1>
          <p className="text-sm text-gray-700 mt-1">Run focused precedent search with case evidence and save search history.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Main Panel */}
          <section className="rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <AnimatedSelect
                value={topic}
                onChange={setTopic}
                label="Topic"
                icon={<Scale className="size-4" />}
                options={TOPICS.map((t) => ({ value: t.id, label: t.name }))}
              />
              <AnimatedSelect
                value={role}
                onChange={setRole}
                label="Role"
                icon={<Briefcase className="size-4" />}
                options={[
                  { value: 'lawyer', label: 'Lawyer', icon: <Briefcase className="size-4" />, description: 'Detailed legal analysis' },
                  { value: 'judge', label: 'Judge', icon: <Scale className="size-4" />, description: 'Judicial perspective' },
                  { value: 'student', label: 'Student', icon: <GraduationCap className="size-4" />, description: 'Educational explanations' },
                  { value: 'firm', label: 'Firm', icon: <Building2 className="size-4" />, description: 'Client-ready intelligence' },
                  { value: 'summary', label: 'Summary', icon: <FileText className="size-4" />, description: 'Concise summary' },
                ]}
              />
              <AnimatedSelect
                value={language}
                onChange={setLanguage}
                label="Language"
                icon={<Globe className="size-4" />}
                options={[
                  { value: 'english', label: 'English' },
                  { value: 'hindi', label: 'Hindi (हिंदी)' },
                  { value: 'bengali', label: 'Bengali (বাংলা)' },
                  { value: 'tamil', label: 'Tamil (தமிழ்)' },
                  { value: 'telugu', label: 'Telugu (తెలుగు)' },
                  { value: 'marathi', label: 'Marathi (मराठी)' },
                ]}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="Example: Supreme Court view on anticipatory bail in financial fraud"
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300/50"
              />
              <motion.button onClick={runSearch} disabled={loading} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-all">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
              </motion.button>
            </div>

            {result && (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-white/50 border border-white/40 p-4">
                  <h2 className="mb-2 text-sm font-semibold text-gray-900">Answer</h2>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{result.summary || 'No summary returned.'}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Supporting Cases</h3>
                  {(result.cases || []).map((item, idx) => (
                    <details key={`${idx}_${item.file || 'case'}`} className="rounded-xl bg-white/50 border border-white/40 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-purple-700 hover:text-purple-900 transition-colors">
                        {item.court || 'Court'} {item.date ? ` - ${item.date}` : ''}
                      </summary>
                      <p className="mt-2 text-xs text-gray-700">{item.text || 'No excerpt available.'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.ipc_sections?.length > 0 && (
                          <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-1 text-[10px] text-amber-800">
                            IPC {item.ipc_sections.slice(0, 3).join(', ')}
                          </span>
                        )}
                        {item.file && (
                          <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-1 text-[10px] text-gray-600">{item.file}</span>
                        )}
                        {item.source_url && (
                          <a className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-1 text-[10px] text-emerald-700 hover:bg-emerald-200 transition-colors" href={item.source_url} target="_blank" rel="noreferrer">
                            Open
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* History Sidebar */}
          <aside className="rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-4">
            <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-200 bg-white/60 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                <History className="size-4" />
                Precedent History
              </span>
              <span className="text-xs text-gray-500">{history.length}</span>
            </div>

            <div className="space-y-2">
              {history.length === 0 && (
                <p className="rounded-xl bg-white/50 border border-white/40 p-3 text-xs text-gray-600">No precedent searches yet. Your recent searches will appear here.</p>
              )}

              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setQuery(item.query || '');
                    setTopic(item.topic || 'all');
                    setResult({ summary: item.answer, cases: item.cases || [] });
                  }}
                  className="w-full rounded-xl bg-white/50 border border-white/40 p-3 text-left hover:bg-white/70 hover:shadow-md transition-all"
                >
                  <p className="truncate text-xs font-semibold text-gray-900">{item.query}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                    <BookOpen className="size-3" />
                    <span>{TOPICS.find((t) => t.id === item.topic)?.name || 'All Topics'}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                    <Calendar className="size-3" />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
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
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} CaseCut. Built for the Indian Legal Community.
          </p>
        </div>
      </footer>
    </div>
  );
}
