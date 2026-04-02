import { Palette, Check, Sun, Moon, Waves, Scale } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const THEME_ICONS = {
  lavender: <Sun className="size-3.5" />,
  midnight: <Moon className="size-3.5" />,
  ocean: <Waves className="size-3.5" />,
  courtroom: <Scale className="size-3.5" />,
};

const THEME_COLORS = {
  lavender: 'bg-purple-200',
  midnight: 'bg-gray-800',
  ocean: 'bg-blue-200',
  courtroom: 'bg-amber-200',
};

export default function ThemeToggle({ variant = 'auto' }) {
  const { theme, themes, themeMeta, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Dark variant for ChatPage, light variant for other pages
  const isDark = variant === 'dark' || (variant === 'auto' && (theme === 'midnight'));
  const btnBg = isDark
    ? 'bg-white/10 border-white/15 text-white/80 hover:bg-white/15'
    : 'bg-black/5 border-black/10 text-gray-700 hover:bg-black/10';
  const dropBg = isDark
    ? 'bg-gray-900/95 border-white/10'
    : 'bg-white/95 border-gray-200/60';
  const itemText = isDark ? 'text-gray-200' : 'text-gray-700';
  const itemHover = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
  const labelColor = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 ${btnBg}`}
        title="Change theme"
      >
        <Palette className="size-3.5" />
        <span className="text-xs font-medium hidden sm:inline">{themeMeta[theme]?.label}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl border backdrop-blur-xl shadow-xl overflow-hidden ${dropBg}`}
          >
            <div className="p-1.5">
              <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}>
                Theme
              </div>
              {themes.map((t) => {
                const meta = themeMeta[t];
                return (
                  <motion.button
                    key={t}
                    whileHover={{ x: 2 }}
                    onClick={() => { setTheme(t); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                      theme === t ? (isDark ? 'bg-white/10' : 'bg-gray-100') : ''
                    } ${itemText} ${itemHover}`}
                  >
                    <div className={`size-7 rounded-lg flex items-center justify-center ${THEME_COLORS[t]} ${
                      t === 'midnight' ? 'text-white' : 'text-gray-700'
                    }`}>
                      {THEME_ICONS[t]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium block">{meta?.label}</span>
                      <span className={`text-[10px] ${labelColor}`}>{meta?.description}</span>
                    </div>
                    {theme === t && (
                      <Check className="size-3.5 text-blue-500 shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
