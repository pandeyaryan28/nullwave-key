import { getAllLeads, updateLead } from './db.ts';

/**
 * Checks public profile pages of contacted creators to verify if passdigit.com has been added to their bio.
 */
export async function crawlCreatorBios(): Promise<{ checked: number; activeDetected: number }> {
  const leads = getAllLeads();
  const eligible = leads.filter(l => l.status === 'dispatched' || l.status === 'claimed');

  if (eligible.length === 0) {
    console.log('[Bio Crawler] No eligible leads to verify.');
    return { checked: 0, activeDetected: 0 };
  }

  let checkedCount = 0;
  let activeDetectedCount = 0;

  for (const lead of eligible) {
    if (!lead.channelOrProfileUrl) continue;
    checkedCount++;

    try {
      console.log(`[Bio Crawler] Checking bio for @${lead.handle} at ${lead.channelOrProfileUrl}...`);
      const res = await fetch(lead.channelOrProfileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) {
        console.warn(`[Bio Crawler] Could not fetch profile for @${lead.handle} (HTTP ${res.status})`);
        continue;
      }

      const html = await res.text();
      const detected =
        html.includes('passdigit.com') ||
        html.includes(`passdigit.com/${lead.handle}`) ||
        html.includes('nullwave.com') ||
        html.includes(`nullwave.com/${lead.handle}`);

      updateLead(lead.handle, {
        bioCheckResult: {
          checkedAt: new Date().toISOString(),
          detected,
          bioUrl: lead.channelOrProfileUrl,
        },
        status: detected ? 'bio_active' : lead.status,
      });

      if (detected) {
        activeDetectedCount++;
        console.log(`🎉 [Bio Crawler] SUCCESS! @${lead.handle} has added PassDigit to their public bio!`);
      }
    } catch (err) {
      console.warn(`[Bio Crawler] Error crawling @${lead.handle}:`, err);
    }
  }

  return { checked: checkedCount, activeDetected: activeDetectedCount };
}
