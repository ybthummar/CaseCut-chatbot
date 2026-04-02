import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { useVoiceAgent } from '../hooks/useVoiceAgent'
import { sendFeedback, uploadPDFToBackend, evaluateRagAnswer } from '../api/chatApi'
import ToolsDropdown from '../components/ToolsDropdown'
import ThemeToggle from '../components/ThemeToggle'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/interfaces-avatar'
import { VoiceChat } from '../components/ui/ia-siri-chat'
import {
  SendHorizontal, Menu, LogOut, User, Plus, MessageSquare,
  ChevronDown, Scale, Briefcase, GraduationCap, Loader2,
  BookOpen, X, ThumbsUp, ThumbsDown, Filter, Sparkles,
  Home, Trash2, FileText, Upload, Building2, AlertTriangle,
  CheckCircle, Info, Languages, Mic, MicOff, Volume2, VolumeX,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShiningText } from '../components/ui/shining-text'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../App.css'
import logo from '../../assets/Logo.svg'

export default function ChatPage() {
  const { user, logout } = useAuth()
  const { theme, meta } = useTheme()
  const navigate = useNavigate()

  // Derive dark vs light from current theme
  const isDark = theme === 'midnight'

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
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [topic, setTopic] = useState('all')
  const [language, setLanguage] = useState('english')
  const [pdfUploading, setPdfUploading] = useState(false)
  const [evaluatingMsgKey, setEvaluatingMsgKey] = useState(null)
  const [evaluationByMsgKey, setEvaluationByMsgKey] = useState({})
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // ── Voice agent (real-time conversational AI) ─────────────────
  const {
    status: voiceStatus,
    liveTranscript,
    supported: voiceSupported,
    memory: voiceMemory,
    lastAgentResponse,
    toggleListening,
    stopSpeaking,
    stopAll: voiceStopAll,
    clearMemory: voiceClearMemory,
  } = useVoiceAgent({
    language,
    onError: (msg) => {
      console.warn('Voice agent error:', msg)
    },
  })

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

  const languages = [
    { id: 'english', name: 'English', short: 'EN' },
    { id: 'hindi', name: 'Hindi (हिंदी)', short: 'HI' },
    { id: 'bengali', name: 'Bengali (বাংলা)', short: 'BN' },
    { id: 'tamil', name: 'Tamil (தமிழ்)', short: 'TA' },
    { id: 'telugu', name: 'Telugu (తెలుగు)', short: 'TE' },
    { id: 'marathi', name: 'Marathi (मराठी)', short: 'MR' },
    { id: 'gujarati', name: 'Gujarati (ગુજરાતી)', short: 'GU' },
    { id: 'kannada', name: 'Kannada (ಕನ್ನಡ)', short: 'KN' },
    { id: 'malayalam', name: 'Malayalam (മലയാളം)', short: 'ML' },
    { id: 'punjabi', name: 'Punjabi (ਪੰਜਾਬੀ)', short: 'PA' },
    { id: 'urdu', name: 'Urdu (اردو)', short: 'UR' },
  ]

  const selectedRole = roles.find((r) => r.id === role) || roles[0]
  const selectedLanguage = languages.find((l) => l.id === language) || languages[0]

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
    sendMessage(input.trim(), role, topic, language)
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

  const handleFeedback = async (queryText, aiResponseText, rating) => {
    try {
      const userFeedback = rating > 0 ? 'Helpful' : 'Not Helpful'
      let userComment = ''

      if (rating < 0) {
        userComment = window.prompt(
          'Optional: tell us what was wrong (e.g., wrong IPC section, missing legal points, unclear explanation).',
          '',
        ) || ''
      }

      await sendFeedback(queryText, rating, role, {
        aiResponse: aiResponseText,
        userFeedback,
        userComment,
        comment: userComment,
      })
    } catch (err) {
      console.error('Feedback error:', err)
    }
  }

  const handleEvaluateAnswer = async (msg, index) => {
    const messageKey = msg.id || `msg_${index}`
    const queryText = messages[index - 1]?.text || ''
    const modelAnswer = msg?.text || ''
    const retrievedContext = Array.isArray(msg?.cases) ? msg.cases : []

    if (!queryText.trim() || !modelAnswer.trim()) {
      alert('Evaluation needs both the user query and model answer in chat history.')
      return
    }

    setEvaluatingMsgKey(messageKey)
    try {
      const result = await evaluateRagAnswer(queryText, retrievedContext, modelAnswer)
      setEvaluationByMsgKey((prev) => ({ ...prev, [messageKey]: result }))
    } catch (err) {
      setEvaluationByMsgKey((prev) => ({
        ...prev,
        [messageKey]: {
          query: queryText,
          scores: {
            context_relevance: { score: 0, reason: 'Evaluation request failed.' },
            groundedness: { score: 0, reason: 'Evaluation request failed.', unsupported_claims: [] },
            hallucination: { score: 0, reason: 'Evaluation request failed.', hallucinated_parts: [] },
            completeness: { score: 0, reason: 'Evaluation request failed.', missing_points: [] },
            accuracy: { score: 0, reason: 'Evaluation request failed.', errors: [] },
            citation_quality: { score: 0, reason: 'Evaluation request failed.', issues: [] },
          },
          final_verdict: {
            overall_score: 0,
            confidence: 'LOW',
            summary: err?.message || 'Could not evaluate this answer.',
          },
        },
      }))
    } finally {
      setEvaluatingMsgKey(null)
    }
  }

  // ── Confidence badge helper (enhanced with visual bar) ────────────
  const ConfidenceBadge = ({ confidence }) => {
    if (!confidence) return null
    const colors = {
      high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      low: 'text-red-400 bg-red-500/10 border-red-500/20',
    }
    const barColors = {
      high: 'bg-emerald-400',
      medium: 'bg-amber-400',
      low: 'bg-red-400',
    }
    const icons = {
      high: <CheckCircle className="size-3" />,
      medium: <Info className="size-3" />,
      low: <AlertTriangle className="size-3" />,
    }
    const pct = confidence.score > 0 ? (confidence.score * 100).toFixed(0) : null
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${colors[confidence.level] || colors.medium}`}
           title={confidence.explanation || 'AI confidence estimate'}>
        {icons[confidence.level]}
        <span>Confidence: {confidence.level?.toUpperCase()}</span>
        {pct && (
          <div className="flex items-center gap-1">
            <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColors[confidence.level] || barColors.medium}`}
                   style={{ width: `${pct}%` }} />
            </div>
            <span>{pct}%</span>
          </div>
        )}
      </div>
    )
  }

  // ── Structured output parser (IPC sections, key points, punishment) ─
  const ParsedLegalOutput = ({ text }) => {
    if (!text) return null

    // Extract IPC sections like "Section 420", "IPC 302", "S. 376"
    const ipcPattern = /(?:Section|IPC|S\.)\s*(\d+[A-Z]?)(?:\s*(?:of|,|\s)\s*(?:IPC|Indian Penal Code|BNS|CrPC))?/gi
    const ipcMatches = [...new Set((text.match(ipcPattern) || []).map(m => m.trim()))]

    // Extract punishment patterns
    const punishmentPattern = /(?:punish(?:ment|able)|imprison(?:ment|ed)|sentence[d]?|fine[d]?|death penalty|life imprisonment)[^.]*\./gi
    const punishmentMatches = (text.match(punishmentPattern) || []).slice(0, 3)

    const hasStructured = ipcMatches.length > 0 || punishmentMatches.length > 0
    if (!hasStructured) return null

    return (
      <div className="mt-3 space-y-2">
        {ipcMatches.length > 0 && (
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Scale className="size-3 text-blue-400" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-blue-400">IPC Sections Mentioned</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ipcMatches.map((s, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {punishmentMatches.length > 0 && (
          <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="size-3 text-red-400" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-red-400">Punishment / Penalty</span>
            </div>
            {punishmentMatches.map((p, i) => (
              <p key={i} className="text-[11px] text-red-300/80 leading-relaxed">{p}</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Inline book recommendations for chat messages ─────────────────
  const ChatBookRecommendations = ({ text }) => {
    const [recBooks, setRecBooks] = useState([])
    const [loaded, setLoaded] = useState(false)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

    useEffect(() => {
      if (!text || loaded) return
      // Extract IPC sections from the message
      const ipcPattern = /(?:Section|IPC|S\.)\s*(\d+[A-Z]?)/gi
      const matches = [...new Set((text.match(ipcPattern) || []).map(m => {
        const num = m.match(/\d+[A-Z]?/i)
        return num ? num[0] : null
      }).filter(Boolean))]

      if (matches.length === 0) { setLoaded(true); return }

      fetch(`${API_URL}/learning/books/smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text.slice(0, 120), detected_ipc: matches.slice(0, 3), max_results: 3 }),
      })
        .then(res => res.json())
        .then(data => {
          if (data?.success) {
            const all = [
              ...(data.data?.books?.ipc_books || []),
              ...(data.data?.books?.query_books || []),
            ].slice(0, 3)
            setRecBooks(all)
          }
        })
        .catch(() => {})
        .finally(() => setLoaded(true))
    }, [text, loaded, API_URL])

    if (recBooks.length === 0) return null

    return (
      <div className="mt-3 rounded-xl bg-purple-500/5 border border-purple-500/10 p-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <BookOpen className="size-3 text-purple-400" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400">Recommended Books</span>
        </div>
        <div className="space-y-1.5">
          {recBooks.map((book, i) => (
            <a
              key={book.id || i}
              href={book.previewLink || '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-purple-500/10 transition-colors group"
            >
              {book.thumbnail ? (
                <img src={book.thumbnail.replace('http://', 'https://')} alt="" className="w-6 h-8 rounded object-cover shrink-0" />
              ) : (
                <div className="w-6 h-8 rounded bg-purple-500/20 flex items-center justify-center shrink-0">
                  <BookOpen className="size-3 text-purple-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-purple-300 font-medium truncate group-hover:text-purple-200">{book.title}</p>
                <p className="text-[10px] text-purple-400/60 truncate">{(book.authors || []).join(', ')}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className={`h-screen flex overflow-hidden bg-gradient-to-br ${meta.gradient} ${meta.textPrimary}`}>

      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`h-full ${isDark ? 'bg-gray-900/90' : 'bg-white/70'} backdrop-blur-xl border-r ${meta.border} flex flex-col overflow-hidden`}
          >
            {/* Sidebar ▸ Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="CaseCut" className="h-8 w-8" />
                <span className={`text-lg font-semibold ${meta.textPrimary} tracking-tight`}>CaseCut AI</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-1.5 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Sidebar ▸ New Chat */}
            <div className="px-3 pb-3">
              <button
                onClick={handleNewChat}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium tracking-wide bg-${meta.accent}-500 hover:bg-${meta.accent}-600 text-white transition-all duration-200 active:scale-[0.98] shadow-lg`}
              >
                <Plus className="size-4" />
                New Chat
              </button>
            </div>

            {/* Sidebar ▸ Chat list (real-time) */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <div className={`text-[10px] font-medium uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'} px-2 mb-2`}>
                Recent
              </div>

              {chatList.length === 0 && (
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} px-2 py-4`}>No conversations yet</p>
              )}

              {chatList.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-all duration-150 mb-0.5 ${
                    activeChatId === chat.id
                      ? isDark ? 'bg-white/10 text-white' : 'bg-gray-200/60 text-gray-900'
                      : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare className={`size-3.5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className="text-xs truncate flex-1">
                    {chat.title || 'New conversation'}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeChat(chat.id) }}
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'} transition-all`}
                    title="Delete chat"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Sidebar ▸ Footer */}
            <div className={`p-3 border-t ${meta.border} space-y-1`}>
              <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${meta.textSecondary}`}>
                <User className="size-3.5" />
                <span className="text-xs truncate flex-1">{user?.email || 'Guest User'}</span>
              </div>
              <button
                onClick={() => navigate('/')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${meta.textSecondary} ${isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'} transition-all duration-150`}
              >
                <Home className="size-3.5" />
                <span className="text-xs">Back to Main Site</span>
              </button>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${meta.textSecondary} hover:bg-red-500/10 hover:text-red-400 transition-all duration-150`}
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
        <header className={`h-14 flex items-center justify-between px-4 border-b ${meta.border} ${isDark ? 'bg-gray-900/80' : 'bg-white/60'} backdrop-blur-md`}>
          {/* Left: sidebar toggle + logo */}
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className={`p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
              >
                <Menu className="size-5" />
              </button>
            )}
            {!sidebarOpen && (
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="CaseCut" className="h-7 w-7" />
                <span className={`text-base font-medium ${meta.textPrimary} tracking-tight`}>CaseCut AI</span>
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
            <ThemeToggle variant={isDark ? 'dark' : 'auto'} />
            <Avatar className="size-8" title={user?.email || 'User'}>
              {user?.photoURL && <AvatarImage src={user.photoURL} alt={user?.displayName || user?.email} />}
              <AvatarFallback className="bg-gradient-to-br from-[#1488fc] to-[#7c5df0] text-white text-xs font-semibold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
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

                <h1 className={`text-3xl sm:text-4xl font-light ${meta.textPrimary} tracking-tight mb-2`}>
                  {pdfDocument ? 'Ask about your document' : (
                    <>
                      What would you like to{' '}
                      <span className={`bg-gradient-to-b from-${meta.accent}-500 via-${meta.accent}-500 to-${meta.accent}-300 bg-clip-text text-transparent italic`}>
                        research
                      </span>
                      ?
                    </>
                  )}
                </h1>
                <p className={`${meta.textSecondary} text-base mb-4 font-light tracking-wide`}>
                  {pdfDocument
                    ? 'Your document is loaded. Ask questions and get citation-backed answers.'
                    : 'AI-powered legal research for Indian courts and judgments.'
                  }
                </p>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
                  <div className={`flex items-center gap-1.5 text-[11px] ${meta.textSecondary}`}>
                    <Scale className="size-3 text-blue-400" />
                    <span>39+ case judgments indexed</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] ${meta.textSecondary}`}>
                    <BookOpen className="size-3 text-emerald-400" />
                    <span>IPC auto-detection</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] ${meta.textSecondary}`}>
                    <CheckCircle className="size-3 text-purple-400" />
                    <span>RAG-verified sources</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-w-xl mx-auto">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className={`p-4 text-left text-[13px] tracking-wide rounded-xl border shadow-sm transition-all duration-200 ${
                        isDark
                          ? 'text-gray-400 border-white/[0.06] bg-gray-800/50 hover:bg-gray-700/50 hover:text-white hover:border-white/10'
                          : `${meta.textSecondary} ${meta.border} ${meta.cardBg} hover:bg-white/80 hover:text-gray-900 hover:border-gray-300`
                      }`}
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
              {messages.map((msg, i) => {
                const messageKey = msg.id || `msg_${i}`
                const evaluation = evaluationByMsgKey[messageKey]

                return (
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
                        ? `bg-${meta.accent}-500 text-white`
                        : isDark
                          ? 'bg-gray-800/60 text-gray-200 border border-white/[0.06]'
                          : `${meta.cardBg} ${meta.textPrimary} border ${meta.border} shadow-sm backdrop-blur-md`
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        {/* AI Suggestion label */}
                        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/[0.06]">
                          <Sparkles className="size-3 text-[#1488fc]" />
                          <span className="text-[10px] font-medium uppercase tracking-wider text-[#1488fc]">AI Suggestion</span>
                          {msg.confidence && <ConfidenceBadge confidence={msg.confidence} />}
                        </div>
                        <div className="markdown-body text-[13.5px] leading-relaxed tracking-normal">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text || ''}
                          </ReactMarkdown>
                        </div>
                        {/* Structured legal data extraction */}
                        <ParsedLegalOutput text={msg.text} />
                        {/* Book recommendations based on IPC sections */}
                        <ChatBookRecommendations text={msg.text} />
                      </>
                    ) : (
                      <p className="text-[13.5px] leading-relaxed tracking-normal whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {/* Case citations — with numbered source cards */}
                    {msg.cases && msg.cases.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
                        <div className="text-xs font-medium text-[#8a8a8f] uppercase tracking-wider flex items-center gap-2">
                          <BookOpen className="size-3" />
                          Supporting Sources ({msg.cases.length})
                        </div>
                        {msg.cases.map((c, j) => (
                          <details key={j} className="text-xs group rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                            <summary className="cursor-pointer text-[#4da5fc] hover:text-[#6ab8ff] transition-colors font-normal tracking-wide px-2.5 py-2 flex items-center gap-2">
                              <span className="flex-shrink-0 size-5 rounded-md bg-[#1488fc]/15 text-[#4da5fc] text-[10px] font-semibold flex items-center justify-center">{j + 1}</span>
                              {c.approximate_page ? (
                                <span>Section ~Page {c.approximate_page}, Chunk {c.chunk_index + 1} <span className="text-emerald-400 ml-1">(Relevance: {(c.similarity * 100).toFixed(0)}%)</span></span>
                              ) : (
                                <span>
                                  {c.court && `${c.court}`}
                                  {c.date && ` — ${c.date}`}
                                  {c.ipc_sections?.length > 0 && ` — IPC ${c.ipc_sections.slice(0, 3).join(', ')}`}
                                </span>
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

                    {/* Feedback + Verify disclaimer */}
                    {msg.role === 'assistant' && msg.text && (
                      <div className="mt-3 pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertTriangle className="size-3 text-amber-400/60" />
                          <span className="text-[10px] text-amber-400/60 italic">AI-generated — verify before use in legal proceedings</span>
                        </div>
                        <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#5a5a5f]">Helpful?</span>
                        <button
                          onClick={() => handleFeedback(messages[i - 1]?.text || '', msg.text || '', 1)}
                          className="p-1 rounded hover:bg-green-500/10 text-[#5a5a5f] hover:text-green-400 transition-colors"
                          title="Helpful"
                        >
                          <ThumbsUp className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(messages[i - 1]?.text || '', msg.text || '', -1)}
                          className="p-1 rounded hover:bg-red-500/10 text-[#5a5a5f] hover:text-red-400 transition-colors"
                          title="Not helpful"
                        >
                          <ThumbsDown className="size-3.5" />
                        </button>

                        <button
                          onClick={() => handleEvaluateAnswer(msg, i)}
                          disabled={evaluatingMsgKey === messageKey}
                          className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium text-[#8a8a8f] border border-white/[0.08] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Evaluate this answer quality"
                        >
                          {evaluatingMsgKey === messageKey ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              <span>Evaluating…</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3" />
                              <span>{evaluation ? 'Re-evaluate' : 'Evaluate'}</span>
                            </>
                          )}
                        </button>
                      </div>
                      </div>
                    )}

                    {msg.role === 'assistant' && evaluation && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a8a8f]">
                            RAG Evaluation
                          </p>
                          <div className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            evaluation.final_verdict?.confidence === 'HIGH'
                              ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                              : evaluation.final_verdict?.confidence === 'MEDIUM'
                                ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                                : 'text-red-300 bg-red-500/10 border-red-500/20'
                          }`}>
                            Overall: {Number(evaluation.final_verdict?.overall_score || 0).toFixed(2)} / 5 • {evaluation.final_verdict?.confidence || 'LOW'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            ['Context Relevance', evaluation.scores?.context_relevance],
                            ['Groundedness', evaluation.scores?.groundedness],
                            ['Hallucination', evaluation.scores?.hallucination],
                            ['Completeness', evaluation.scores?.completeness],
                            ['Accuracy', evaluation.scores?.accuracy],
                            ['Citation Quality', evaluation.scores?.citation_quality],
                          ].map(([label, item]) => (
                            <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] uppercase tracking-wider text-[#7a7a7f]">{label}</span>
                                <span className="text-[11px] font-medium text-white">{Number(item?.score ?? 0)} / 5</span>
                              </div>
                              <p className="text-[11px] text-[#9a9aa0] leading-relaxed">{item?.reason || 'No reason provided.'}</p>
                            </div>
                          ))}
                        </div>

                        {evaluation.final_verdict?.summary && (
                          <p className="text-[11px] text-[#a5a5ab] leading-relaxed">
                            {evaluation.final_verdict.summary}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Model tag */}
                    {msg.model && (
                      <p className="mt-1 text-[10px] text-[#4a4a4f]">Model: {msg.model}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className={`size-7 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                        <User className={`size-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      </div>
                    </div>
                  )}
                </motion.div>
                )
              })}

              {/* Loading indicator with typing animation */}
              {loading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="size-7 rounded-full bg-gradient-to-br from-[#1488fc] to-[#7c5df0] flex items-center justify-center">
                      <img src={logo} alt="" className="size-4" />
                    </div>
                  </div>
                  <div className={`${isDark ? 'bg-gray-800/60 text-gray-400 border border-white/[0.06]' : `${meta.cardBg} ${meta.textSecondary} border ${meta.border} shadow-sm backdrop-blur-md`} rounded-2xl px-5 py-3.5 space-y-2`}>
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-[#1488fc]" />
                      <ShiningText text="CaseCut AI is thinking..." />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#5a5a5f]">
                      <span className="flex items-center gap-1"><Scale className="size-3" /> Searching cases</span>
                      <span className="flex items-center gap-1"><BookOpen className="size-3" /> Checking IPC sections</span>
                      <span className="flex items-center gap-1"><Sparkles className="size-3" /> Generating response</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input area ───────────────────────────────────────── */}
        <div className={`p-4 ${isDark ? 'bg-gray-950/80' : 'bg-white/40'} backdrop-blur-md`}>
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

            {/* Live voice transcript */}
            <AnimatePresence>
              {liveTranscript && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-red-500"></span>
                    </span>
                    <p className="text-sm text-red-300 italic truncate">{liveTranscript}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className={`relative rounded-2xl ${isDark ? 'bg-gray-800/80 ring-1 ring-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_rgba(0,0,0,0.4)]' : `${meta.cardBg} ring-1 ring-gray-200 shadow-lg border ${meta.border}`} backdrop-blur-xl px-4 py-2.5 sm:px-5 sm:py-3`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pdfDocument ? `Ask about "${pdfDocument.filename}"…` : "Ask about bail, IPC sections, precedents..."}
                disabled={loading}
                className={`w-full resize-none bg-transparent text-[15px] ${meta.textPrimary} ${isDark ? 'placeholder-gray-500' : 'placeholder-gray-400'} focus:outline-none min-h-[46px] max-h-[200px] pt-0.5 pb-1`}
                style={{ height: '48px' }}
              />

              <div className="mt-1.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 relative">
                    <ToolsDropdown
                      onUploadPdf={handlePdfUpload}
                      topic={topic}
                      setTopic={setTopic}
                      topics={topics}
                      pdfUploading={pdfUploading}
                      placement="bottom"
                    />
                  </div>

                  <div className="shrink-0 relative">
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(!roleDropdownOpen)
                        setLanguageDropdownOpen(false)
                      }}
                      className={`
                        h-8 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${roleDropdownOpen
                          ? isDark ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-gray-200 text-gray-900 ring-1 ring-gray-300'
                          : isDark ? 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/[0.08]' : `${meta.textSecondary} hover:text-gray-900 hover:bg-gray-100 border border-gray-200`
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
                            className={`absolute left-0 bottom-full mb-2 z-50 w-[240px] origin-bottom-left ${isDark ? 'bg-gray-900/98' : 'bg-white/95'} backdrop-blur-2xl border ${meta.border} rounded-2xl shadow-[0_16px_70px_-12px_rgba(0,0,0,0.5)] overflow-hidden`}
                          >
                            <div className="p-2">
                              <div className={`px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                AI Perspective
                              </div>
                              {roles.map((r) => (
                                <button
                                  key={r.id}
                                  onClick={() => { setRole(r.id); setRoleDropdownOpen(false) }}
                                  className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150
                                    ${role === r.id
                                      ? isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'
                                      : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                  `}
                                >
                                  <div className={`flex-shrink-0 size-8 rounded-lg ${isDark ? 'bg-white/[0.04] ring-1 ring-white/[0.06]' : 'bg-gray-100 ring-1 ring-gray-200'} flex items-center justify-center`}>
                                    {r.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[13px] font-medium block leading-tight">{r.name}</span>
                                    <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'} leading-tight`}>{r.description}</span>
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

                  <div className="shrink-0 relative">
                    <button
                      onClick={() => {
                        setLanguageDropdownOpen(!languageDropdownOpen)
                        setRoleDropdownOpen(false)
                      }}
                      className={`
                        h-8 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${languageDropdownOpen
                          ? isDark ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-gray-200 text-gray-900 ring-1 ring-gray-300'
                          : isDark ? 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/[0.08]' : `${meta.textSecondary} hover:text-gray-900 hover:bg-gray-100 border border-gray-200`
                        }
                      `}
                      title="Select response language"
                    >
                      <Languages className="size-3.5" />
                      <span className="hidden md:inline">{selectedLanguage.name}</span>
                      <span className="md:hidden">{selectedLanguage.short}</span>
                      <ChevronDown className={`size-3 transition-transform duration-200 ${languageDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {languageDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setLanguageDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className={`absolute left-0 bottom-full mb-2 z-50 w-[260px] origin-bottom-left ${isDark ? 'bg-gray-900/98' : 'bg-white/95'} backdrop-blur-2xl border ${meta.border} rounded-2xl shadow-[0_16px_70px_-12px_rgba(0,0,0,0.5)] overflow-hidden`}
                          >
                            <div className="p-2">
                              <div className={`px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Response Language
                              </div>
                              {languages.map((l) => (
                                <button
                                  key={l.id}
                                  onClick={() => { setLanguage(l.id); setLanguageDropdownOpen(false) }}
                                  className={`
                                    w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all duration-150
                                    ${language === l.id
                                      ? isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'
                                      : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                  `}
                                >
                                  <span className="text-[13px] font-medium">{l.name}</span>
                                  {language === l.id && (
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

                  <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-normal tracking-wide ${isDark ? 'text-gray-500 bg-white/[0.02] border border-white/[0.05]' : `${meta.textSecondary} bg-gray-100/50 border border-gray-200`}`}>
                    {pdfDocument ? <FileText className="size-3.5 text-blue-400" /> : <BookOpen className="size-3.5" />}
                    <span>{pdfDocument ? 'PDF Chat' : 'Indian Law'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Voice status indicator */}
                  <AnimatePresence>
                    {(voiceStatus === 'listening' || voiceStatus === 'processing' || voiceStatus === 'speaking') && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                          voiceStatus === 'listening'
                            ? 'text-red-400 bg-red-500/10 border-red-500/20'
                            : voiceStatus === 'processing'
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        }`}
                      >
                        {voiceStatus === 'listening' && (
                          <>
                            <span className="relative flex size-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full size-2 bg-red-500"></span>
                            </span>
                            <span>Listening…</span>
                          </>
                        )}
                        {voiceStatus === 'processing' && (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            <span>Processing…</span>
                          </>
                        )}
                        {voiceStatus === 'speaking' && (
                          <>
                            <Volume2 className="size-3" />
                            <span>Speaking…</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mic button — opens voice agent overlay */}
                  {voiceSupported && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (voiceStatus === 'listening' || voiceStatus === 'speaking' || voiceStatus === 'processing') {
                          voiceStopAll()
                          setVoiceOverlayOpen(false)
                        } else {
                          setVoiceOverlayOpen(true)
                          toggleListening()
                        }
                      }}
                      disabled={loading}
                      className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-full transition-all duration-200 ${
                        voiceStatus === 'listening'
                          ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                          : voiceStatus === 'processing'
                            ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                            : voiceStatus === 'speaking'
                              ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                              : isDark
                                ? 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/[0.08]'
                                : `${meta.textSecondary} hover:text-gray-900 hover:bg-gray-100 border border-gray-200`
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                      title={voiceStatus !== 'idle' ? 'Stop voice agent' : 'Voice Agent — talk with AI'}
                    >
                      {voiceStatus !== 'idle' ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                    </motion.button>
                  )}

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className={`h-9 shrink-0 flex items-center gap-2 px-4 rounded-full text-sm font-medium bg-${meta.accent}-500 hover:bg-${meta.accent}-600 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg`}
                  >
                    <span className="hidden sm:inline">{pdfDocument ? 'Ask' : 'Search'}</span>
                    <SendHorizontal className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy & security note */}
            <div className={`mt-2 flex items-center justify-center gap-1.5 text-[10px] ${meta.textSecondary}`}>
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>Your legal data is private & सुरक्षित (secure) • End-to-end encrypted • Not used for training</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ VOICE AGENT OVERLAY ══════════════════ */}
      <AnimatePresence>
        {voiceOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0a0a0c]/98 backdrop-blur-2xl flex flex-col items-center justify-center"
          >
            {/* Close / Stop button */}
            <button
              onClick={() => {
                voiceStopAll()
                setVoiceOverlayOpen(false)
              }}
              className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-[#6a6a6f] hover:text-white transition-all border border-white/[0.06]"
            >
              <X className="size-5" />
            </button>

            {/* Clear memory button */}
            {voiceMemory.length > 0 && (
              <button
                onClick={voiceClearMemory}
                className="absolute top-6 left-6 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[#6a6a6f] hover:text-white transition-all border border-white/[0.06] text-xs"
              >
                Clear Memory ({voiceMemory.length} turns)
              </button>
            )}

            {/* Branding */}
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="CaseCut" className="h-8 w-8" />
              <span className="text-lg font-semibold text-white">CaseCut AI Voice Agent</span>
            </div>

            <p className="text-xs text-[#5a5a5f] mb-6 max-w-sm text-center">
              Real-time conversation — speak naturally, interrupt anytime. The agent remembers your conversation.
            </p>

            {/* Voice visualizer */}
            <VoiceChat
              inline
              status={voiceStatus}
              onToggle={() => {
                if (voiceStatus === 'speaking') {
                  // Barge-in: stop speaking and start listening
                  toggleListening()
                } else if (voiceStatus === 'processing') {
                  voiceStopAll()
                } else {
                  toggleListening()
                }
              }}
              className="bg-transparent"
            />

            {/* Live transcript */}
            <AnimatePresence>
              {liveTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-4 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 max-w-md text-center"
                >
                  <p className="text-sm text-white/80 italic">"{liveTranscript}"</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent response display */}
            <AnimatePresence>
              {lastAgentResponse && voiceStatus !== 'listening' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-4 px-6 py-4 rounded-2xl bg-[#1488fc]/10 backdrop-blur-md border border-[#1488fc]/20 max-w-lg text-center"
                >
                  <p className="text-sm text-white/90 leading-relaxed">{lastAgentResponse}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Processing / Speaking status with stop button */}
            <AnimatePresence>
              {voiceStatus === 'processing' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-4 flex flex-col items-center gap-3"
                >
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Agent is thinking...</span>
                  </div>
                </motion.div>
              )}
              {voiceStatus === 'speaking' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-4 flex flex-col items-center gap-3"
                >
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Volume2 className="size-4" />
                    <span>Agent is speaking — tap to interrupt</span>
                  </div>
                  <button
                    onClick={() => toggleListening()}
                    className="px-4 py-1.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-all"
                  >
                    Interrupt & Speak
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversation memory indicator */}
            {voiceMemory.length > 0 && (
              <div className="mt-4 max-w-sm w-full max-h-32 overflow-y-auto px-2">
                <p className="text-[10px] text-[#5a5a5f] text-center mb-2 uppercase tracking-wider">
                  Conversation Memory ({voiceMemory.length} turns)
                </p>
                <div className="space-y-1">
                  {voiceMemory.slice(-6).map((turn, i) => (
                    <div
                      key={i}
                      className={`text-[11px] px-3 py-1.5 rounded-lg ${
                        turn.role === 'user'
                          ? 'bg-white/5 text-white/60 text-right'
                          : 'bg-[#1488fc]/10 text-[#4da5fc] text-left'
                      }`}
                    >
                      <span className="truncate block">{turn.text.slice(0, 80)}{turn.text.length > 80 ? '…' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action hints */}
            <div className="mt-6 flex flex-col items-center gap-3">
              {/* Language selector inside overlay */}
              <div className="flex items-center gap-2">
                {['english', 'hindi'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      language === lang
                        ? 'bg-[#1488fc] text-white'
                        : 'bg-white/5 text-[#8a8a8f] hover:bg-white/10 border border-white/[0.08]'
                    }`}
                  >
                    {lang === 'english' ? 'English' : 'Hindi (हिंदी)'}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-[#5a5a5f]">
                {voiceStatus === 'idle' && 'Tap the circle to start a conversation'}
                {voiceStatus === 'listening' && 'Listening... speak your legal question'}
                {voiceStatus === 'processing' && 'Processing your query...'}
                {voiceStatus === 'speaking' && 'Tap circle to interrupt and speak'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════ SUMMARIZER MODAL ══════════════════ */}
    </div>
  )
}
