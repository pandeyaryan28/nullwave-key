import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Waves, Plus, LogOut, Menu, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';

export const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' || path === '/dashboard') return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const dashboardLinks = [
    { label: 'Overview', path: '/dashboard' },
    { label: 'Resources', path: '/dashboard/resources' },
    { label: 'Settings', path: '/dashboard/settings' },
  ];

  const publicLinks = [
    { label: 'Overview', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'About', path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Main Nav */}
        <div className="flex items-center gap-8">
          <Link
            to={user ? '/dashboard' : '/'}
            className="flex items-center gap-2.5 text-neutral-950 dark:text-neutral-50 font-bold text-lg tracking-tight focus-visible:outline-none select-none"
          >
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center">
              <Waves className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight text-neutral-950 dark:text-neutral-50">NullWave</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {user
              ? dashboardLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      isActive(link.path)
                        ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))
              : publicLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      isActive(link.path)
                        ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-3">
              {profile?.username && (
                <Link
                  to={`/${profile.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <span>/{profile.username}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}

              <Button
                size="sm"
                variant="primary"
                onClick={() => navigate('/dashboard/resources/new')}
              >
                <Plus className="w-4 h-4" />
                <span>Upload Resource</span>
              </Button>

              <button
                onClick={() => signOut()}
                title="Sign out"
                aria-label="Sign out"
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button size="sm" variant="subtle">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" variant="primary">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 pt-2 pb-4 space-y-2">
          {user ? (
            <>
              {dashboardLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(link.path)
                      ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {profile?.username && (
                <Link
                  to={`/${profile.username}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-md"
                >
                  <span>View Wave Station (/{profile.username})</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}

              <Button
                variant="primary"
                className="w-full mt-2"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/dashboard/resources/new');
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Upload Resource</span>
              </Button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md mt-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <div className="space-y-1 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                {publicLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 text-sm font-medium rounded-md ${
                      isActive(link.path)
                        ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
