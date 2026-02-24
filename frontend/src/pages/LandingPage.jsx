import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Clock, Shield, Users, Scale, Zap, ArrowRight, Sparkles } from 'lucide-react';
import logo from '../../assets/Logo.svg';

function RayBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-[#0f0f0f]" />
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] sm:w-[6000px]"
        style={{
          background: 'radial-gradient(circle at center 800px, rgba(20, 136, 252, 0.8) 0%, rgba(20, 136, 252, 0.35) 14%, rgba(20, 136, 252, 0.18) 18%, rgba(20, 136, 252, 0.08) 22%, rgba(17, 17, 20, 0.2) 25%)'
        }}
      />
      <div 
        className="absolute top-[175px] left-1/2 w-[1600px] h-[1600px] sm:top-1/2 sm:w-[3043px] sm:h-[2865px]"
        style={{ transform: 'translate(-50%) rotate(180deg)' }}
      >
        <div className="absolute w-full h-full rounded-full -mt-[13px]" style={{ background: 'radial-gradient(43.89% 25.74% at 50.02% 97.24%, #111114 0%, #0f0f0f 100%)', border: '16px solid white', transform: 'rotate(180deg)', zIndex: 5 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[11px]" style={{ border: '23px solid #b7d7f6', transform: 'rotate(180deg)', zIndex: 4 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[8px]" style={{ border: '23px solid #8fc1f2', transform: 'rotate(180deg)', zIndex: 3 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[4px]" style={{ border: '23px solid #64acf6', transform: 'rotate(180deg)', zIndex: 2 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0f0f0f]" style={{ border: '20px solid #1172e2', boxShadow: '0 -15px 24.8px rgba(17, 114, 226, 0.6)', transform: 'rotate(180deg)', zIndex: 1 }} />
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Brain className="size-5 text-[#4da5fc]" />,
      title: "Semantic Search",
      description: "Find relevant cases using natural language queries powered by vector embeddings"
    },
    {
      icon: <Zap className="size-5 text-emerald-400" />,
      title: "Lightning Fast",
      description: "Get answers in under 5 seconds with our high-performance AI engine"
    },
    {
      icon: <Shield className="size-5 text-amber-400" />,
      title: "100% Free",
      description: "Built entirely on free-tier services. No hidden costs, no credit card required"
    },
    {
      icon: <Users className="size-5 text-[#7c5df0]" />,
      title: "Role-Based",
      description: "Customized responses for lawyers, judges, and law students"
    },
    {
      icon: <Sparkles className="size-5 text-pink-400" />,
      title: "Auto-Updated",
      description: "Legal database updated twice weekly with latest judgments"
    },
    {
      icon: <Scale className="size-5 text-cyan-400" />,
      title: "Comprehensive",
      description: "Access to Supreme Court, High Courts, and thousands of legal precedents"
    }
  ]

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="CaseCut" className="h-8 w-8" />
              <span className="text-lg font-bold">CaseCut AI</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/about" className="text-xs text-[#8a8a8f] hover:text-white transition-colors">
                About
              </Link>
              <Link to="/login" className="text-xs text-[#8a8a8f] hover:text-white transition-colors">
                Log in
              </Link>
              <button
                onClick={() => navigate('/signup')}
                className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(20,136,252,0.3)]"
              >
                Get Started
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <RayBackground />
        
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <span
              className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm overflow-hidden cursor-default"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                backdropFilter: 'blur(20px)',
                boxShadow: 'inset 0 1px rgba(255,255,255,0.2), 0 0 0 1px rgba(255,255,255,0.08)'
              }}
            >
              <Zap className="size-3.5 text-[#4da5fc]" />
              <span className="text-white/90 font-medium text-xs">AI-Powered Legal Research</span>
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl sm:text-6xl font-bold tracking-tight mb-4"
          >
            Research Indian law{' '}
            <span className="bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text text-transparent italic">
              instantly
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-base sm:text-lg text-[#8a8a8f] mb-10 max-w-xl mx-auto"
          >
            CaseCut AI is your free legal assistant tailored for Judges, Lawyers, and Law Students.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={() => navigate('/signup')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 active:scale-95 shadow-[0_0_30px_rgba(20,136,252,0.4)]"
            >
              Start Researching
              <ArrowRight className="size-4" />
            </button>
            <button
              onClick={() => navigate('/about')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] text-white transition-all duration-200"
            >
              Learn More
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Powered by Advanced AI</h2>
            <p className="text-[#8a8a8f] max-w-2xl mx-auto">
              CaseCut uses advanced AI and semantic search to deliver lightning-fast legal insights
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                viewport={{ once: true }}
                className="p-6 rounded-xl border border-white/[0.06] bg-[#141416] hover:border-white/[0.1] transition-all duration-300 group"
              >
                <div className="mb-4 p-2.5 rounded-lg bg-white/[0.03] w-fit group-hover:bg-white/[0.06] transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold mb-2">{feature.title}</h3>
                <p className="text-xs text-[#8a8a8f] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative text-center py-16 px-8 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1488fc]/20 via-[#7c5df0]/10 to-transparent" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to transform your legal research?
              </h2>
              <p className="text-[#8a8a8f] mb-8 max-w-lg mx-auto">
                Join thousands of legal professionals using CaseCut
              </p>
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 active:scale-[0.98] shadow-[0_0_30px_rgba(20,136,252,0.3)]"
              >
                Get started for free
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={logo} alt="CaseCut" className="h-5 w-5" />
            <span className="text-xs font-semibold">CaseCut AI</span>
          </div>
          <p className="text-xs text-[#5a5a5f] mb-4">
            AI-powered legal research for the Indian legal system
          </p>
          <div className="flex justify-center gap-6 text-xs text-[#5a5a5f]">
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <a href="https://github.com" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <p className="mt-6 text-[10px] text-[#3a3a3f]">
            2026 CaseCut. Built for the Indian Legal Community.
          </p>
        </div>
      </footer>
    </div>
  );
}
