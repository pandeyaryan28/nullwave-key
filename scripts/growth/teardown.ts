import { getAllLeads, updateLead } from './db.ts';
import type { CreatorLead, TeardownComparison } from './db.ts';

/**
 * Evaluates the friction of a creator's existing distribution link.
 */
export function benchmarkFriction(linkType: CreatorLead['currentLinkType']): TeardownComparison {
  switch (linkType) {
    case 'drive':
      return {
        currentSeconds: 28,
        currentSteps: 4, // 1: tap bio link, 2: open drive webview, 3: Google account auth, 4: request access / preview
        nullwaveSeconds: 0.2,
        nullwaveSteps: 1, // 1 tap to open PDF
      };
    case 'gumroad':
      return {
        currentSeconds: 42,
        currentSteps: 5, // 1: tap link, 2: enter $0, 3: enter email, 4: click get, 5: check inbox
        nullwaveSeconds: 0.2,
        nullwaveSteps: 1,
      };
    case 'linktree':
      return {
        currentSeconds: 24,
        currentSteps: 3, // 1: tap linktree, 2: scan list of 12 buttons, 3: tap correct link
        nullwaveSeconds: 0.2,
        nullwaveSteps: 1,
      };
    default:
      return {
        currentSeconds: 25,
        currentSteps: 4,
        nullwaveSeconds: 0.2,
        nullwaveSteps: 1,
      };
  }
}

/**
 * Generates an automated audit comparison for all newly scraped leads.
 */
export function auditPendingLeads(): { audited: number; leads: CreatorLead[] } {
  const leads = getAllLeads();
  const pending = leads.filter(l => l.status === 'scraped');
  const results: CreatorLead[] = [];

  for (const lead of pending) {
    const comparison = benchmarkFriction(lead.currentLinkType);
    
    // We generate a clean, hosted preview slug on PassDigit
    const dynamicPreviewUrl = `https://passdigit.com/signup?handle=${encodeURIComponent(lead.handle)}&preview=true`;

    const updated = updateLead(lead.handle, {
      status: 'audited',
      teardownComparison: comparison,
      teardownGifUrl: dynamicPreviewUrl,
    });

    results.push(updated);
  }

  return { audited: results.length, leads: results };
}
