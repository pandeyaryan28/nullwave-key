import React, { useState } from 'react';
import { Resource } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { X, Copy, Check, ExternalLink, Share2, Key } from 'lucide-react';

export interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  username: string;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  resource,
  username,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !resource) return null;

  const origin = window.location.origin;
  const canonicalUrl = `${origin}/${username}/${resource.code}`;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const templates = [
    {
      key: 'direct',
      label: 'Direct Access Link',
      description: 'Canonical share link for direct browser access',
      content: canonicalUrl,
    },
    {
      key: 'instagram',
      label: 'Instagram & TikTok Caption',
      description: 'Optimized for bio link & video comments',
      content: `Want my "${resource.title}"? 🔗 Link in bio, enter access code ${resource.code} to read and download instantly!`,
    },
    {
      key: 'youtube',
      label: 'YouTube Description',
      description: 'Formatted for video description boxes and pinned comments',
      content: `📄 Download "${resource.title}":\nLink: ${canonicalUrl}\nAccess Code: ${resource.code}`,
    },
    {
      key: 'x',
      label: 'X (Twitter) Post',
      description: 'Concise announcement format',
      content: `Just published "${resource.title}". Instant access with code ${resource.code}: ${canonicalUrl}`,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        variant="elevated"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-clay-card border-slate-200/90 dark:border-white/15"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center shadow-clay-sm">
                <Share2 className="w-4 h-4" />
              </div>
              <h2 id="share-modal-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                Share Kit & Social Captions
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Ready-to-post caption templates for distributing your guide across audience channels.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Resource Overview */}
        <div className="p-4 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] border border-slate-200/60 dark:border-white/5 shadow-clay-inset flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {resource.title}
              </span>
              <Badge variant={resource.status === 'active' ? 'success' : 'neutral'} className="text-[10px]">
                {resource.status}
              </Badge>
              {resource.password && (
                <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                  <Key className="w-2.5 h-2.5" />
                  <span>Password Protected</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              Access Code: <strong className="text-neutral-800 dark:text-neutral-200">{resource.code}</strong>
            </p>
          </div>

          <a
            href={canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 px-3 py-1.5 rounded-md border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 shadow-clay-sm"
          >
            <span>Preview</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Caption Templates */}
        <div className="space-y-4">
          {templates.map(tpl => {
            const isCopied = copiedKey === tpl.key;
            return (
              <div
                key={tpl.key}
                className="p-4 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {tpl.label}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {tpl.description}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={isCopied ? 'secondary' : 'outline'}
                    onClick={() => copyToClipboard(tpl.key, tpl.content)}
                    className="text-xs h-7 px-2.5 shrink-0"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>

                <div className="p-2.5 rounded-lg bg-[#e7ecf3]/70 dark:bg-[#131720]/80 border border-slate-200/60 dark:border-white/5 shadow-clay-inset font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap select-all">
                  {tpl.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
};
