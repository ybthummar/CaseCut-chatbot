import { Link } from 'react-router-dom';
import { Globe, BookOpen, Search, FileText, Brain, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import FloatingNav from '../components/FloatingNav';
import logo from '../../assets/Logo.svg';

const MotionLink = motion(Link);

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

export default function AboutPage() {
  const { meta } = useTheme();
  return (
    <div className={`min-h-screen bg-gradient-to-br ${meta.gradient} ${meta.textPrimary}`}>
      <FloatingNav />

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <motion.div {...fadeUp} className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-gray-200/50 bg-white/50 text-gray-600 mb-6">
            <BookOpen className="size-3.5" />
            About CaseCut
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-thin tracking-tight mb-6">
            Legal research,{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent italic">
              reimagined
            </span>
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Making legal research accessible, fast, and free for everyone in the Indian legal community.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.section {...fadeUp} className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-semibold mb-4">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Legal research is the backbone of the justice system, yet it remains time-consuming and 
                often expensive. CaseCut was built to democratize access to legal knowledge by leveraging 
                cutting-edge AI technology.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Every lawyer, judge, and law student deserves access to fast, accurate, 
                and comprehensive legal research tools — without any cost.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: '< 5s', label: 'Response time', color: 'text-purple-600' },
                  { value: '300+', label: 'Tokens/sec', color: 'text-blue-600' },
                  { value: '₹0', label: 'Monthly cost', color: 'text-emerald-600' },
                  { value: '14,400', label: 'Daily queries', color: 'text-amber-600' }
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                    <div className="text-xs text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.section {...fadeUp} className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold mb-3">How It Works</h2>
            <p className="text-gray-600">From question to answer in under 5 seconds</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Ask a Question', description: 'Enter your legal query in natural language', icon: Search, color: 'bg-blue-400' },
              { step: '02', title: 'Vector Search', description: 'Matched with indexed Supreme Court & High Court judgments', icon: Brain, color: 'bg-purple-400' },
              { step: '03', title: 'RAG Pipeline', description: 'Retrieved cases fed to LLM for context-aware summaries', icon: FileText, color: 'bg-emerald-400' },
              { step: '04', title: 'Instant Response', description: 'Comprehensive answer with case citations', icon: Zap, color: 'bg-amber-400' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg p-5 text-center hover:shadow-xl transition-shadow">
                  <div className={`mx-auto mb-3 w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="size-5 text-white" />
                  </div>
                  <div className="text-xs font-medium text-gray-400 mb-1">STEP {item.step}</div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Data Sources */}
        <motion.section {...fadeUp} className="mb-20">
          <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="size-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Legal Data Sources</h2>
            </div>
            <p className="text-gray-700 text-sm mb-4">CaseCut indexes legal judgments from:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                'Supreme Court of India',
                'High Courts across India',
                'District Courts',
                'Indian Kanoon database'
              ].map((source, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="size-1.5 rounded-full bg-purple-400" />
                  {source}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Database automatically updated twice weekly with the latest judgments and precedents.
            </p>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fadeUp}>
          <div className="relative text-center py-16 px-8 rounded-3xl overflow-hidden bg-white/40 backdrop-blur-md border border-white/40 shadow-lg">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4">Ready to try CaseCut?</h2>
            <p className="text-gray-700 mb-8">
              Join legal professionals using AI-powered research
            </p>
            <MotionLink
              to="/signup"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-all duration-300 text-sm font-semibold"
            >
              Get Started Free
              <Zap className="size-4" />
            </MotionLink>
          </div>
        </motion.section>
      </main>

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
