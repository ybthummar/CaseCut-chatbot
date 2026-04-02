import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(undefined);

const THEMES = ['lavender', 'midnight', 'ocean', 'courtroom'];

const THEME_META = {
  lavender: {
    label: 'Lavender',
    description: 'Light purple gradient',
    gradient: 'from-purple-100 via-pink-50 to-purple-100',
    navBg: 'bg-white/80',
    cardBg: 'bg-white/60',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-white/40',
    accent: 'purple',
  },
  midnight: {
    label: 'Midnight',
    description: 'Dark elegant theme',
    gradient: 'from-gray-950 via-gray-900 to-gray-950',
    navBg: 'bg-gray-900/80',
    cardBg: 'bg-gray-800/60',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-400',
    border: 'border-white/10',
    accent: 'blue',
  },
  ocean: {
    label: 'Ocean',
    description: 'Deep blue gradient',
    gradient: 'from-blue-100 via-cyan-50 to-blue-100',
    navBg: 'bg-white/80',
    cardBg: 'bg-white/60',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-white/40',
    accent: 'blue',
  },
  courtroom: {
    label: 'Courtroom',
    description: 'Warm amber tones',
    gradient: 'from-amber-50 via-orange-50 to-amber-50',
    navBg: 'bg-white/80',
    cardBg: 'bg-white/60',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-white/40',
    accent: 'amber',
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('casecut_theme');
    return THEMES.includes(saved) ? saved : 'lavender';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-mode', theme);
    localStorage.setItem('casecut_theme', theme);
  }, [theme]);

  const meta = THEME_META[theme] || THEME_META.lavender;

  const value = useMemo(() => ({
    theme,
    themes: THEMES,
    themeMeta: THEME_META,
    meta,
    setTheme,
  }), [theme, meta]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
