import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Check, ArrowRight, Calculator } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [estimatedMonthlyViews, setEstimatedMonthlyViews] = useState<number>(10000);

  // Calculate estimated downloads with NullWave (typical ~45% conversion) vs Linktree/Email forms (~8% conversion)
  const traditionalDownloads = Math.round(estimatedMonthlyViews * 0.08);
  const nullWaveDownloads = Math.round(estimatedMonthlyViews * 0.44);
  const additionalGained = nullWaveDownloads - traditionalDownloads;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Link to="/" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-medium">Pricing</span>
      </nav>

      {/* Header */}
      <header className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-neutral-900 dark:bg-neutral-100"></span>
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
            Plans & Pricing
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          Transparent, zero-commission infrastructure
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
          NullWave will never take transaction commissions or gate your content behind revenue taxes. Pick the bandwidth tier that matches your distribution scale.
        </p>
      </header>

      {/* Pricing Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Tier 1: Wave Free */}
        <Card className="p-8 space-y-6 flex flex-col justify-between border-neutral-200 dark:border-neutral-800">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Community
              </h3>
              <Badge variant="neutral">Free Forever</Badge>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-neutral-950 dark:text-neutral-50">$0</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">No credit card required</p>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Ideal for independent educators, solo creators, and designers launching their first profile.
            </p>
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited viewer access</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Up to 10 active resources</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>25 MB max PDF file ceiling</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Standard 4-digit wave codes</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>24-hour unique analytics</span>
              </div>
            </div>
          </div>
          <Link to="/signup" className="pt-4">
            <Button variant="outline" className="w-full">
              Get Started Free
            </Button>
          </Link>
        </Card>

        {/* Tier 2: Creator Pro (Featured) */}
        <Card className="p-8 space-y-6 flex flex-col justify-between border-neutral-900 dark:border-neutral-100 relative shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Creator Pro
              </h3>
              <Badge variant="neutral" className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                Popular
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-neutral-950 dark:text-neutral-50">
                $12 <span className="text-sm font-normal text-neutral-500">/month</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Billed monthly or $120/yr</p>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              For high-volume social creators publishing regular guides, templates, and video companion files.
            </p>
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Everything in Community</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited published resources</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Custom cover thumbnails (5MB)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Priority global CDN distribution</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>CSV analytics export</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Removes NullWave watermark</span>
              </div>
            </div>
          </div>
          <Link to="/signup" className="pt-4">
            <Button variant="primary" className="w-full">
              <span>Start Pro Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>

        {/* Tier 3: Studio / Agency */}
        <Card className="p-8 space-y-6 flex flex-col justify-between border-neutral-200 dark:border-neutral-800">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Studio
              </h3>
              <Badge variant="neutral">Teams</Badge>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-neutral-950 dark:text-neutral-50">
                $39 <span className="text-sm font-normal text-neutral-500">/month</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Up to 5 creator seats</p>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Designed for production studios, creator collectives, agencies, and brand media teams.
            </p>
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Everything in Pro</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Custom domain mapping (e.g. guides.studio.com)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Multi-seat creator management</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dedicated webhook integration</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>99.9% uptime SLA guarantee</span>
              </div>
            </div>
          </div>
          <Link to="/signup" className="pt-4">
            <Button variant="outline" className="w-full">
              Contact Studio Sales
            </Button>
          </Link>
        </Card>
      </section>

      {/* Interactive Retention & Audience Gain Calculator */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <Calculator className="w-4 h-4" />
            <span>Interactive Audience Calculator</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Calculate your retention increase with zero-wall transmission
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Slide or enter your monthly social profile visits to model how eliminating mandatory signup forms boosts downloads.
          </p>
        </div>

        <Card className="p-8 space-y-8 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="space-y-3 max-w-md">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Estimated Monthly Social Bio Visits: {estimatedMonthlyViews.toLocaleString()}
            </label>
            <input
              type="range"
              min="1000"
              max="200000"
              step="1000"
              value={estimatedMonthlyViews}
              onChange={e => setEstimatedMonthlyViews(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-neutral-100"
            />
            <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
              <span>1,000</span>
              <span>100,000</span>
              <span>200,000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">Traditional Link Trees (~8%)</span>
              <div className="text-2xl font-bold font-mono text-neutral-700 dark:text-neutral-300">
                {traditionalDownloads.toLocaleString()}
              </div>
              <span className="text-[11px] text-neutral-400">delivered downloads</span>
            </div>

            <div className="p-4 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">NullWave Transmission (~44%)</span>
              <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-neutral-50">
                {nullWaveDownloads.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">delivered downloads</span>
            </div>

            <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Net Audience Gained</span>
              <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                +{additionalGained.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">fans receiving your guide</span>
            </div>
          </div>
        </Card>
      </section>

      {/* Pricing FAQ Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Direct answers to infrastructure and billing queries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-2">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Is the Community plan genuinely free forever?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Yes. You can create a profile, upload up to 10 active guides, and share 4-digit access codes with unlimited audience downloads without ever entering payment information.
            </p>
          </Card>

          <Card className="p-6 space-y-2">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              What types of files are supported?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Currently, PDF documents up to 25 MB are natively supported with in-browser viewers and high-speed downloads. Additional file formats (EPUB, ZIP) are rolling out soon.
            </p>
          </Card>

          <Card className="p-6 space-y-2">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Can I change my profile handle later?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Your profile handle is claimed during onboarding. You can update your display name and profile details at any time in your profile settings.
            </p>
          </Card>

          <Card className="p-6 space-y-2">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Do my audience members need to sign up?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Never. Viewers simply enter the 4-digit code or tap the document directly on your profile. No login or signup walls, and no tracking cookies.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
};
