import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center">
            <Lock className="w-3 h-3" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
            Unlockr
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
            Creator Resource Distribution
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-neutral-500 dark:text-neutral-400">
          <Link to="/" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
            Home
          </Link>
          <Link to="/login" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
            Creator Sign In
          </Link>
          <Link to="/signup" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
            Get Started
          </Link>
        </div>
      </div>
    </footer>
  );
};
