import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Link to="/" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-medium">About</span>
      </nav>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-neutral-900 dark:bg-neutral-100"></span>
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
            Engineering Manifesto
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 leading-[1.15]">
          Null the friction. Transmit the signal.
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
          NullWave was built out of frustration with modern link-in-bio tools that act as tollbooths between creators and their audiences.
        </p>
      </header>

      {/* Core Narrative */}
      <section className="prose dark:prose-invert max-w-none text-sm sm:text-base text-neutral-700 dark:text-neutral-300 space-y-6 leading-relaxed">
        <p>
          As social media algorithms shifted toward educational breakdowns, cheatsheets, and deep-dive carousels, creators began spending dozens of hours authoring high-value PDF companions for their videos.
        </p>
        <p>
          Yet the distribution pipeline remained stuck in 2012: long link trees with 14 competing buttons, clunky email lead-capture forms, forced app installs, and aggressive ad trackers. On mobile devices—where 94% of social video consumers browse—the result was devastating: <strong>more than 75% of interested followers dropped off before ever seeing the document</strong>.
        </p>
        <p>
          We asked a fundamental question: <em>What if receiving a digital file from a creator were as direct and instantaneous as tuning into a radio frequency?</em>
        </p>
      </section>

      {/* Guiding Principles */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Our Four Guiding Directives
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="p-6 space-y-3">
            <div className="w-8 h-8 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-xs border border-neutral-200 dark:border-neutral-700">
              01
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Zero Audience Tollbooths
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We never demand that your followers create an account, verify a captcha, or sacrifice their personal contact details just to read the knowledge you published for them.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-8 h-8 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-xs border border-neutral-200 dark:border-neutral-700">
              02
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Sub-250ms Mobile Precision
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every millisecond of latency is a tax on attention. NullWave documents are stripped of heavy marketing trackers and designed to render immediately inside in-app webviews.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-8 h-8 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-xs border border-neutral-200 dark:border-neutral-700">
              03
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Honest, Transparent Analytics
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              No surveillance capitalism. Our analytics measure real engagement without third-party advertising cookies or cross-site tracking scripts.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-8 h-8 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold text-xs border border-neutral-200 dark:border-neutral-700">
              04
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Dual-Theme Parity & Clean UI
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every interface is built to rigorous human-centric UI standards. High-contrast typography, zero gimmicks, zero floating slop, and seamless dark and light modes.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="p-8 sm:p-12 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          Join creators distributing cleanly
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
          Share your digital work cleanly and see how much farther your ideas travel when nothing is in the way.
        </p>
        <div className="pt-2">
          <Link to="/signup">
            <Button size="lg" variant="primary">
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
