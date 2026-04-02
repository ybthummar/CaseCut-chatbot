import React, { useState, useEffect } from 'react';
import { Zap, Scale, MessageCircle, BookOpen, Search, FileText, ArrowRight, X, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../ThemeToggle';
import { Avatar, AvatarImage, AvatarFallback } from './interfaces-avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './dropdown-menu';
import logo from '../../../assets/Logo.svg';

const MinimalHero = () => {
  const [currentCard, setCurrentCard] = useState(0);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const { user } = useAuth();
  const { theme, meta } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'midnight';

  const cardConfigs = [
    {
      bgColor: 'bg-emerald-400',
      content: {
        greeting: 'Ask any legal question and get instant, citation-backed answers from Indian case law.',
        subtitle: 'Powered by RAG + Legal AI'
      }
    },
    {
      bgColor: 'bg-blue-400',
      content: {
        type: 'analytics',
        greeting: 'Platform Analytics',
        subtitle: 'CaseCut Performance'
      }
    },
    {
      bgColor: 'bg-purple-400',
      content: {
        type: 'projects',
        title: 'Legal AI Pipeline',
        subtitle: 'How CaseCut Works'
      }
    },
    {
      bgColor: 'bg-amber-300',
      content: {
        type: 'chat-history'
      }
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCard((prev) => (prev + 1) % cardConfigs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/chat');
    } else {
      setShowLoginPopup(true);
    }
  };

  const currentConfig = cardConfigs[currentCard];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${meta.gradient} w-full overflow-hidden max-w-screen relative`}>
      {/* Login Popup for Guests */}
      {showLoginPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowLoginPopup(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <img src={logo} alt="CaseCut" className="h-8 w-8" />
              <span className="text-lg font-semibold text-gray-900">CaseCut AI</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in for full access</h3>
            <p className="text-sm text-gray-700 mb-6">
              Create a free account to save chat history, access all legal tools, and get personalized research insights.
            </p>
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/login')}
                className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-all text-sm font-semibold"
              >
                Log in
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/signup')}
                className="w-full bg-gray-100 text-gray-900 py-2.5 rounded-lg hover:bg-gray-200 transition-all text-sm font-semibold"
              >
                Create free account
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setShowLoginPopup(false); navigate('/chat'); }}
                className="w-full text-gray-600 py-2 text-xs font-medium hover:text-gray-900 transition-colors"
              >
                Continue as guest (limited features)
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Navigation */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-4xl">
        <nav className={`${meta.navBg} backdrop-blur-md rounded-2xl px-4 sm:px-6 py-3 shadow-lg border ${meta.border}`}>
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <img src={logo} alt="CaseCut" className="h-7 w-7" />
              <span className={`text-lg font-medium ${meta.textPrimary}`}>CaseCut AI</span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} href="#features" className={`text-sm font-medium ${meta.textSecondary} hover:${meta.textPrimary} transition-colors`}>Features</motion.a>
              <Link to="/about">
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className={`text-sm font-medium ${meta.textSecondary} hover:${meta.textPrimary} transition-colors`}>About</motion.span>
              </Link>
              <Link to="/learning">
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className={`text-sm font-medium ${meta.textSecondary} hover:${meta.textPrimary} transition-colors`}>Learning Hub</motion.span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
            <ThemeToggle variant={isDark ? 'dark' : 'auto'} />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 rounded-full p-0.5 ring-2 ring-transparent hover:ring-purple-300 transition-all duration-200 cursor-pointer focus:outline-none"
                  >
                    <Avatar className="size-8">
                      {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || user.email} />}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                        {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </motion.button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || user.email} />}
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                          {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/chat')} className="text-gray-700">
                    <MessageCircle className="size-4 text-gray-500" />
                    <span className="font-medium">Legal Chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/summarizer')} className="text-gray-700">
                    <FileText className="size-4 text-gray-500" />
                    <span className="font-medium">Summarizer</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/precedents')} className="text-gray-700">
                    <Scale className="size-4 text-gray-500" />
                    <span className="font-medium">Precedent Finder</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:bg-red-50">
                    <LogOut className="size-4" />
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className={`${isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-1.5 text-sm font-medium flex-shrink-0`}
              >
                <span>Login</span>
                <ArrowRight className="w-3 h-3" />
              </motion.button>
            )}
            </div>
          </div>
        </nav>
      </div>

      {/* Hero Content */}
      <div className="flex flex-col items-center justify-center px-6 pt-40 pb-16 max-w-7xl mx-auto">
        {/* Main Heading */}
        <div className="text-center mb-12">
          <h1 className={`text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-thin ${meta.textPrimary} leading-tight mb-6 tracking-tight`}>
            Legal Research, <br />
            Reimagined with AI
          </h1>
          <p className={`text-lg ${meta.textSecondary} max-w-2xl mx-auto leading-relaxed`}>
            AI-powered Indian case law analysis. Get citation-backed answers, summaries, and precedents in seconds.
          </p>
        </div>

        {/* CTA Button */}
        <motion.button
          whileHover={{ scale: 1.08, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGetStarted}
          className={`${isDark ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} px-6 py-3 rounded-lg transition-all duration-300 mb-16 flex items-center space-x-2 text-base font-semibold group`}
        >
          <span>Get started free</span>
          <Zap className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
        </motion.button>

        {/* Animated Layered Cards Interface */}
        <div className="relative w-full max-w-3xl mx-auto">
          {/* Background Cards with staggered animations */}
          <div className="absolute inset-0 transform rotate-3 scale-95 transition-all duration-1000 ease-in-out">
            <div className={`w-full h-72 bg-orange-300 rounded-3xl shadow-2xl opacity-50 transition-all duration-1000 ${currentCard === 1 ? 'scale-105 opacity-70' : ''}`}></div>
          </div>
          <div className="absolute inset-0 transform -rotate-2 scale-[0.96] transition-all duration-1000 ease-in-out delay-300">
            <div className={`w-full h-[19rem] bg-purple-400 rounded-3xl shadow-2xl opacity-60 transition-all duration-1000 ${currentCard === 2 ? 'scale-105 opacity-80' : ''}`}></div>
          </div>
          <div className="absolute inset-0 transform rotate-1 scale-[0.97] transition-all duration-1000 ease-in-out delay-500">
            <div className={`w-full h-72 bg-pink-400 rounded-3xl shadow-2xl opacity-50 transition-all duration-1000 ${currentCard === 3 ? 'scale-105 opacity-70' : ''}`}></div>
          </div>
          <div className="absolute inset-0 transform -rotate-1 scale-[0.98] transition-all duration-1000 ease-in-out delay-700">
            <div className={`w-full h-72 bg-yellow-300 rounded-3xl shadow-2xl opacity-40 transition-all duration-1000 ${currentCard === 0 ? 'scale-105 opacity-60' : ''}`}></div>
          </div>

          {/* Main Animated Card */}
          <div className={`relative z-10 w-full h-[19rem] ${currentConfig.bgColor} rounded-3xl shadow-2xl p-6 flex flex-col transition-all duration-1000 ease-in-out transform hover:scale-[1.02]`}>
            {/* Chat Interface */}
            <div className="bg-white/25 backdrop-blur-sm rounded-2xl p-5 flex-1 transition-all duration-500">
              {/* Chat Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-xs text-black/70 font-medium bg-white/30 px-2 py-1 rounded-full">CaseCut AI</span>
              </div>

              {/* Chat Content with Animation */}
              <div className="space-y-4">
                {currentConfig.content.type === 'chat-history' ? (
                  /* Recent Legal Queries */
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-black/90">Recent Queries</h3>
                      <div className="w-12 h-1 bg-white/60 rounded-full"></div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-white/30 rounded-xl hover:bg-white/40 transition-all duration-200 cursor-pointer">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <Scale className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-black/90">Bail under Section 439 CrPC</div>
                          <div className="text-xs text-black/60">5 citations found</div>
                        </div>
                        <div className="text-xs text-black/60 bg-white/40 px-2 py-1 rounded-full">
                          Lawyer
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-white/30 rounded-xl hover:bg-white/40 transition-all duration-200 cursor-pointer">
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-black/90">IPC 420 fraud precedents</div>
                          <div className="text-xs text-black/60">8 cases matched</div>
                        </div>
                        <div className="text-xs text-black/60 bg-white/40 px-2 py-1 rounded-full">
                          Student
                        </div>
                      </div>
                    </div>
                  </>
                ) : currentConfig.content.type === 'projects' ? (
                  /* RAG Pipeline Workflow */
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-black/90">AI Pipeline</h3>
                      <div className="w-12 h-1 bg-white/60 rounded-full"></div>
                    </div>

                    <div className="bg-white/20 rounded-xl p-3 mb-2">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-black/60 bg-white/40 px-2 py-1 rounded-full">RAG Pipeline</div>
                        <div className="text-xs text-green-600 font-medium">Active</div>
                      </div>

                      <div className="mt-2 relative">
                        <div className="flex items-center space-x-4">
                          <div className="z-10">
                            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mb-2">
                              <Search className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-center text-xs text-black/80">Query</div>
                          </div>

                          <div className="z-0 flex-1 h-0.5 bg-white/30 relative">
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 animate-ping"></div>
                          </div>

                          <div className="z-10">
                            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center mb-2">
                              <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-center text-xs text-black/80">Vector Search</div>
                          </div>

                          <div className="z-0 flex-1 h-0.5 bg-white/30 relative">
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-400 animate-ping"></div>
                          </div>

                          <div className="z-10">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mb-2">
                              <MessageCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-center text-xs text-black/80">AI Response</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-4 border-t border-white/20">
                        <div className="flex justify-between text-xs">
                          <div className="text-black/60">Avg response:</div>
                          <div className="font-medium text-black/90">{'< 5 seconds'}</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : currentConfig.content.type === 'analytics' ? (
                  /* Platform Stats */
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-black/90">Platform Stats</h3>
                      <div className="w-12 h-1 bg-white/60 rounded-full"></div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-black/90">Cases Indexed</span>
                          <span className="text-sm text-black/70">39+ judgments</span>
                        </div>
                        <div className="w-full bg-white/30 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-emerald-400 to-blue-500 h-2.5 rounded-full"
                            style={{ width: '78%' }}
                          ></div>
                        </div>
                        <div className="mt-1 text-xs text-black/60">Supreme Court & High Courts</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/20 rounded-xl p-2">
                          <div className="text-xs text-black/60 mb-1">Response time</div>
                          <div className="text-xl font-bold text-black/90">{'< 5s'}</div>
                          <div className="text-xs text-emerald-600 mt-1">RAG pipeline</div>
                        </div>

                        <div className="bg-white/20 rounded-xl p-3">
                          <div className="text-xs text-black/60 mb-1">Features</div>
                          <div className="text-xl font-bold text-black/90">5+</div>
                          <div className="text-xs text-purple-600 mt-1">AI-powered tools</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Default Chat Interface */
                  <>
                    <div className="text-black/80 transition-all duration-500 transform">
                      <span className="text-sm font-medium">{currentConfig.content.greeting}</span>
                    </div>
                    <div className="text-xs text-black/70 transition-all duration-500">
                      {currentConfig.content.subtitle}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card Indicators */}
          <div className="flex space-x-2 mt-8">
            {cardConfigs.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCard(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentCard === index
                    ? (isDark ? 'bg-white scale-125' : 'bg-gray-800 scale-125')
                    : (isDark ? 'bg-gray-500 hover:bg-gray-300' : 'bg-gray-400 hover:bg-gray-600')
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinimalHero;
