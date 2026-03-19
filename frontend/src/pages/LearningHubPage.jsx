import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Brain, Building2, GraduationCap, Scale, Briefcase, Newspaper, Sparkles } from 'lucide-react'
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
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState('student')
  const [news, setNews] = useState([])
  const [loadingNews, setLoadingNews] = useState(true)

  useEffect(() => {
    let mounted = true
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="CaseCut" className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-wide">CaseCut Learning Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-[#8a8a8f] hover:text-white transition-colors">Home</Link>
            <button
              onClick={() => navigate('/chat')}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1488fc] hover:bg-[#1a94ff] transition-colors"
            >
              Try CaseCut
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#1b1c24] via-[#15161d] to-[#111218] p-6 sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.05] text-[#9abef0] mb-4">
              <Brain className="size-3.5" />
              AI-First Learning
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Learn Indian Law with Personalized AI Guidance</h1>
            <p className="text-[#9b9ca2] text-sm sm:text-base leading-relaxed">
              Explore curated legal learning journeys from beginner to advanced. Get role-aware recommendations,
              daily legal developments, and practical study directions designed for students, lawyers, judges, and firms.
            </p>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/[0.07] bg-[#14151c] p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="size-4 text-[#4da5fc]" />
              <h2 className="text-lg font-semibold">Learning Tracks</h2>
            </div>
            <div className="space-y-3">
              {learningTracks.map((track) => (
                <div key={track.level} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-wider text-[#6f7382] mb-1">{track.level}</p>
                  <p className="text-sm text-[#e5e5e9] mb-1">{track.focus}</p>
                  <p className="text-xs text-[#9b9ca2]">Outcome: {track.outcomes}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#14151c] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-4 text-emerald-400" />
              <h2 className="text-lg font-semibold">AI Personalized Suggestions</h2>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {roleOptions.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    selectedRole === role.id
                      ? 'bg-[#1488fc]/20 border-[#1488fc]/40 text-[#9cccff]'
                      : 'bg-white/[0.02] border-white/[0.08] text-[#b1b3bc] hover:text-white'
                  }`}
                >
                  {role.icon}
                  {role.name}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {suggestions.map((item) => (
                <div key={item} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-[#d8d9de]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#14151c] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="size-4 text-amber-400" />
            <h2 className="text-lg font-semibold">Daily Indian Legal News</h2>
          </div>

          {loadingNews ? (
            <p className="text-sm text-[#9b9ca2]">Loading latest legal updates...</p>
          ) : news.length === 0 ? (
            <p className="text-sm text-[#9b9ca2]">No news available right now. Please check again shortly.</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {news.map((item, idx) => (
                <a
                  key={`${item.url}_${idx}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.14] transition-colors"
                >
                  <p className="text-[11px] text-[#7f8391] mb-2">{item.source}</p>
                  <p className="text-sm leading-relaxed text-[#ececf0] mb-2">{item.title}</p>
                  <p className="text-[11px] text-[#6f7382]">{item.published_at || 'Today'}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
