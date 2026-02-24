import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Chrome, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../../assets/Logo.svg';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Failed to log in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] text-white px-4">
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#1488fc]/[0.04] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="rounded-2xl border border-white/[0.06] bg-[#141416] p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <img src={logo} alt="CaseCut" className="h-8 w-8" />
            <span className="text-base font-semibold">CaseCut AI</span>
          </div>

          <h1 className="text-xl font-bold text-center mb-1.5">Welcome back</h1>
          <p className="text-center text-[#8a8a8f] text-sm mb-8">
            Log in to continue your legal research
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8a8a8f] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#5a5a5f]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1e1e22] border border-white/[0.06] text-sm text-white placeholder:text-[#5a5a5f] focus:outline-none focus:ring-1 focus:ring-[#1488fc]/50 transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8a8a8f] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#5a5a5f]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1e1e22] border border-white/[0.06] text-sm text-white placeholder:text-[#5a5a5f] focus:outline-none focus:ring-1 focus:ring-[#1488fc]/50 transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(20,136,252,0.3)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log in'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#141416] text-[#5a5a5f]">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-full text-sm font-medium border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-white transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Chrome className="size-4" />
            Google
          </button>

          <p className="mt-6 text-center text-xs text-[#8a8a8f]">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#1488fc] hover:text-[#4da5fc] font-medium">
              Sign up
            </Link>
          </p>

          <p className="mt-3 text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-[#5a5a5f] hover:text-white transition-colors">
              <ArrowLeft className="size-3" />
              Back to home
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
