import { Link } from 'react-router-dom';
import { ArrowLeft, Github, Mail, Zap, Database, Shield, Clock, Brain, Server, Globe, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../../assets/Logo.svg';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link to="/" className="flex items-center gap-2 text-[#8a8a8f] hover:text-white transition-colors text-sm">
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="CaseCut" className="h-8 w-8" />
              <span className="text-lg font-bold">CaseCut AI</span>
            </div>
            <Link
              to="/chat"
              className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200"
            >
              Try CaseCut
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-20">
        {/* Hero */}
        <motion.div {...fadeUp} className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-white/[0.08] bg-white/[0.03] text-[#8a8a8f] mb-6">
            <BookOpen className="size-3.5" />
            About CaseCut
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Legal research,{' '}
            <span className="bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text text-transparent italic">
              reimagined
            </span>
          </h1>
          <p className="text-lg text-[#8a8a8f] max-w-2xl mx-auto leading-relaxed">
            Making legal research accessible, fast, and free for everyone in the Indian legal community.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.section {...fadeUp} className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-[#a0a0a5] leading-relaxed mb-4">
                Legal research is the backbone of the justice system, yet it remains time-consuming and 
                often expensive. CaseCut was built to democratize access to legal knowledge by leveraging 
                cutting-edge AI technology.
              </p>
              <p className="text-[#a0a0a5] leading-relaxed">
                Every lawyer, judge, and law student deserves access to fast, accurate, 
                and comprehensive legal research tools -- without any cost.
              </p>
            </div>
            <div className="p-8 rounded-2xl border border-white/[0.06] bg-[#141416]">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: '< 5s', label: 'Response time' },
                  { value: '300+', label: 'Tokens/sec' },
                  { value: '0', label: 'Monthly cost' },
                  { value: '14,400', label: 'Daily queries' }
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold text-[#4da5fc] mb-1">{stat.value}</div>
                    <div className="text-xs text-[#6a6a6f]">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Technology */}
        <motion.section {...fadeUp} className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">Technology Stack</h2>
            <p className="text-[#6a6a6f]">Built with modern, production-grade infrastructure</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Brain className="size-5 text-[#4da5fc]" />,
                title: 'AI Models',
                items: ['Large Language Model (70B)', 'Embedding Models', 'Multi-modal AI']
              },
              {
                icon: <Database className="size-5 text-[#7c5df0]" />,
                title: 'Infrastructure',
                items: ['Vector Database', 'Cloud Hosting', 'Edge Deployment', 'Auth & Storage']
              },
              {
                icon: <Zap className="size-5 text-emerald-400" />,
                title: 'Performance',
                items: ['300+ tokens/sec', '< 5s response', 'High-dim vectors']
              },
              {
                icon: <Shield className="size-5 text-amber-400" />,
                title: 'Cost',
                items: ['100% free tier', '14,400 queries/day', '1GB vector storage']
              }
            ].map((card, i) => (
              <div key={i} className="p-5 rounded-xl border border-white/[0.06] bg-[#141416] hover:border-white/[0.1] transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  {card.icon}
                  <h3 className="text-sm font-semibold">{card.title}</h3>
                </div>
                <ul className="space-y-2">
                  {card.items.map((item, j) => (
                    <li key={j} className="text-xs text-[#8a8a8f] flex items-start gap-2">
                      <span className="text-[#4da5fc] mt-0.5">--</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.section {...fadeUp} className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">How It Works</h2>
            <p className="text-[#6a6a6f]">From question to answer in under 5 seconds</p>
          </div>
          <div className="space-y-3">
            {[
              {
                step: '01',
                title: 'You Ask a Question',
                description: 'Enter your legal query in natural language'
              },
              {
                step: '02',
                title: 'Vector Search',
                description: 'Your question is converted to embeddings and matched with relevant cases'
              },
              {
                step: '03',
                title: 'RAG Pipeline',
                description: 'Retrieved cases are fed to a powerful LLM for context-aware summaries'
              },
              {
                step: '04',
                title: 'Instant Response',
                description: 'Get a comprehensive answer with case citations'
              }
            ].map((item) => (
              <div key={item.step} className="flex gap-5 items-start p-5 rounded-xl border border-white/[0.06] bg-[#141416] hover:border-white/[0.1] transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1488fc]/10 text-[#4da5fc] flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs text-[#8a8a8f]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Data Sources */}
        <motion.section {...fadeUp} className="mb-20">
          <div className="p-8 rounded-2xl border border-white/[0.06] bg-[#141416]">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="size-5 text-[#4da5fc]" />
              <h2 className="text-xl font-bold">Legal Data Sources</h2>
            </div>
            <p className="text-[#a0a0a5] text-sm mb-4">CaseCut indexes legal judgments from:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                'Supreme Court of India',
                'High Courts across India',
                'District Courts',
                'Indian Kanoon database'
              ].map((source, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#8a8a8f]">
                  <div className="size-1.5 rounded-full bg-[#4da5fc]" />
                  {source}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6a6a6f]">
              Database automatically updated twice weekly via GitHub Actions with latest judgments and precedents.
            </p>
          </div>
        </motion.section>

        {/* Open Source */}
        <motion.section {...fadeUp} className="mb-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">Open Source</h2>
            <p className="text-[#8a8a8f] text-sm mb-8 max-w-lg mx-auto">
              CaseCut is built for the Indian legal community. The entire project 
              is open source and available on GitHub.
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] text-white transition-all duration-200"
              >
                <Github className="size-4" />
                View on GitHub
              </a>
              <a
                href="mailto:contact@casecut.ai"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] text-white transition-all duration-200"
              >
                <Mail className="size-4" />
                Contact Us
              </a>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fadeUp}>
          <div className="relative text-center py-16 px-8 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1488fc]/20 via-[#7c5df0]/10 to-transparent" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4">Ready to try CaseCut?</h2>
              <p className="text-[#8a8a8f] mb-8">
                Join legal professionals using AI-powered research
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 active:scale-[0.98] shadow-[0_0_30px_rgba(20,136,252,0.3)]"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={logo} alt="CaseCut" className="h-5 w-5" />
            <span className="text-xs font-semibold">CaseCut AI</span>
          </div>
          <p className="text-xs text-[#5a5a5f]">
            2026 CaseCut. Built for the Indian Legal Community.
          </p>
        </div>
      </footer>
    </div>
  );
}
