import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/authContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  Upload,
  Hash,
  Waves,
  ArrowRight,
  Eye,
  Download,
  Check,
  Radio,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [demoUsername, setDemoUsername] = useState('');
  const [sampleCode, setSampleCode] = useState('');
  const [simulatedUnlock, setSimulatedUnlock] = useState(false);

  // If already logged in, redirect to dashboard or onboarding
  useEffect(() => {
    if (user) {
      if (profile && !profile.username) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const handleDemoLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoUsername.trim()) return;
    const clean = demoUsername.replace(/^(?:@|%40)+/, '').toLowerCase().trim();
    navigate(`/${clean}`);
  };

  const handleSampleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (sampleCode.trim() === '4827') {
      setSimulatedUnlock(true);
    } else {
      setSimulatedUnlock(false);
    }
  };

  return (
    <div className="space-y-24 py-10 sm:py-20">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-4 space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/80 dark:bg-neutral-900/80 border border-slate-200/80 dark:border-white/10 shadow-clay-sm text-xs font-semibold text-neutral-800 dark:text-neutral-200 backdrop-blur-sm">
          <Waves className="w-3.5 h-3.5" />
          <span>Direct Creator-to-Audience Distribution</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 leading-[1.12]">
          Zero-friction digital resource distribution for modern creators
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Upload PDF guides, cheatsheets, and slides. Generate an instant 4-digit access code. Share your profile link and code across social video captions without sign-up walls for your audience.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/signup" className="w-full sm:w-auto">
            <Button size="lg" variant="primary" className="w-full sm:w-auto">
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <Link to="/how-it-works" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              How It Works
            </Button>
          </Link>
        </div>

        {/* Quick Profile Lookup Form */}
        <div className="pt-6 max-w-md mx-auto">
          <form onSubmit={handleDemoLookup} className="flex gap-2">
            <Input
              placeholder="Find creator profile (e.g. aryan)"
              value={demoUsername}
              onChange={e => setDemoUsername(e.target.value)}
              className="text-xs sm:text-sm font-mono"
            />
            <Button type="submit" variant="secondary" size="md" className="shrink-0">
              View Profile
            </Button>
          </form>
        </div>
      </section>

      {/* Interactive 4-Digit Code Demo Box */}
      <section className="max-w-4xl mx-auto px-4">
        <Card className="p-6 sm:p-8 border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1a1e28]/95 shadow-clay-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-bold shadow-clay-sm">
                <Waves className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 block">
                  Interactive Code Demo
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  nullwave.com/demo • 4-Digit Code
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-emerald-600 dark:bg-emerald-400"></span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Online
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Interactive Code Tryout */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Try the 4-Digit Unlock Experience
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Enter sample code <code className="font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-900 dark:text-neutral-100">4827</code> to simulate instant audience access.
                </p>
              </div>

              <form onSubmit={handleSampleUnlock} className="flex gap-2">
                <Input
                  maxLength={4}
                  value={sampleCode}
                  onChange={e => setSampleCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="4827"
                  className="font-mono text-center tracking-widest text-base font-bold"
                />
                <Button type="submit" variant="primary" size="md">
                  Unlock
                </Button>
              </form>

              {simulatedUnlock ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Code verified! Resource unlocked in under 50ms without viewer login.</span>
                </div>
              ) : (
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-md text-xs text-neutral-600 dark:text-neutral-400">
                  Viewers require zero sign-in, zero app installation, and zero email input.
                </div>
              )}
            </div>

            {/* Real-time stats snapshot */}
            <div className="p-5 rounded-2xl bg-[#e7ecf3]/60 dark:bg-[#131720]/70 border border-slate-200/70 dark:border-white/10 shadow-clay-inset space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-500 uppercase tracking-wider">
                  Real-Time Engagement Stats
                </span>
                <span className="font-mono text-[11px] text-neutral-500">
                  24h Window
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm">
                  <div className="text-[11px] text-neutral-500 mb-0.5 flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>Views</span>
                  </div>
                  <div className="font-mono text-base font-bold text-neutral-900 dark:text-neutral-100">
                    12,480
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm">
                  <div className="text-[11px] text-neutral-500 mb-0.5 flex items-center justify-center gap-1">
                    <Hash className="w-3 h-3" />
                    <span>Unique</span>
                  </div>
                  <div className="font-mono text-base font-bold text-neutral-900 dark:text-neutral-100">
                    8,932
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm">
                  <div className="text-[11px] text-neutral-500 mb-0.5 flex items-center justify-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>Downloads</span>
                  </div>
                  <div className="font-mono text-base font-bold text-neutral-900 dark:text-neutral-100">
                    6,215
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center font-mono">
                Confirmed Conversion Rate: 49.8%
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Core 3-Step Flow */}
      <section className="max-w-5xl mx-auto px-4 space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-neutral-900 dark:bg-neutral-100"></span>
            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
              How NullWave Works
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Three direct steps between resource and audience
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No bloated link stacks. No mandatory viewer signups. Pure simplicity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="interactive" className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-sm border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                1. Upload PDF Guide
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Upload your document (up to 25 MB). NullWave instantly generates an isolated 4-digit numeric access code.
              </p>
            </div>
          </Card>

          <Card variant="interactive" className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-sm border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                2. Share Code in Socials
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Direct followers to your permanent profile link <span className="font-mono text-neutral-900 dark:text-neutral-100">nullwave.com/yourhandle</span> and speak or write the 4-digit code in the video caption.
              </p>
            </div>
          </Card>

          <Card variant="interactive" className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-sm border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                3. Zero-Wall Audience Access
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Followers tap your link, type the 4 digits or open directly on their phone, and immediately read or download the PDF without signing up.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Signal vs Noise Benchmark */}
      <section className="max-w-5xl mx-auto px-4">
        <Card className="p-8 sm:p-10 border-slate-200/80 dark:border-white/10 shadow-clay-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Privacy-first, transparent analytics
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Know the exact performance of your resources without invading audience privacy. Track total views, unique reach across a 24-hour measurement window, and genuine completed file downloads.
              </p>

              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>24-hour unique visitor identification without advertising cookies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real download events recorded on actual file retrieval</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sub-millisecond fast-path code resolution from session memory</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated 30-second cooldown timer after 5 invalid attempts</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-[#e7ecf3]/60 dark:bg-[#131720]/70 border border-slate-200/70 dark:border-white/10 shadow-clay-inset space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Why NullWave Converts
                  </span>
                  <Badge variant="neutral">Benchmark</Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1 font-medium">
                      <span>NullWave Access Conversion</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">~48%</span>
                    </div>
                    <div className="w-full h-2 rounded bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-emerald-600 dark:bg-emerald-400 rounded" style={{ width: '48%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 font-medium text-neutral-500">
                      <span>Traditional Email Gates / Signups</span>
                      <span className="font-mono text-neutral-500">~8%</span>
                    </div>
                    <div className="w-full h-2 rounded bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-neutral-400 dark:bg-neutral-600 rounded" style={{ width: '8%' }}></div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed pt-2">
                  Eliminating viewer registration friction prevents the 80%+ drop-off common to mobile in-app browsers.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Bottom CTA */}
      <section className="text-center max-w-xl mx-auto px-4 space-y-4 pb-8">
        <div className="w-12 h-12 rounded-xl bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center mx-auto mb-2 shadow-clay-btn">
          <Waves className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950 dark:text-neutral-50">
          Ready to distribute without barriers?
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          Set up your creator profile and share your first document in under two minutes.
        </p>
        <div className="pt-2">
          <Link to="/signup">
            <Button size="md" variant="primary">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
