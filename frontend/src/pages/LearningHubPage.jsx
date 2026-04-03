import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Brain, Building2, GraduationCap, Scale, Briefcase, Newspaper, Sparkles, Search, Library, Loader2, BookMarked, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import FloatingNav from '../components/FloatingNav'
import BookCard from '../components/BookCard'
import logo from '../../assets/Logo.svg'

const roleOptions = [
  { id: 'student', name: 'Student', icon: <GraduationCap className="size-4" /> },
  { id: 'lawyer', name: 'Lawyer', icon: <Briefcase className="size-4" /> },
  { id: 'judge', name: 'Judge', icon: <Scale className="size-4" /> },
  { id: 'firm', name: 'Firm', icon: <Building2 className="size-4" /> },
]

const learningTracks = [
  {
    level: 'Beginner',
    focus: 'Constitutional basics, IPC/BNS foundations, legal reasoning fundamentals',
    outcomes: 'Build core legal vocabulary and issue-spotting confidence',
  },
  {
    level: 'Intermediate',
    focus: 'Precedent analysis, drafting strategy, procedural pathways, bail and trial practice',
    outcomes: 'Develop stronger case framing and argument synthesis skills',
  },
  {
    level: 'Advanced',
    focus: 'Constitutional litigation, multi-jurisdiction strategy, risk and outcome modeling',
    outcomes: 'Prepare partner-grade briefs and courtroom-ready legal positions',
  },
]

const personalizedPlans = {
  student: [
    'Daily: 20-minute case brief with plain-language notes',
    'Weekly: Compare 2 landmark rulings and explain ratio decidendi',
    'Practice: Ask CaseCut to simplify one complex judgment per day',
  ],
  lawyer: [
    'Daily: Build one argument tree from fresh case law',
    'Weekly: Prepare a precedent matrix for active matters',
    'Practice: Run adversarial scenario checks before drafting',
  ],
  judge: [
    'Daily: Review precedent consistency across forums',
    'Weekly: Map conflicting interpretations and reconciliation paths',
    'Practice: Generate neutral issue summaries for complex records',
  ],
  firm: [
    'Daily: Review risk-oriented legal updates by sector',
    'Weekly: Produce client-ready executive brief from case clusters',
    'Practice: Use CaseCut to stress-test strategy options and fallback positions',
  ],
}

