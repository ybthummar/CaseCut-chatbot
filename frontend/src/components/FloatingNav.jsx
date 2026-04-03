import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, LogOut, MessageCircle, Settings, User, FileText, Scale, Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Avatar, AvatarImage, AvatarFallback } from './ui/interfaces-avatar';
import ThemeToggle from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import logo from '../../assets/Logo.svg';

const MotionLink = motion(Link);

export default function FloatingNav() {
  const { user, logout } = useAuth();
  const { theme, meta } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === 'midnight';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const navLink = (to, label) => (
    <MotionLink
      to={to}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className={`text-sm font-medium transition-colors ${
        location.pathname === to
          ? meta.textPrimary
          : `${meta.textSecondary}`
      }`}
    >
      {label}
    </MotionLink>
  );

  return (
    <div className={`sticky top-0 z-50 flex justify-center px-4 pt-6 pb-2 bg-gradient-to-b ${isDark ? 'from-gray-950/90' : 'from-purple-100/90'} to-transparent`}>
      <nav className={`${meta.navBg} backdrop-blur-md rounded-2xl px-4 sm:px-6 py-3 shadow-lg border ${meta.border} w-full max-w-4xl`}>
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <img src={logo} alt="CaseCut" className="h-7 w-7" />
            <span className={`text-lg font-semibold ${meta.textPrimary}`}>CaseCut AI</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navLink('/', 'Home')}
            {navLink('/about', 'About')}
            {navLink('/learning', 'Learning Hub')}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle variant={isDark ? 'dark' : 'auto'} />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 rounded-full p-0.5 ring-2 ring-transparent ${isDark ? 'hover:ring-purple-500/50' : 'hover:ring-purple-300'} transition-all duration-200 cursor-pointer focus:outline-none`}
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
                      <p className="text-sm font-semibold truncate">{user.displayName || 'User'}</p>
                      <p className="text-xs opacity-60 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/chat')}>
                  <MessageCircle className="size-4 opacity-60" />
                  <span className="font-medium">Legal Chat</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/summarizer')}>
                  <FileText className="size-4 opacity-60" />
                  <span className="font-medium">Summarizer</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/precedents')}>
                  <Scale className="size-4 opacity-60" />
                  <span className="font-medium">Precedent Finder</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/voice')}>
                  <Mic className="size-4 opacity-60" />
                  <span className="font-medium">Voice Assistant</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
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
  );
}
