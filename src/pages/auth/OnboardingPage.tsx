import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/authContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AtSign, Check, AlertCircle } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { user, profile, claimUsername } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already has username, send to dashboard
  React.useEffect(() => {
    if (profile?.username) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Force lowercase, remove spaces
    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(clean);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please choose a username.');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await claimUsername(username, displayName);
    setIsLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Failed to claim username.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center mx-auto mb-3">
            <AtSign className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Choose Your Profile URL
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            This will be your shareable Instagram bio link.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Your Name or Brand"
              placeholder="e.g. Aryan Pandey"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Claim Username *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 font-mono text-sm pointer-events-none select-none">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="aryan"
                  maxLength={20}
                  required
                  className="w-full h-10 pl-8 pr-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                />
              </div>
              <p className="text-xs text-neutral-500">
                Only lowercase letters, numbers, and underscores (3-20 chars).
              </p>
            </div>

            {/* Live Profile Link Preview */}
            {username && (
              <div className="p-3 rounded-md bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300">
                <span className="text-neutral-400">Your bio link will be: </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {window.location.origin}/@{username}
                </span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              disabled={!username || username.length < 3}
            >
              <Check className="w-4 h-4" />
              <span>Claim Profile & Go to Dashboard</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
