import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, LogOut, MessageCircle, Settings, User, FileText, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
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
  const navigate = useNavigate();
  const location = useLocation();

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
          ? 'text-gray-900'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </MotionLink>
  );

  return (
    <div className="sticky top-0 z-50 flex justify-center px-4 pt-6 pb-2 bg-gradient-to-b from-purple-100/90 to-transparent">
      <nav className="bg-white/80 backdrop-blur-md rounded-2xl px-4 sm:px-6 py-3 shadow-lg border border-white/20 w-full max-w-4xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <img src={logo} alt="CaseCut" className="h-7 w-7" />
            <span className="text-lg font-semibold text-gray-900">CaseCut AI</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navLink('/', 'Home')}
            {navLink('/about', 'About')}
            {navLink('/learning', 'Learning Hub')}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

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
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50">
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
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-all duration-200 flex items-center space-x-1.5 text-sm font-medium flex-shrink-0"
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
