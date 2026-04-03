/**
 * VoiceAssistantPage — Dedicated hands-free conversational AI page.
 *
 * Features:
 *  - Continuous voice conversation (tap once to start)
 *  - Barge-in: interrupt AI by speaking
 *  - Tap-to-stop session control
 *  - Full chat transcript with Firestore persistence
 *  - Session history sidebar
 *  - Multi-language support
 *  - Theme-aware (midnight / lavender / ocean / courtroom)
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useVoiceChat } from '../hooks/useVoiceChat'
import { VoiceChat } from '../components/ui/ia-siri-chat'
import ThemeToggle from '../components/ThemeToggle'
import {
  ArrowLeft, Plus, Trash2, Mic,
  Loader2, Square, MessageSquare,
  Clock, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../../assets/Logo.svg'

// ── Language options ──────────────────────────────────────────────
const LANGUAGES = [
  { id: 'english', label: 'EN', name: 'English' },
  { id: 'hindi',   label: 'HI', name: 'Hindi' },
  { id: 'bengali', label: 'BN', name: 'Bengali' },
  { id: 'tamil',   label: 'TA', name: 'Tamil' },
  { id: 'telugu',  label: 'TE', name: 'Telugu' },
  { id: 'marathi', label: 'MR', name: 'Marathi' },
  { id: 'gujarati',  label: 'GU', name: 'Gujarati' },
  { id: 'kannada',   label: 'KN', name: 'Kannada' },
  { id: 'malayalam', label: 'ML', name: 'Malayalam' },
  { id: 'punjabi',   label: 'PA', name: 'Punjabi' },
  { id: 'urdu',      label: 'UR', name: 'Urdu' },
]

export default function VoiceAssistantPage() {
  const { user } = useAuth()
  const { theme, meta } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'midnight'

  const [language, setLanguage] = useState('english')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const transcriptRef = useRef(null)

  const {
    status,
    liveTranscript,
    supported,
    toggleListening,
    stopAll,
    sessions,
    activeSessionId,
    messages,
    startNewSession,
    selectSession,
    removeSession,
  } = useVoiceChat(user, {
    language,
    onError: (msg) => console.warn('Voice error:', msg),
  })

  const isActive = status !== 'idle'

  // ── Auto-scroll transcript to bottom ───────────────────────────
  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, liveTranscript])

  // ── Format Firestore timestamp ─────────────────────────────────
  const formatTime = (ts) => {
    if (!ts) return ''
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // ── Browser not supported ──────────────────────────────────────
  if (!supported) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${meta.gradient} flex items-center justify-center p-4`}>
        <div className={`rounded-2xl ${meta.cardBg} backdrop-blur-md border ${meta.border} p-8 text-center max-w-md`}>
          <Mic className={`mx-auto mb-4 size-12 ${meta.textSecondary}`} />
          <h2 className={`text-xl font-bold ${meta.textPrimary} mb-2`}>Voice Not Supported</h2>
          <p className={`${meta.textSecondary} mb-6`}>
            Your browser doesn't support the Web Speech API. Please use Google Chrome or Microsoft Edge for the voice assistant.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex flex-col bg-gradient-to-br ${meta.gradient} overflow-hidden`}>

      {/* ═══════════════════ TOP BAR ══════════════════════════════ */}
      <header className={`flex items-center gap-3 px-4 py-3 border-b ${meta.border} ${meta.navBg} backdrop-blur-xl z-20`}>
        {/* Back */}
        <button
          onClick={() => navigate('/chat')}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${meta.textSecondary} transition-colors`}
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* Logo + Title */}
        <div className="flex items-center gap-2">
          <img src={logo} alt="CaseCut" className="h-6 w-6" />
          <h1 className={`text-sm font-semibold ${meta.textPrimary}`}>Voice Assistant</h1>
          <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
          }`}>
            BETA
          </span>
        </div>

        <div className="flex-1" />

        {/* Language pills — desktop */}
        <div className="hidden md:flex items-center gap-1">
          {LANGUAGES.slice(0, 6).map((l) => (
            <button
              key={l.id}
              onClick={() => setLanguage(l.id)}
              title={l.name}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                language === l.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : isDark
                    ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                    : 'bg-black/5 text-gray-600 hover:bg-black/10'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <ThemeToggle variant={isDark ? 'dark' : 'auto'} />

        {/* Stop button — visible during active session */}
        <AnimatePresence>
          {isActive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={stopAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
            >
              <Square className="size-3 fill-white" />
              <span>Stop</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Sidebar toggle — mobile */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className={`p-2 rounded-lg sm:hidden ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${meta.textSecondary} transition-colors`}
        >
          <MessageSquare className="size-5" />
        </button>
      </header>

      {/* ═══════════════════ MAIN CONTENT ═════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── Session Sidebar ─── */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop — mobile only */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/40 z-20 sm:hidden"
              />
              <motion.aside
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`fixed sm:relative z-30 sm:z-auto w-72 h-full border-r ${meta.border} ${meta.navBg} backdrop-blur-xl flex flex-col`}
              >
                {/* Sidebar header */}
                <div className={`p-3 border-b ${meta.border}`}>
                  <button
                    onClick={() => { startNewSession(); setSidebarOpen(false) }}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isDark
                        ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/20'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/50'
                    }`}
                  >
                    <Plus className="size-4" />
                    New Session
                  </button>
                </div>

                {/* Session list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-3 gap-3">
                      <Mic className={`size-8 ${meta.textSecondary} opacity-30`} />
                      <p className={`text-xs ${meta.textSecondary} text-center`}>
                        No voice sessions yet. Start speaking to create one!
                      </p>
                    </div>
                  ) : (
                    sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { selectSession(s.id); setSidebarOpen(false) }}
                        className={`group w-full text-left rounded-xl px-3 py-2.5 text-xs transition-all ${
                          activeSessionId === s.id
                            ? isDark
                              ? 'bg-purple-500/20 border border-purple-500/30 text-white'
                              : 'bg-purple-50 border border-purple-200 text-gray-900'
                            : isDark
                              ? 'hover:bg-white/5 text-gray-300 border border-transparent'
                              : 'hover:bg-black/5 text-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium flex-1">
                            {s.title || 'Voice Session'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSession(s.id) }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                        {s.updatedAt && (
                          <div className={`mt-1 flex items-center gap-1 text-[10px] ${meta.textSecondary}`}>
                            <Clock className="size-2.5" />
                            <span>{formatDate(s.updatedAt)} {formatTime(s.updatedAt)}</span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ─── Center Content ─── */}
        <div className="flex-1 flex flex-col items-center overflow-hidden">
          {/* Desktop sidebar toggle */}
          <div className="hidden sm:flex w-full px-2 pt-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/5 text-gray-500' : 'hover:bg-black/5 text-gray-400'} transition-colors`}
              title={sidebarOpen ? 'Hide sessions' : 'Show sessions'}
            >
              {sidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          </div>

          {/* ── Voice Orb ── */}
          <div className="flex-shrink-0 pt-2 sm:pt-6">
            <VoiceChat
              inline
              status={status}
              onToggle={() => {
                if (status === 'speaking') {
                  // Barge-in: interrupt AI and start listening
                  toggleListening()
                } else if (status === 'processing') {
                  stopAll()
                } else {
                  toggleListening()
                }
              }}
              className="bg-transparent"
            />
          </div>

          {/* ── Live Transcript Pill ── */}
          <AnimatePresence>
            {liveTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`mx-4 mt-1 px-5 py-2.5 rounded-2xl ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                } backdrop-blur-md border max-w-md text-center`}
              >
                <p className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-700'} italic`}>
                  &ldquo;{liveTranscript}&rdquo;
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Status Hint ── */}
          <div className="flex items-center gap-2 mt-2">
            <p className={`text-xs ${meta.textSecondary}`}>
              {status === 'idle' && 'Tap the circle to start a conversation'}
              {status === 'listening' && 'Listening — speak your legal question'}
              {status === 'processing' && 'Processing your query...'}
              {status === 'speaking' && 'Speaking — tap circle to interrupt'}
            </p>
            {status === 'speaking' && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`inline-block size-2 rounded-full ${isDark ? 'bg-green-400' : 'bg-green-600'}`}
              />
            )}
            {status === 'listening' && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className={`inline-block size-2 rounded-full ${isDark ? 'bg-red-400' : 'bg-red-600'}`}
              />
            )}
            {status === 'processing' && (
              <Loader2 className={`size-3 animate-spin ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            )}
          </div>

          {/* Language selector — mobile */}
          <div className="flex md:hidden items-center gap-1 mt-2 flex-wrap justify-center px-4">
            {LANGUAGES.slice(0, 6).map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  language === l.id
                    ? 'bg-purple-600 text-white'
                    : isDark
                      ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                      : 'bg-black/5 text-gray-600 hover:bg-black/10'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* ═══════════ Chat Transcript ═══════════ */}
          <div className="flex-1 w-full max-w-2xl mx-auto mt-3 mb-3 px-4 overflow-hidden">
            <div
              ref={transcriptRef}
              className={`h-full rounded-2xl ${meta.cardBg} backdrop-blur-md border ${meta.border} p-4 overflow-y-auto`}
            >
              {messages.length === 0 && !liveTranscript ? (
                /* ── Empty state ── */
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className={`p-4 rounded-full ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
                    <Mic className={`size-8 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${meta.textPrimary} mb-1`}>
                      Ready to Assist
                    </p>
                    <p className={`text-xs ${meta.textSecondary} max-w-xs`}>
                      Tap the orb above to start speaking. Your conversation will appear here in real-time.
                    </p>
                  </div>
                  <div className={`flex flex-wrap justify-center gap-2 max-w-sm`}>
                    {['What is Section 420 IPC?', 'Explain anticipatory bail', 'Rights under Article 21'].map((q) => (
                      <span
                        key={q}
                        className={`text-[10px] px-3 py-1.5 rounded-full ${
                          isDark
                            ? 'bg-white/5 text-gray-400 border border-white/10'
                            : 'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}
                      >
                        &ldquo;{q}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Message list ── */
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? isDark
                              ? 'bg-purple-600/25 text-white border border-purple-500/20'
                              : 'bg-purple-100 text-gray-900 border border-purple-200/50'
                            : isDark
                              ? 'bg-white/5 text-gray-200 border border-white/10'
                              : 'bg-white/80 text-gray-800 border border-gray-200/50'
                        }`}
                      >
                        {/* Message header */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {msg.role === 'user' ? (
                            <Mic className="size-3 opacity-50" />
                          ) : (
                            <img src={logo} alt="" className="size-3.5 opacity-70" />
                          )}
                          <span className="text-[10px] font-medium opacity-50">
                            {msg.role === 'user' ? 'You' : 'CaseCut AI'}
                            {msg.timestamp ? ` \u2022 ${formatTime(msg.timestamp)}` : ''}
                          </span>
                        </div>

                        {/* Message body */}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Processing indicator */}
                  <AnimatePresence>
                    {status === 'processing' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                      >
                        <div className={`rounded-2xl px-4 py-3 ${
                          isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-gray-200/50'
                        } border`}>
                          <div className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin text-purple-500" />
                            <span className={`text-xs ${meta.textSecondary}`}>Thinking...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ FOOTER ═══════════════════════════════ */}
      <footer className={`border-t ${meta.border} px-4 py-2 text-center`}>
        <div className="flex items-center justify-center gap-1.5">
          <svg className="size-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <p className={`text-[10px] ${meta.textSecondary}`}>
            Voice data is processed in real-time and not stored as audio &bull; All text is encrypted &bull; CaseCut AI
          </p>
        </div>
      </footer>
    </div>
  )
}
