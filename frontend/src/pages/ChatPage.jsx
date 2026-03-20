import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { sendFeedback, uploadPDFToBackend } from '../api/chatApi'
import SummarizerModal from '../components/SummarizerModal'
import ToolsDropdown from '../components/ToolsDropdown'
import {
  SendHorizontal, Menu, LogOut, User, Plus, MessageSquare,
  ChevronDown, Scale, Briefcase, GraduationCap, Loader2,
  BookOpen, X, ThumbsUp, ThumbsDown, Filter, Sparkles,
  Home, Trash2, FileText, Upload, Building2, AlertTriangle,
  CheckCircle, Info,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../App.css'
import logo from '../../assets/Logo.svg'

export default function ChatPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // ── Chat state (Firestore-backed, real-time) ─────────────────────
  const {
    chatList,
    activeChatId,
    messages,
    loading,
    sendMessage,
    startNewChat,
    selectChat,
    removeChat,
    pdfDocument,
    setPdfForChat,
    clearPdf,
    firestoreOk,
  } = useChat(user)

  // ── Local UI state ────────────────────────────────────────────────
  const [input, setInput] = useState('')
  const [role, setRole] = useState('lawyer')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [topic, setTopic] = useState('all')
  const [summarizerOpen, setSummarizerOpen] = useState(false)
  const [pdfUploading, setPdfUploading] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // ── Static config ─────────────────────────────────────────────────
  const topics = [
    { id: 'all', name: 'All Topics' },
    { id: 'bail', name: 'Bail' },
    { id: 'murder', name: 'Murder / Homicide' },
    { id: 'fraud', name: 'Fraud / Cheating' },
    { id: 'cyber', name: 'Cyber Crime' },
    { id: 'contract', name: 'Contract Law' },
    { id: 'property', name: 'Property Disputes' },
    { id: 'constitutional', name: 'Constitutional Law' },
    { id: 'family', name: 'Family Law' },
  ]

  const roles = [
    { id: 'lawyer', name: 'Lawyer', icon: <Briefcase className="size-4" />, description: 'Detailed legal analysis' },
    { id: 'judge', name: 'Judge', icon: <Scale className="size-4" />, description: 'Judicial perspective' },
    { id: 'student', name: 'Student', icon: <GraduationCap className="size-4" />, description: 'Educational explanations' },
    { id: 'firm', name: 'Firm', icon: <Building2 className="size-4" />, description: 'Client-ready legal intelligence' },
    { id: 'summary', name: 'Summary', icon: <FileText className="size-4" />, description: 'Concise executive summary' },
  ]

  const selectedRole = roles.find((r) => r.id === role) || roles[0]

  const suggestedPrompts = pdfDocument
    ? [
        'What are the key facts of this case?',
        'What legal sections are cited in this document?',
        'What was the court\'s final decision?',
        'Summarize the legal arguments presented.',
      ]
    : [
        'What is Section 420 IPC?',
        'Explain breach of contract under Indian law',
        'Landmark judgments on Right to Privacy',
        'What are grounds for anticipatory bail?',
      ]

  // ── Side effects ──────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
    }
  }, [input])

  // ── PDF Upload Handler ────────────────────────────────────────────
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.txt')) {
      alert('Please select a PDF or TXT file.')
      return
    }

    setPdfUploading(true)
    try {
      const parsed = await uploadPDFToBackend(file, user?.uid || 'anonymous')
      if (!parsed?.full_text || parsed.full_text.trim().length < 50) {
        throw new Error('Could not extract enough text from the uploaded file.')
      }

      startNewChat()
      setPdfForChat(parsed)
      setInput('Find the most relevant precedents from this uploaded document and explain why they apply.')
    } catch (err) {
      console.error('PDF upload error:', err)
      alert(`Upload failed: ${err.message}`)
    } finally {
      setPdfUploading(false)
      if (e?.target) e.target.value = ''
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() || loading) return
    sendMessage(input.trim(), role, topic)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleLogout = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    await logout()
    navigate('/')
  }

  const handleNewChat = () => {
    startNewChat()
    setInput('')
  }

  const handleFeedback = async (queryText, rating) => {
    try {
      await sendFeedback(queryText, rating, role)
    } catch (err) {
      console.error('Feedback error:', err)
    }
  }

  // ── Confidence badge helper ───────────────────────────────────────
  const ConfidenceBadge = ({ confidence }) => {
    if (!confidence) return null
    const colors = {
      high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      low: 'text-red-400 bg-red-500/10 border-red-500/20',
    }
    const icons = {
      high: <CheckCircle className="size-3" />,
      medium: <Info className="size-3" />,
      low: <AlertTriangle className="size-3" />,
    }
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${colors[confidence.level] || colors.medium}`}
           title={confidence.explanation}>
        {icons[confidence.level]}
        <span>Confidence: {confidence.level}</span>
        {confidence.score > 0 && <span>({(confidence.score * 100).toFixed(0)}%)</span>}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#0f0f0f] text-white flex overflow-hidden">

      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full bg-[#141416] border-r border-white/[0.06] flex flex-col overflow-hidden"
          >
            {/* Sidebar ▸ Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="CaseCut" className="h-8 w-8" />
                <span className="text-lg font-bold text-white">CaseCut AI</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Sidebar ▸ New Chat */}
            <div className="px-3 pb-3">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 active:scale-[0.98] shadow-[0_0_20px_rgba(20,136,252,0.15)]"
              >
                <Plus className="size-4" />
                New Chat
              </button>
            </div>

            {/* Sidebar ▸ Chat list (real-time) */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f] px-2 mb-2">
                Recent
              </div>

              {chatList.length === 0 && (
                <p className="text-xs text-[#5a5a5f] px-2 py-4">No conversations yet</p>
              )}

              {chatList.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-all duration-150 mb-0.5 ${
                    activeChatId === chat.id
                      ? 'bg-white/10 text-white'
                      : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <MessageSquare className="size-3.5 flex-shrink-0 text-[#5a5a5f]" />
                  <p className="text-xs truncate flex-1">
                    {chat.title || 'New conversation'}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeChat(chat.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#5a5a5f] hover:text-red-400 transition-all"
                    title="Delete chat"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Sidebar ▸ Footer */}
            <div className="p-3 border-t border-white/[0.06] space-y-1">
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#a0a0a5]">
                <User className="size-3.5" />
                <span className="text-xs truncate flex-1">{user?.email || 'Guest User'}</span>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#a0a0a5] hover:bg-white/5 hover:text-white transition-all duration-150"
              >
                <Home className="size-3.5" />
                <span className="text-xs">Back to Main Site</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#a0a0a5] hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
              >
                <LogOut className="size-3.5" />
                <span className="text-xs">{user ? 'Log out' : 'Log in'}</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══════════════════════ MAIN AREA ══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Firestore warning banner */}
        {!firestoreOk && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 flex-1">
              <span className="font-medium">Firestore permissions error.</span>{' '}
              Chat history won't persist. Update your{' '}
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-amber-200"
              >
                Firestore security rules
              </a>{' '}
              to fix this.
            </p>
          </div>
        )}

        {/* ── Header ───────────────────────────────────────────── */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0f0f0f]">
          {/* Left: sidebar toggle + logo */}
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Menu className="size-5" />
              </button>
            )}
            {!sidebarOpen && (
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="CaseCut" className="h-7 w-7" />
                <span className="text-base font-semibold text-white tracking-tight">CaseCut AI</span>
              </div>
            )}

            {/* Active topic badge (when non-default) */}
            {topic !== 'all' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Filter className="size-3 text-blue-400" />
                <span className="text-[11px] font-medium text-blue-400">
                  {topics.find((t) => t.id === topic)?.name}
                </span>
                <button
                  onClick={() => setTopic('all')}
                  className="p-0.5 rounded-full hover:bg-blue-500/20 text-blue-400/60 hover:text-blue-300 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>

          {/* Right: user avatar */}
          <div className="flex items-center gap-1.5">
            {/* User avatar */}
            <button
              className="size-8 rounded-xl bg-gradient-to-br from-[#1488fc] to-[#7c5df0] flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/10 hover:ring-white/25 transition-all duration-200"
              title={user?.email || 'User'}
            >
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </button>
          </div>
        </header>

        {/* ── Messages area ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ── Empty state ─────────────────────────────────── */
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="max-w-2xl w-full text-center">
                <img src={logo} alt="CaseCut" className="h-16 w-16 mx-auto mb-6 opacity-60" />

                {/* PDF Chat indicator */}
                {pdfDocument && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left max-w-md mx-auto">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                        <FileText className="size-4" />
                        <span>PDF Loaded for Chat</span>
                      </div>
                      <button
                        onClick={clearPdf}
                        className="p-1 rounded text-emerald-400/50 hover:text-red-400 transition-colors"
                        title="Remove PDF"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-emerald-400/70 mt-1 truncate">{pdfDocument.filename}</p>
                    <p className="text-[10px] text-[#6a6a6f] mt-1">
                      {pdfDocument.page_count} pages • {pdfDocument.text_length?.toLocaleString()} chars
                      {pdfDocument.court && pdfDocument.court !== 'Unknown' && ` • ${pdfDocument.court}`}
                    </p>
                  </div>
                )}

                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
                  {pdfDocument ? 'Ask about your document' : (
                    <>
                      What would you like to{' '}
                      <span className="bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text text-transparent italic">
                        research
                      </span>
                      ?
                    </>
                  )}
                </h1>
                <p className="text-[#8a8a8f] text-base mb-8">
                  {pdfDocument
                    ? 'Your document is loaded. Ask questions and get citation-backed answers.'
                    : 'AI-powered legal research for Indian courts and judgments.'
                  }
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-w-xl mx-auto">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="p-4 text-left text-sm text-[#a0a0a5] rounded-xl border border-white/[0.06] bg-[#141416] hover:bg-[#1a1a1e] hover:text-white hover:border-white/10 transition-all duration-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Message list ────────────────────────────────── */
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="size-7 rounded-full bg-gradient-to-br from-[#1488fc] to-[#7c5df0] flex items-center justify-center">
                        <img src={logo} alt="" className="size-4" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
                      msg.role === 'user'
                        ? 'bg-[#1488fc] text-white'
                        : 'bg-[#1a1a1e] text-[#e0e0e5] border border-white/[0.06]'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="markdown-body text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text || ''}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {/* Case citations */}
                    {msg.cases && msg.cases.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
                        <div className="text-xs font-semibold text-[#8a8a8f] uppercase tracking-wide flex items-center gap-2">
                          📎 Supporting Sources
                          {msg.confidence && <ConfidenceBadge confidence={msg.confidence} />}
                        </div>
                        {msg.cases.map((c, j) => (
                          <details key={j} className="text-xs group">
                            <summary className="cursor-pointer text-[#4da5fc] hover:text-[#6ab8ff] transition-colors font-medium">
                              {c.approximate_page ? (
                                /* PDF chat citation */
                                <>Section ~Page {c.approximate_page}, Chunk {c.chunk_index + 1} (Relevance: {(c.similarity * 100).toFixed(0)}%)</>
                              ) : (
                                /* RAG case citation */
                                <>
                                  Case {j + 1} {c.court && `(${c.court})`}
                                  {c.date && ` — ${c.date}`}
                                  {c.ipc_sections?.length > 0 && ` — IPC ${c.ipc_sections.slice(0, 3).join(', ')}`}
                                </>
                              )}
                            </summary>
                            <div className="mt-2 pl-3 border-l-2 border-white/[0.06] space-y-1">
                              <p className="text-[11px] text-[#8a8a8f] leading-relaxed">
                                {c.text}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {c.outcome && c.outcome !== 'unknown' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                    Outcome: {c.outcome}
                                  </span>
                                )}
                                {c.file && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                                    Source: {c.file}
                                  </span>
                                )}
                                {c.source_url && (
                                  <a
                                    href={c.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                  >
                                    View Full Judgment
                                  </a>
                                )}
                                {c.rank_score > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                                    Relevance: {(c.rank_score * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    )}

                    {/* Feedback */}
                    {msg.role === 'assistant' && msg.text && (
                      <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center gap-2">
                        <span className="text-[10px] text-[#5a5a5f]">Helpful?</span>
                        <button
                          onClick={() => handleFeedback(messages[i - 1]?.text || '', 1)}
                          className="p-1 rounded hover:bg-green-500/10 text-[#5a5a5f] hover:text-green-400 transition-colors"
                          title="Helpful"
                        >
                          <ThumbsUp className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(messages[i - 1]?.text || '', -1)}
                          className="p-1 rounded hover:bg-red-500/10 text-[#5a5a5f] hover:text-red-400 transition-colors"
                          title="Not helpful"
                        >
                          <ThumbsDown className="size-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Model tag */}
                    {msg.model && (
                      <p className="mt-1 text-[10px] text-[#4a4a4f]">Model: {msg.model}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="size-7 rounded-full bg-[#2a2a2e] flex items-center justify-center">
                        <User className="size-3.5 text-[#8a8a8f]" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading spinner */}
              {loading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="size-7 rounded-full bg-gradient-to-br from-[#1488fc] to-[#7c5df0] flex items-center justify-center">
                      <img src={logo} alt="" className="size-4" />
                    </div>
                  </div>
                  <div className="bg-[#1a1a1e] text-[#8a8a8f] border border-white/[0.06] rounded-2xl px-5 py-3.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="size-4 animate-spin text-[#1488fc]" />
                      <span>Searching legal database…</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input area ───────────────────────────────────────── */}
        <div className="p-4 bg-[#0f0f0f]">
          <div className="max-w-3xl mx-auto">
            {/* PDF active indicator strip */}
            {pdfDocument && (
              <div className="flex items-center gap-2 mb-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <FileText className="size-4 text-blue-400 shrink-0" />
                <div className="text-xs text-blue-300 flex-1 min-w-0">
                  <p className="truncate">
                    Chatting with: <span className="font-medium">{pdfDocument.filename}</span>
                    {pdfDocument.page_count && ` (${pdfDocument.page_count} pages)`}
                    {pdfDocument.text_length && ` • ${pdfDocument.text_length.toLocaleString()} chars extracted`}
                  </p>
                  {pdfDocument.text_preview && (
                    <p className="text-[10px] text-blue-300/80 truncate mt-0.5">
                      Preview: {pdfDocument.text_preview}
                    </p>
                  )}
                </div>
                <button
                  onClick={clearPdf}
                  className="text-blue-400/60 hover:text-blue-300 transition-colors p-0.5"
                  title="Exit PDF chat"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            <div className="relative rounded-2xl bg-[#1e1e22] ring-1 ring-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_rgba(0,0,0,0.4)] px-4 py-2.5 sm:px-5 sm:py-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pdfDocument ? `Ask about "${pdfDocument.filename}"…` : "Ask about bail, IPC sections, precedents..."}
                disabled={loading}
                className="w-full resize-none bg-transparent text-[15px] text-white placeholder-[#5a5a5f] focus:outline-none min-h-[46px] max-h-[200px] pt-0.5 pb-1"
                style={{ height: '48px' }}
              />

              <div className="mt-1.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 relative">
                    <ToolsDropdown
                      onUploadPdf={handlePdfUpload}
                      onOpenSummarizer={() => setSummarizerOpen(true)}
                      topic={topic}
                      setTopic={setTopic}
                      topics={topics}
                      pdfUploading={pdfUploading}
                      placement="bottom"
                    />
                  </div>

                  <div className="shrink-0 relative">
                    <button
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className={`
                        h-8 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${roleDropdownOpen
                          ? 'bg-white/10 text-white ring-1 ring-white/20'
                          : 'text-[#8a8a8f] hover:text-white hover:bg-white/5 border border-white/[0.08]'
                        }
                      `}
                      title="Select AI role"
                    >
                      {selectedRole.icon}
                      <span className="hidden md:inline">{selectedRole.name}</span>
                      <ChevronDown className={`size-3 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {roleDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="absolute left-0 bottom-full mb-2 z-50 w-[240px] origin-bottom-left bg-[#1a1a1e]/98 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_16px_70px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
                          >
                            <div className="p-2">
                              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f]">
                                AI Perspective
                              </div>
                              {roles.map((r) => (
                                <button
                                  key={r.id}
                                  onClick={() => { setRole(r.id); setRoleDropdownOpen(false) }}
                                  className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150
                                    ${role === r.id
                                      ? 'bg-white/10 text-white'
                                      : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                                    }
                                  `}
                                >
                                  <div className="flex-shrink-0 size-8 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center">
                                    {r.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[13px] font-medium block leading-tight">{r.name}</span>
                                    <span className="text-[11px] text-[#6a6a6f] leading-tight">{r.description}</span>
                                  </div>
                                  {role === r.id && (
                                    <span className="text-[10px] text-blue-400">✓</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-[#5a5a5f] bg-white/[0.02] border border-white/[0.05]">
                    {pdfDocument ? <FileText className="size-3.5 text-blue-400" /> : <BookOpen className="size-3.5" />}
                    <span>{pdfDocument ? 'PDF Chat' : 'Indian Law'}</span>
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="h-9 shrink-0 flex items-center gap-2 px-4 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_rgba(20,136,252,0.3)]"
                >
                  <span className="hidden sm:inline">{pdfDocument ? 'Ask' : 'Search'}</span>
                  <SendHorizontal className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ SUMMARIZER MODAL ══════════════════ */}
      <SummarizerModal
        isOpen={summarizerOpen}
        onClose={() => setSummarizerOpen(false)}
        userId={user?.uid}
        activeRole={role}
      />
    </div>
  )
}
