import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/authContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Waves, Check, AlertCircle, Bookmark } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { profile, claimUsername, continueAsViewer } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isViewerLoading, setIsViewerLoading] = useState(false);
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

  const handleContinueAsViewer = async () => {
    setIsViewerLoading(true);
    setError(null);
    try {
      await continueAsViewer();
      navigate('/dashboard/saved');
    } catch {
      setError('Failed to update account role.');
    } finally {
      setIsViewerLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center mx-auto mb-3 shadow-clay-sm">
            <Waves className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Claim Your Profile Handle
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            This will be your permanent profile link for sharing your documents.
          </p>
        </div>

        <Card className="p-6 sm:p-8 rounded-2xl shadow-clay-card animate-clay-pop border-slate-200/80 dark:border-white/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/80 text-xs text-red-700 dark:text-red-300 flex items-center gap-2 shadow-clay-sm">
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
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="aryan"
                  maxLength={20}
                  required
                  className="w-full h-10 px-3.5 py-2 text-sm rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 font-mono shadow-clay-inset focus:outline-none focus:bg-white dark:focus:bg-[#1a1e28] focus:shadow-clay-inset-focus transition-all duration-150"
                />
              </div>
              <p className="text-xs text-neutral-500">
                Only lowercase letters, numbers, and underscores (3-20 chars).
              </p>
            </div>

            {/* Live Profile Link Preview */}
            {username && (
              <div className="p-3.5 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/80 border border-slate-200/70 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300 shadow-clay-inset">
                <span className="text-neutral-500 dark:text-neutral-400">Your bio link will be: </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {window.location.origin}/{username}
                </span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full rounded-xl"
              isLoading={isLoading}
              disabled={!username || username.length < 3}
            >
              <Check className="w-4 h-4" />
              <span>Claim Profile & Go to Dashboard</span>
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#1a1e28] px-2.5 text-neutral-400 font-medium">
                  Or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full rounded-xl shadow-clay-sm hover:shadow-clay-card"
              isLoading={isViewerLoading}
              onClick={handleContinueAsViewer}
            >
              <Bookmark className="w-4 h-4" />
              <span>Continue as Viewer (Read & Save Only)</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
