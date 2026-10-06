import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Check,
  X,
  FileText,
  BarChart2,
  HardDrive,
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Link to="/" className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-medium">Features</span>
      </nav>

      {/* Header */}
      <header className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-neutral-900 dark:bg-neutral-100"></span>
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
            System Architecture
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          Engineered for zero friction and high-fidelity delivery
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
          Traditional link trees and digital download gates force viewers through complex signup walls, slow email verification flows, and intrusive cookies. NullWave replaces this with a direct 4-digit transmission channel.
        </p>
      </header>

      {/* Core Architectural Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="interactive" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              4-Digit Wave Code Protocol
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every resource receives an isolated 4-digit numeric code within a creator-scoped namespace. Viewers enter 4 digits to resolve the file instantly from local memory or sub-millisecond document queries.
            </p>
          </div>
        </Card>

        <Card variant="interactive" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Zero-Wall Viewer Reception
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              No mandatory account creation. No password resets. No viewer email collection. Viewers on mobile in-app browsers view and download the PDF in two taps, dropping bounce rates below 12%.
            </p>
          </div>
        </Card>

        <Card variant="interactive" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Dual-Storage Resilience Engine
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Direct Cloud Storage uploads with automated 400KB Firestore chunk subcollections fallback. Even during strict network policies or storage CORS degradation, resources are delivered 100% reliably.
            </p>
          </div>
        </Card>

        <Card variant="interactive" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              24-Hour Non-Invasive Analytics
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Privacy-first analytics measure total views, confirmed downloads, and genuine unique visitors across rolling 24-hour windows using zero-PII client tokens rather than creepy surveillance trackers.
            </p>
          </div>
        </Card>

        <Card variant="interactive" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Clean Profile & Document Routing
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Clean URLs like <span className="font-mono text-xs text-neutral-900 dark:text-neutral-100">nullwave.com/username/code</span> automatically normalize encoded `@` handles and preserve backwards-compatible deep linking across social bio placements.
            </p>
          </div>
        </Card>

        <Card variant="interactive" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#e7ecf3]/80 dark:bg-[#131720]/90 text-neutral-900 dark:text-neutral-100 flex items-center justify-center border border-slate-200/70 dark:border-white/10 shadow-clay-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Adaptive Anti-Abuse Shield
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Client-side rate limiters trigger a mandatory 30-second cooldown after 5 failed code attempts, preventing brute force automated scrapers while keeping latency imperceptible for real human fans.
            </p>
          </div>
        </Card>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Direct Access vs Traditional Link Tools
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Why audiences abandon traditional link trees and how NullWave restores direct access.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-clay-card bg-white dark:bg-[#1a1e28]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#e7ecf3]/60 dark:bg-[#131720]/70 text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 border-b border-slate-200/80 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold">Capability</th>
                <th className="px-6 py-4 font-semibold text-neutral-950 dark:text-neutral-50">
                  NullWave Profile
                </th>
                <th className="px-6 py-4 font-semibold">Standard Link Aggregators</th>
                <th className="px-6 py-4 font-semibold">Email Capture Portals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10 bg-white dark:bg-[#1a1e28]">
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Viewer Sign-Up Requirement
                </td>
                <td className="px-6 py-4 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" /> Zero sign-up required
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  Often required for files
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <X className="w-4 h-4 text-red-500 shrink-0" /> Mandatory email submission
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Mobile In-App Browser Latency
                </td>
                <td className="px-6 py-4 text-emerald-700 dark:text-emerald-400 font-semibold">
                  Sub-250ms immediate load
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  1.5s - 3.2s bloated bundles
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  Slow multi-step redirect
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Direct Code-to-File Binding
                </td>
                <td className="px-6 py-4 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" /> 4-digit wave codes
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  None (cluttered button stack)
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  Manual download email links
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Document Size Ceiling
                </td>
                <td className="px-6 py-4 text-emerald-700 dark:text-emerald-400 font-semibold">
                  Up to 25 MB per PDF guide
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  Often capped at 5-10 MB
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  Varies by subscription tier
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Third-Party Cookie Tracking
                </td>
                <td className="px-6 py-4 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" /> Zero tracking cookies
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  Multiple advertising pixels
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  Aggressive lead marketing cookies
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA Section */}
      <section className="p-8 sm:p-12 rounded-2xl bg-[#e7ecf3]/60 dark:bg-[#131720]/70 border border-slate-200/70 dark:border-white/10 shadow-clay-card text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
          Ready to distribute without barriers?
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
          Claim your handle and share your first 4-digit access code in less than two minutes.
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