export default function LearningHubPage() {
  const { meta } = useTheme();
  const isDark = meta.isDark;
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState('student')
  const [news, setNews] = useState([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [activeTab, setActiveTab] = useState('learn') // 'learn' | 'books' | 'news'

  // Book search state
  const [bookQuery, setBookQuery] = useState('')
  const [books, setBooks] = useState([])
  const [ipcBooks, setIpcBooks] = useState([])
  const [topicBooks, setTopicBooks] = useState([])
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [bookSearchDone, setBookSearchDone] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const searchBooks = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return
    setLoadingBooks(true)
    setBookSearchDone(false)
    setBooks([])
    setIpcBooks([])
    setTopicBooks([])

    try {
      // Use smart endpoint for context-aware results
      const res = await fetch(`${API_URL}/learning/books/smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          topic: selectedRole === 'student' ? 'all' : 'all',
          max_results: 6,
        }),
      })
      const data = await res.json()
      if (data?.success && data.data?.books) {
        setBooks(data.data.books.query_books || [])
        setIpcBooks(data.data.books.ipc_books || [])
        setTopicBooks(data.data.books.topic_books || [])
      }
    } catch (err) {
      console.error('Book search failed:', err)
      // Fallback to direct search
      try {
        const res = await fetch(`${API_URL}/learning/books?q=${encodeURIComponent(query.trim())}&max=6`)
        const data = await res.json()
        if (data?.success && data.data?.books) {
          setBooks(data.data.books)
        }
      } catch (fallbackErr) {
        console.error('Book fallback search also failed:', fallbackErr)
      }
    } finally {
      setLoadingBooks(false)
      setBookSearchDone(true)
    }
  }, [API_URL, selectedRole])

  const handleBookSearch = (e) => {
    e.preventDefault()
    searchBooks(bookQuery)
  }

  // Quick book suggestion topics
  const quickTopics = [
    { label: 'IPC Overview', query: 'Indian Penal Code commentary' },
    { label: 'Criminal Law', query: 'Indian criminal law practice' },
    { label: 'Constitutional', query: 'Indian constitutional law' },
    { label: 'Contract Law', query: 'Indian contract act' },
    { label: 'Cyber Crime', query: 'Indian cyber crime IT Act' },
    { label: 'Family Law', query: 'Indian family law' },
    { label: 'Evidence Act', query: 'Indian Evidence Act' },
    { label: 'CrPC / BNSS', query: 'Code of Criminal Procedure India' },
  ]

  useEffect(() => {
    let mounted = true

    async function loadNews() {
      try {
        const res = await fetch(`${API_URL}/learning/news`)
        const data = await res.json()
        if (!mounted) return
        setNews(data?.data?.items || [])
      } catch (err) {
        console.error('Learning news fetch failed:', err)
        if (mounted) setNews([])
      } finally {
        if (mounted) setLoadingNews(false)
      }
    }

    loadNews()
    return () => {
      mounted = false
    }
  }, [])

  const suggestions = useMemo(() => personalizedPlans[selectedRole] || personalizedPlans.student, [selectedRole])

  const tabItems = [
    { id: 'learn', label: 'Learning Tracks', icon: <GraduationCap className="size-4" /> },
    { id: 'books', label: 'Law Books', icon: <Library className="size-4" /> },
    { id: 'news', label: 'Legal News', icon: <Newspaper className="size-4" /> },
  ]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${meta.gradient} ${meta.textPrimary}`}>
      <FloatingNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Hero Section */}
        <section className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6 sm:p-8`}>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700 mb-4">
              <Brain className="size-3.5" />
              AI-First Learning
            </div>
            <h1 className={`text-4xl sm:text-5xl font-thin tracking-tight mb-3 ${meta.textPrimary}`}>
              Learn Indian Law with Personalized AI Guidance
            </h1>
            <p className={`text-sm sm:text-base leading-relaxed ${meta.textSecondary}`}>
              Explore curated learning journeys, search legal reference books, and get daily developments — all powered by AI.
            </p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {tabItems.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-black text-white border-black shadow-lg'
                  : `${meta.cardBg} border ${meta.border} ${meta.textSecondary} hover:${meta.cardBg} hover:${meta.textPrimary}`
              }`}
            >
              {tab.icon}
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* ─── Learn Tab ─── */}
          {activeTab === 'learn' && (
            <motion.div
              key="learn"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <section className="grid lg:grid-cols-2 gap-6">
                <div className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="size-4 text-purple-600" />
                    <h2 className={`text-lg font-semibold ${meta.textPrimary}`}>Learning Tracks</h2>
                  </div>
                  <div className="space-y-3">
                    {learningTracks.map((track) => (
                      <div key={track.level} className={`rounded-2xl ${meta.cardBg} border ${meta.border} p-4 hover:shadow-md transition-shadow`}>
                        <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'} font-medium mb-1`}>{track.level}</p>
                        <p className={`text-sm ${meta.textPrimary} mb-1`}>{track.focus}</p>
                        <p className={`text-xs ${meta.textSecondary}`}>Outcome: {track.outcomes}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="size-4 text-emerald-500" />
                    <h2 className={`text-lg font-semibold ${meta.textPrimary}`}>AI Personalized Suggestions</h2>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {roleOptions.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                          selectedRole === role.id
                            ? 'bg-black text-white border-black'
                            : `${meta.cardBg} border ${meta.border} ${meta.textSecondary} hover:${meta.cardBg} hover:${meta.textPrimary}`
                        }`}
                      >
                        {role.icon}
                        {role.name}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {suggestions.map((item) => (
                      <div key={item} className={`rounded-xl ${meta.cardBg} border ${meta.border} px-3 py-2.5 text-sm ${meta.textPrimary}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Recommended Books inline — shows role-aware picks */}
              <section className="rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookMarked className="size-4 text-purple-600" />
                    <h2 className={`text-lg font-semibold ${meta.textPrimary}`}>Recommended Books for You</h2>
                  </div>
                  <motion.button
                    onClick={() => setActiveTab('books')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                  >
                    Browse all <ArrowRight className="size-3" />
                  </motion.button>
                </div>
                <p className={`text-xs ${meta.textSecondary} mb-3`}>
                  Based on your role: <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'} capitalize`}>{selectedRole}</span>
                </p>
                <RoleBookRecommendations role={selectedRole} apiUrl={API_URL} />
              </section>
            </motion.div>
          )}

          {/* ─── Books Tab ─── */}
          {activeTab === 'books' && (
            <motion.div
              key="books"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Book Search */}
              <section className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Library className="size-4 text-purple-600" />
                    <h2 className={`text-lg font-semibold ${meta.textPrimary}`}>Search Legal Books</h2>
                </div>
                <p className={`text-sm ${meta.textSecondary} mb-4`}>
                  Search Google Books for Indian legal literature — textbooks, commentaries, and reference works.
                  Results are context-aware: searching IPC topics will also recommend section-specific books.
                </p>

                <form onSubmit={handleBookSearch} className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={bookQuery}
                      onChange={(e) => setBookQuery(e.target.value)}
                      placeholder="e.g. IPC 420 fraud, bail law, constitutional rights..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all ${isDark ? 'bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400' : 'bg-white/70 border-gray-200 text-gray-900 placeholder:text-gray-400'} text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400`}
                    />
                  </div>
                  <motion.button
                    type="submit"
                    disabled={loadingBooks || bookQuery.trim().length < 2}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loadingBooks ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    Search
                  </motion.button>
                </form>

                {/* Quick topic pills */}
                <div className="flex flex-wrap gap-2">
                  {quickTopics.map((topic) => (
                    <motion.button
                      key={topic.label}
                      onClick={() => { setBookQuery(topic.query); searchBooks(topic.query) }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-full text-xs border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      {topic.label}
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* Book Results */}
              {loadingBooks && (
                <div className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-8 text-center`}>
                  <Loader2 className="size-6 animate-spin text-purple-500 mx-auto mb-3" />
                  <p className={`text-sm ${meta.textSecondary}`}>Searching legal books...</p>
                </div>
              )}

              {!loadingBooks && bookSearchDone && (
                <div className="space-y-6">
                  {books.length > 0 && (
                    <section className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="size-4 text-purple-600" />
                        <h3 className={`text-base font-semibold ${meta.textPrimary}`}>Search Results</h3>
                        <span className={`text-xs ${meta.textSecondary} ml-auto`}>{books.length} books found</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {books.map((book, i) => (
                          <BookCard key={book.id || i} book={book} index={i} />
                        ))}
                      </div>
                    </section>
                  )}

                  {ipcBooks.length > 0 && (
                    <section className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="size-4 text-emerald-600" />
                        <h3 className={`text-base font-semibold ${meta.textPrimary}`}>IPC Section Books</h3>
                      </div>
                      <p className={`text-xs ${meta.textSecondary} mb-4`}>
                        Books related to IPC sections detected in your query
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {ipcBooks.map((book, i) => (
                          <BookCard key={book.id || i} book={book} index={i} />
                        ))}
                      </div>
                    </section>
                  )}

                  {topicBooks.length > 0 && (
                    <section className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="size-4 text-amber-600" />
                        <h3 className={`text-base font-semibold ${meta.textPrimary}`}>Topic Recommendations</h3>
                      </div>
                      <p className={`text-xs ${meta.textSecondary} mb-4`}>
                        Additional books matching this legal topic area
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {topicBooks.map((book, i) => (
                          <BookCard key={book.id || i} book={book} index={i} />
                        ))}
                      </div>
                    </section>
                  )}

                  {books.length === 0 && ipcBooks.length === 0 && topicBooks.length === 0 && (
                    <div className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-8 text-center`}>
                      <BookOpen className={`size-8 ${isDark ? 'text-gray-500' : 'text-gray-300'} mx-auto mb-3`} />
                      <p className={`text-sm ${meta.textSecondary}`}>No books found. Try a different query or pick a topic above.</p>
                    </div>
                  )}
                </div>
              )}

              {/* How it works */}
              {!bookSearchDone && !loadingBooks && (
                <section className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6`}>
                  <h3 className={`text-base font-semibold ${meta.textPrimary} mb-4`}>How Book Search Works</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className={`rounded-2xl ${isDark ? 'bg-purple-900/30 border-purple-700/30' : 'bg-purple-50 border-purple-100'} border p-4 text-center`}>
                      <Search className="size-5 text-purple-500 mx-auto mb-2" />
                      <p className={`text-xs font-medium ${meta.textPrimary} mb-1`}>Query Analysis</p>
                      <p className={`text-xs ${meta.textSecondary}`}>Your search is analyzed for IPC sections, legal topics, and key terms</p>
                    </div>
                    <div className={`rounded-2xl ${isDark ? 'bg-emerald-900/30 border-emerald-700/30' : 'bg-emerald-50 border-emerald-100'} border p-4 text-center`}>
                      <Scale className="size-5 text-emerald-500 mx-auto mb-2" />
                      <p className={`text-xs font-medium ${meta.textPrimary} mb-1`}>Context Matching</p>
                      <p className={`text-xs ${meta.textSecondary}`}>If IPC sections are detected, section-specific reference books are added</p>
                    </div>
                    <div className={`rounded-2xl ${isDark ? 'bg-amber-900/30 border-amber-700/30' : 'bg-amber-50 border-amber-100'} border p-4 text-center`}>
                      <BookMarked className="size-5 text-amber-500 mx-auto mb-2" />
                      <p className={`text-xs font-medium ${meta.textPrimary} mb-1`}>Smart Results</p>
                      <p className={`text-xs ${meta.textSecondary}`}>Results grouped into query matches, IPC books, and topic recommendations</p>
                    </div>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* ─── News Tab ─── */}
          {activeTab === 'news' && (
            <motion.div
              key="news"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <section className={`rounded-3xl ${meta.cardBg} backdrop-blur-md border ${meta.border} shadow-lg p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="size-4 text-amber-500" />
                  <h2 className={`text-lg font-semibold ${meta.textPrimary}`}>Daily Indian Legal News</h2>
                </div>

                {loadingNews ? (
                  <div className={`flex items-center gap-2 text-sm ${meta.textSecondary}`}>
                    <Loader2 className="size-4 animate-spin" />
                    Loading latest legal updates...
                  </div>
                ) : news.length === 0 ? (
                  <p className={`text-sm ${meta.textSecondary}`}>No news available right now. Please check again shortly.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {news.map((item, idx) => (
                      <a
                        key={`${item.url}_${idx}`}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-2xl ${meta.cardBg} border ${meta.border} p-4 hover:shadow-md transition-all ${isDark ? 'hover:bg-gray-700/80' : 'hover:bg-white/70'}`}
                      >
                        <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'} font-medium mb-2`}>{item.source}</p>
                        <p className={`text-sm leading-relaxed ${meta.textPrimary} mb-2`}>{item.title}</p>
                        <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.published_at || 'Today'}</p>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <section className="rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 shadow-lg p-8 sm:p-12 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-3">Ready to start learning?</h2>
          <p className="text-sm text-gray-700 max-w-xl mx-auto mb-6 leading-relaxed">
            Ask CaseCut any legal question and get citation-backed answers instantly.
          </p>
          <motion.button
            onClick={() => navigate('/chat')}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 bg-black text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-all duration-200"
          >
            Try CaseCut
            <ArrowRight className="size-4" />
          </motion.button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 py-8 px-4 mt-4">
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
  )
}

/** Role-aware book recommendations — fetches books based on user role */
function RoleBookRecommendations({ role, apiUrl }) {
  const [roleBooks, setRoleBooks] = useState([])
  const [loading, setLoading] = useState(true)

  const roleQueries = {
    student: 'Indian law textbook beginner',
    lawyer: 'Indian legal practice advocacy',
    judge: 'Indian judicial precedent analysis',
    firm: 'Indian corporate law compliance',
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const query = roleQueries[role] || roleQueries.student
    fetch(`${apiUrl}/learning/books?q=${encodeURIComponent(query)}&max=4`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        setRoleBooks(data?.data?.books || [])
      })
      .catch(() => {
        if (!cancelled) setRoleBooks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [role, apiUrl])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="size-4 animate-spin" />
        Loading book suggestions...
      </div>
    )
  }

  if (roleBooks.length === 0) {
    return <p className="text-sm text-gray-500 py-2">No recommendations available.</p>
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {roleBooks.map((book, i) => (
        <BookCard key={book.id || i} book={book} index={i} />
      ))}
    </div>
  )
}
