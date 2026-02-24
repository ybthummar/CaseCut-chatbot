import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import SummarizerModal from '../components/SummarizerModal'
import {
  SendHorizontal, Menu, LogOut, User, Plus, MessageSquare,
  ChevronDown, Scale, Briefcase, GraduationCap, Loader2,
  BookOpen, X, ThumbsUp, ThumbsDown, Filter, Sparkles,
  Home, Trash2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  } = useChat(user)

  // ── Local UI state ────────────────────────────────────────────────
  const [input, setInput] = useState('')
  const [role, setRole] = useState('lawyer')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [topic, setTopic] = useState('all')
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false)
  const [summarizerOpen, setSummarizerOpen] = useState(false)
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
  ]

  const selectedRole = roles.find((r) => r.id === role) || roles[0]

  const suggestedPrompts = [
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
    await logout()
    navigate('/')
  }

  const handleNewChat = () => {
    startNewChat()
    setInput('')
  }

  const sendFeedback = async (queryText, rating) => {
    try {
      await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, rating, role }),
      })
    } catch (err) {
      console.error('Feedback error:', err)
    }
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
                <span className="text-xs truncate flex-1">{user?.email}</span>
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
                <span className="text-xs">Log out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══════════════════════ MAIN AREA ══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Header ───────────────────────────────────────────── */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0f0f0f]">
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
                <img src={logo} alt="CaseCut" className="h-8 w-8" />
                <span className="text-lg font-bold text-white">CaseCut AI</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Summarizer */}
            <button
              onClick={() => setSummarizerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200 border border-purple-500/20"
            >
              <Sparkles className="size-3.5" />
              <span className="hidden sm:inline">Summarizer</span>
            </button>

            {/* Topic Filter */}
            <div className="relative">
              <button
                onClick={() => setTopicDropdownOpen(!topicDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-[#8a8a8f] hover:text-white hover:bg-white/5 transition-all duration-200 border border-white/[0.08]"
              >
                <Filter className="size-3.5" />
                <span>{topics.find((t) => t.id === topic)?.name || 'All Topics'}</span>
                <ChevronDown className={`size-3 transition-transform duration-200 ${topicDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {topicDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTopicDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden max-h-64 overflow-y-auto">
                    <div className="p-1.5">
                      <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f]">
                        Filter by Topic
                      </div>
                      {topics.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setTopic(t.id); setTopicDropdownOpen(false) }}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                            topic === t.id ? 'bg-white/10 text-white' : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="text-sm font-medium">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Role Selector */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-[#8a8a8f] hover:text-white hover:bg-white/5 transition-all duration-200 border border-white/[0.08]"
              >
                {selectedRole.icon}
                <span>{selectedRole.name}</span>
                <ChevronDown className={`size-3 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {roleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
                    <div className="p-1.5">
                      <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f]">
                        Select Role
                      </div>
                      {roles.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { setRole(r.id); setRoleDropdownOpen(false) }}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                            role === r.id ? 'bg-white/10 text-white' : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex-shrink-0">{r.icon}</div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block">{r.name}</span>
                            <span className="text-[11px] text-[#6a6a6f]">{r.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Messages area ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ── Empty state ─────────────────────────────────── */
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="max-w-2xl w-full text-center">
                <img src={logo} alt="CaseCut" className="h-16 w-16 mx-auto mb-6 opacity-60" />
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
                  What would you like to{' '}
                  <span className="bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text text-transparent italic">
                    research
                  </span>
                  ?
                </h1>
                <p className="text-[#8a8a8f] text-base mb-8">
                  AI-powered legal research for Indian courts and judgments.
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {/* Case citations */}
                    {msg.cases && msg.cases.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
                        <p className="text-xs font-semibold text-[#8a8a8f] uppercase tracking-wide">Case Citations</p>
                        {msg.cases.map((c, j) => (
                          <details key={j} className="text-xs group">
                            <summary className="cursor-pointer text-[#4da5fc] hover:text-[#6ab8ff] transition-colors font-medium">
                              Case {j + 1} {c.court && `(${c.court})`}{' '}
                              {c.ipc_sections?.length > 0 && `- IPC ${c.ipc_sections.slice(0, 2).join(', ')}`}
                            </summary>
                            <p className="mt-2 pl-3 text-[11px] text-[#8a8a8f] leading-relaxed border-l-2 border-white/[0.06]">
                              {c.text}
                            </p>
                            {c.outcome && c.outcome !== 'unknown' && (
                              <p className="mt-1 pl-3 text-[10px] text-emerald-400/70">Outcome: {c.outcome}</p>
                            )}
                          </details>
                        ))}
                      </div>
                    )}

                    {/* Feedback */}
                    {msg.role === 'assistant' && msg.text && (
                      <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center gap-2">
                        <span className="text-[10px] text-[#5a5a5f]">Helpful?</span>
                        <button
                          onClick={() => sendFeedback(messages[i - 1]?.text || '', 1)}
                          className="p-1 rounded hover:bg-green-500/10 text-[#5a5a5f] hover:text-green-400 transition-colors"
                          title="Helpful"
                        >
                          <ThumbsUp className="size-3.5" />
                        </button>
                        <button
                          onClick={() => sendFeedback(messages[i - 1]?.text || '', -1)}
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
            <div className="relative rounded-2xl bg-[#1e1e22] ring-1 ring-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_rgba(0,0,0,0.4)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about bail, IPC sections, precedents…"
                disabled={loading}
                className="w-full resize-none bg-transparent text-[15px] text-white placeholder-[#5a5a5f] px-5 pt-4 pb-2 focus:outline-none min-h-[56px] max-h-[200px]"
                style={{ height: '56px' }}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-[#5a5a5f]">
                    <BookOpen className="size-3.5" />
                    <span>Indian Law</span>
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_rgba(20,136,252,0.3)]"
                >
                  <span className="hidden sm:inline">Search</span>
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
      />
    </div>
  )
}
