import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ThemeMode } from '../../types';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('nullwave_theme') || localStorage.getItem('unlockr_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      applyTheme(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark');
      try {
        localStorage.setItem('nullwave_theme', theme);
        localStorage.setItem('unlockr_theme', theme);
      } catch {}
    }
  }, [theme]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    try {
      localStorage.setItem('nullwave_theme', next);
      localStorage.setItem('unlockr_theme', next);
    } catch {}
    setTheme(next);
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle theme"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${className || ''}`}
    >
      <Sun className="h-4 w-4 hidden dark:block" />
      <Moon className="h-4 w-4 block dark:hidden" />
    </button>
  );
};
