import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle, Scale, UploadCloud, Zap, BookOpen, Search, FileText, Brain } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import MinimalHero from '@/components/ui/flux-card-hero';
import logo from '../../assets/Logo.svg';

const MotionLink = motion(Link);

const featureCards = [
  {
    title: 'Legal Chat',
    subtitle: 'Ask legal questions, get citation-backed answers',
    path: '/chat',
    icon: MessageCircle,
    bullets: ['Multi-role assistant', 'RAG answer evaluation', 'Chat history built-in'],
    cta: 'Start Chat',
    accent: 'bg-emerald-400',
  },
  {
    title: 'Page Summarizer',
    subtitle: 'Upload PDF or paste text for legal summaries',
    path: '/summarizer',
    icon: UploadCloud,
    bullets: ['PDF-friendly UI', 'Task-aware summarization', 'Summary history per user'],
    cta: 'Open Summarizer',
    accent: 'bg-blue-400',
  },
  {
    title: 'Case Precedent Finder',
    subtitle: 'Focused precedent search by topic and role',
    path: '/precedents',
    icon: Scale,
    bullets: ['Topic filters', 'Evidence chunks', 'Precedent search history'],
    cta: 'Find Precedents',
    accent: 'bg-purple-400',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Ask Your Legal Question',
    description: 'Enter your query in plain language — bail conditions, case precedents, IPC sections, or anything legal.',
    icon: Search,
    color: 'bg-blue-400',
  },
  {
    step: '02',
    title: 'AI Searches Case Law',
    description: 'Your question is converted to vector embeddings and matched against indexed Supreme Court & High Court judgments.',
    icon: Brain,
    color: 'bg-purple-400',
  },
  {
    step: '03',
    title: 'RAG Pipeline Generates Answer',
    description: 'Retrieved cases are fed into a powerful LLM that produces a context-aware, citation-backed response.',
    icon: FileText,
    color: 'bg-emerald-400',
  },
  {
    step: '04',
    title: 'Get Instant Results',
    description: 'Receive a comprehensive answer with case citations, summaries, and relevant precedents — all in under 5 seconds.',
    icon: Zap,
    color: 'bg-amber-400',
  },
];

export default function LandingPage() {
  const { meta } = useTheme();
  return (
    <div className={`min-h-screen bg-gradient-to-br ${meta.gradient}`}>
      {/* Hero Section */}
      <MinimalHero />

      {/* Feature Cards Section */}
      <div id="features" className="relative">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl font-thin tracking-tight text-gray-900 sm:text-5xl">
              Choose Your Legal Workflow
            </h2>
            <p className="mt-4 text-base text-gray-700 max-w-2xl mx-auto">
              Conversational analysis, document summaries, or precedent retrieval — pick the tool that fits your task.
            </p>
          </motion.div>

          <section className="grid gap-5 md:grid-cols-3">
            {featureCards.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.path}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.12 + idx * 0.06 }}
                  className="group rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className={`mb-4 inline-flex rounded-xl ${item.accent} p-2.5`}>
                    <Icon className="size-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.subtitle}</p>

                  <ul className="mt-4 space-y-2 text-xs text-gray-700">
                    {item.bullets.map((point) => (
                      <li key={point} className="rounded-xl bg-white/50 border border-white/40 px-2.5 py-1.5">
                        {point}
                      </li>
                    ))}
                  </ul>

                  <MotionLink
                    to={item.path}
                    whileHover={{ scale: 1.04, x: 2 }}
                    whileTap={{ scale: 0.96 }}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-all"
                  >
                    {item.cta}
                    <ArrowRight className="size-3.5" />
                  </MotionLink>
                </motion.article>
              );
            })}
          </section>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="relative">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-14 text-center"
          >
            <h2 className="text-4xl font-thin tracking-tight text-gray-900 sm:text-5xl">
              How CaseCut Works
            </h2>
            <p className="mt-4 text-base text-gray-700 max-w-2xl mx-auto">
              From question to answer in under 5 seconds — powered by RAG and Indian case law.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.1 + idx * 0.08 }}
                  className="rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-6 text-center hover:shadow-xl transition-shadow"
                >
                  <div className={`mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}>
                    <Icon className="size-6 text-white" />
                  </div>
                  <div className="text-xs font-medium text-gray-400 mb-2">STEP {item.step}</div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Learning Hub CTA */}
      <div className="relative">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 shadow-lg p-8 sm:p-12 text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700 mb-4">
              <BookOpen className="size-3.5" />
              Learning Hub
            </div>
            <h2 className="text-3xl sm:text-4xl font-thin tracking-tight text-gray-900 mb-3">
              Learn Indian Law with AI Guidance
            </h2>
            <p className="text-sm text-gray-700 max-w-xl mx-auto mb-6 leading-relaxed">
              Explore curated legal learning journeys from beginner to advanced. Get role-aware recommendations, daily legal news, and personalized study plans.
            </p>
            <MotionLink
              to="/learning"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-all duration-200"
            >
              Explore Learning Hub
              <ArrowRight className="size-4" />
            </MotionLink>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={logo} alt="CaseCut" className="h-7 w-7" />
                <span className="text-base font-semibold text-gray-900">CaseCut AI</span>
              </div>
              <p className="text-xs text-gray-600">
                AI-powered Indian legal research platform. Fast, free, and accessible for everyone.
              </p>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Features</h4>
              <ul className="space-y-2">
                <li><Link to="/chat" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Legal Chat</Link></li>
                <li><Link to="/summarizer" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Summarizer</Link></li>
                <li><Link to="/precedents" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Precedent Finder</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link to="/learning" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Learning Hub</Link></li>
                <li><Link to="/about" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">About</Link></li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Account</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Login</Link></li>
                <li><Link to="/signup" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Sign Up</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200/50 text-center">
              <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} CaseCut AI. Built for the Indian legal community.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
