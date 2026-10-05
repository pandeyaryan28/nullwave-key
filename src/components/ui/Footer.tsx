import React from 'react';
import { Link } from 'react-router-dom';
import { Waves } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-neutral-200 dark:border-neutral-800 text-sm">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center">
                <Waves className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold tracking-tight text-neutral-950 dark:text-neutral-50 text-base">
                NullWave
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Zero-friction creator resource transmission via direct 6-digit wave codes. No viewer signups, no gatekeeping walls.
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 pt-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-600 dark:bg-emerald-400"></span>
              <span className="font-medium text-emerald-800 dark:text-emerald-300">Signal: Operational</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
              <li>
                <Link to="/" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Features & Architecture
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Pricing & Calculator
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform / Manifest */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
              <li>
                <Link to="/about" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  About & Philosophy
                </Link>
              </li>
              <li>
                <Link to="/how-it-works#security" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Rate Limiting & Security
                </Link>
              </li>
              <li>
                <Link to="/features#storage" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Storage & Fallback Engine
                </Link>
              </li>
            </ul>
          </div>

          {/* Creator Hub */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Creators
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
              <li>
                <Link to="/signup" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Create Wave Station
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Station Sign In
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Creator Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <p>© {new Date().getFullYear()} NullWave. Direct creator transmission platform.</p>
          <p className="font-mono text-[11px]">Zero gatekeeping • Pure signal</p>
        </div>
      </div>
    </footer>
  );
};
