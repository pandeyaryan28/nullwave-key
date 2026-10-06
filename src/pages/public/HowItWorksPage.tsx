import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Upload,
  Radio,
  Shield,
  ArrowRight,
  Eye,
  Check,
  Share2,
  FileCheck,
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Link to="/" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-medium">How It Works</span>
      </nav>

      {/* Header */}
      <header className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-neutral-900 dark:bg-neutral-100"></span>
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
            Protocol Overview
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          The 3-stage transmission protocol
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
          NullWave operates as a high-speed direct channel between your digital resources and your social audience. Here is exactly how content travels from your local storage to your audience’s devices.
        </p>
      </header>

      {/* Creator Workflow Section */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Stage 1: Creator Broadcast
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            How creators upload, generate, and share digital assets in under 60 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-sm border border-neutral-200 dark:border-neutral-700">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                1. Upload Document
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Drop your PDF handbook, guide, or cheatsheet (up to 25 MB) into your creator dashboard. NullWave automatically generates a cryptographically secure 4-digit wave code.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-sm border border-neutral-200 dark:border-neutral-700">
              <Radio className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                2. Share in Video
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Add your profile link in your bio (<span className="font-mono text-neutral-900 dark:text-neutral-100">nullwave.com/yourhandle</span>) and state your 4-digit code in the Reel, Story, or caption.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-sm border border-neutral-200 dark:border-neutral-700">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                3. One Link, Infinite Guides
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Never change your bio link again. Each new guide gets a unique 4-digit code under your single permanent profile link.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Audience Access Section */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Stage 2: Audience Access
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            How followers unlock and read resources without getting stuck behind sign-up forms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4 border-neutral-300 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Viewer Opens Your Profile
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              When a follower clicks your profile link from Instagram, TikTok, or YouTube, your profile loads in under 250 milliseconds with a dedicated numeric code box front-and-center.
            </p>
            <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-md font-mono text-xs text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800">
              Profile: nullwave.com/aryan • Status: Active
            </div>
          </Card>

          <Card className="p-6 space-y-4 border-neutral-300 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Instant Numeric Unlock
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The viewer enters the 4 digits (e.g. <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">4827</span>) or opens the document directly from your profile. The platform verifies access and opens the PDF immediately for online reading or local file download.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <FileCheck className="w-4 h-4 shrink-0" />
              <span>Zero credentials required • Session unlocked immediately</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Security & Analytics Section */}
      <section id="security" className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Stage 3: Security & Analytics
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Engineered defenses against abuse and transparent audience insights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Brute-Force Rate Limiting
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              To prevent automated scrapers from guessing access codes, the client activates an automatic 30-second cooldown timer if 5 invalid codes are submitted consecutively.
            </p>
            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Isolated per creator handle namespace</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Automatic countdown timer display</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                24-Hour Unique Window Measurement
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Views within a 24-hour window from the same device are logged as repeat visits rather than inflating unique reach, giving creators accurate conversion benchmarks.
            </p>
            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero fingerprinting or cookie tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified download events tracked on actual file transfer</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="p-8 sm:p-12 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          Start sharing your resources today
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
          Set up your custom profile in less than two minutes and eliminate drop-offs from your bio link.
        </p>
        <div className="pt-2">
          <Link to="/signup">
            <Button size="lg" variant="primary">
              <span>Create Your Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
