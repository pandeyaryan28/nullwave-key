import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import {
  Upload,
  Hash,
  Share2,
  Lock,
  ArrowRight,
  Eye,
  Download,
  Check,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [demoUsername, setDemoUsername] = useState('');

  const handleDemoLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoUsername.trim()) return;
    const clean = demoUsername.replace(/^@/, '').toLowerCase().trim();
    navigate(`/@${clean}`);
  };

  return (
    <div className="space-y-20 py-8 sm:py-16">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto px-4 space-y-6">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 leading-[1.1]">
          Frictionless resource distribution for social creators
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Upload guides, templates, and PDFs. Get an instant 6-digit access code. Share your bio link and code on Instagram Reels and Stories without signup walls for viewers.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/signup" className="w-full sm:w-auto">
            <Button size="lg" variant="primary" className="w-full sm:w-auto">
              <span>Create Creator Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <Link to="/login" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Creator Sign In
            </Button>
          </Link>
        </div>

        {/* Quick Visit Jump */}
        <div className="pt-6 max-w-md mx-auto">
          <form onSubmit={handleDemoLookup} className="flex gap-2">
            <Input
              placeholder="Jump to creator profile (e.g. aryan)"
              value={demoUsername}
              onChange={e => setDemoUsername(e.target.value)}
              className="text-xs sm:text-sm"
            />
            <Button type="submit" variant="secondary" size="md" className="shrink-0">
              Visit
            </Button>
          </form>
        </div>
      </section>

      {/* Core 3-Step Creator Flow */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            How It Works
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Three simple steps between your resource and your audience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm border border-neutral-200 dark:border-neutral-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                1. Upload PDF
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Drop your guide or document into your dashboard. The system instantly generates a secure 6-digit numeric access code.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm border border-neutral-200 dark:border-neutral-700">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                2. Share Reel & Bio Link
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Direct your followers to your bio link <span className="font-mono text-neutral-900 dark:text-neutral-200">/@username</span> with the 6-digit code in your video or caption.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm border border-neutral-200 dark:border-neutral-700">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                3. Instant Viewer Access
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Viewers type the 6 digits on their phone and immediately view and download the PDF. Zero accounts or signups required.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Analytics & Features Highlight */}
      <section className="max-w-5xl mx-auto px-4">
        <Card className="p-8 sm:p-10 border-neutral-300 dark:border-neutral-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Privacy-first distribution analytics
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Track how your resources perform in real time. Know your exact total reach, unique repeat viewers within a 24-hour measurement window, and actual completed downloads.
              </p>

              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>24-hour unique visitor identification without tracking cookies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Real download events tracked on actual file retrieval</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Scoped 6-digit access codes for each creator</span>
                </div>
              </div>
            </div>

            {/* Mock Authentic Metrics Box */}
            <div className="p-6 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Resource Stats
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-bold">
                  CODE: 482731
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 mb-1 flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>Total</span>
                  </div>
                  <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    8,421
                  </div>
                </div>

                <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 mb-1 flex items-center justify-center gap-1">
                    <Hash className="w-3 h-3" />
                    <span>Unique</span>
                  </div>
                  <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    5,721
                  </div>
                </div>

                <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 mb-1 flex items-center justify-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>Saved</span>
                  </div>
                  <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    4,109
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Bottom CTA */}
      <section className="text-center max-w-xl mx-auto px-4 space-y-4 pb-8">
        <div className="w-10 h-10 rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center mx-auto mb-2">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
          Ready to simplify your distribution?
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          Set up your public creator profile and upload your first resource in under two minutes.
        </p>
        <Link to="/signup" className="inline-block pt-2">
          <Button size="md" variant="primary">
            Get Started Now
          </Button>
        </Link>
      </section>
    </div>
  );
};
