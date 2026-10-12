import nodemailer from 'nodemailer';
import { getAllLeads, updateLead } from './db.ts';
import type { CreatorLead } from './db.ts';

export interface OutreachConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail?: string;
  fromName?: string;
  delayMs?: number;
  dryRun?: boolean;
}

export function generateOutreachContent(lead: CreatorLead): { subject: string; text: string; html: string } {
  const claimUrl = `https://passdigit.com/signup?handle=${encodeURIComponent(lead.handle)}`;
  
  if (lead.customizedMessage) {
    const subject = lead.customizedMessage.subject;
    const text = lead.customizedMessage.body;
    
    // Generate clean, readable HTML email from text paragraphs
    const paragraphs = text
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 580px; line-height: 1.6; font-size: 15px;">
  ${paragraphs}
</div>`;

    return { subject, text, html };
  }

  const comp = lead.teardownComparison || { currentSeconds: 30, currentSteps: 4, nullwaveSeconds: 0.2, nullwaveSteps: 1 };
  const platformName = lead.currentLinkType === 'drive' ? 'Google Drive' : lead.currentLinkType === 'gumroad' ? 'Gumroad' : 'your link-in-bio';
  const frictionDesc = lead.currentLinkType === 'drive' 
    ? 'forces mobile viewers to log in to Google or request access permissions'
    : lead.currentLinkType === 'gumroad'
    ? 'forces mobile viewers through a 4-step e-commerce billing form just to receive a free PDF'
    : 'drops viewers into multiple friction steps';

  const firstName = lead.creatorName.split(' ')[0] || 'there';
  const subject = `quick test on your ${lead.resourceTitle.slice(0, 30)} link`;

  const text = `Hey ${firstName},

I tested your public bio link on mobile to grab your "${lead.resourceTitle}".

Because it routes through ${platformName}, it ${frictionDesc} (${comp.currentSteps} steps, ~${comp.currentSeconds}s). On mobile in-app browsers, that typically causes a 60–70% drop-off before anyone reads the guide.

I benchmarked how your guide opens on PassDigit:
- Current Link: ${comp.currentSteps} steps, ~${comp.currentSeconds}s to open
- PassDigit 4-Digit Code: 1 tap, 0.2s instant in-browser render

Your handle passdigit.com/${lead.handle} is reserved for you to claim here:
${claimUrl}

Zero signup walls or passwords for your viewers, and it's 100% free forever for up to 10 active guides.

Best,
Aryan
Growth Lead, PassDigit`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 580px; line-height: 1.6; font-size: 15px;">
  <p>Hey ${firstName},</p>
  <p>I tested your public bio link on mobile to grab your <strong>"${lead.resourceTitle}"</strong>.</p>
  <p>Because it routes through ${platformName}, it ${frictionDesc} (<strong>${comp.currentSteps} steps, ~${comp.currentSeconds}s</strong>). On mobile in-app browsers, that typically causes a 60–70% bounce before anyone actually reads your work.</p>
  
  <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a;">Mobile Speed Benchmark:</p>
    <ul style="margin: 0; padding-left: 20px; color: #475569;">
      <li><strong>Current Link:</strong> ${comp.currentSteps} steps, ~${comp.currentSeconds}s to open</li>
      <li><strong>PassDigit 4-Digit Code:</strong> 1 tap, 0.2s instant in-browser render</li>
    </ul>
  </div>

  <p>Your handle <strong>passdigit.com/${lead.handle}</strong> is reserved for you to claim here:</p>
  <p><a href="${claimUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Claim @${lead.handle} on PassDigit</a></p>

  <p style="font-size: 13px; color: #64748b;">Zero signup walls or passwords for your audience, and 100% free forever for up to 10 active guides.</p>
  <p style="margin-top: 24px;">Best,<br>Aryan<br><span style="font-size: 12px; color: #64748b;">Growth Lead, PassDigit</span></p>
</div>`;

  return { subject, text, html };
}

/**
 * Dispatches outreach to audited leads.
 */
export async function dispatchOutreach(config: OutreachConfig): Promise<{ sent: number; skipped: number }> {
  const leads = getAllLeads();
  const eligible = leads.filter(l => l.status === 'audited');

  if (eligible.length === 0) {
    console.log('[Growth Outbound] No audited leads ready for dispatch.');
    return { sent: 0, skipped: 0 };
  }

  const transporter = !config.dryRun && config.smtpHost ? nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort || 587,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  }) : null;

  let sentCount = 0;
  let skippedCount = 0;

  for (const lead of eligible) {
    const { subject, text, html } = generateOutreachContent(lead);

    if (config.dryRun) {
      console.log(`\n--- [DRY RUN] Would send to: ${lead.email} (@${lead.handle}) ---`);
      console.log(`Subject: ${subject}`);
      console.log(`Preview: ${text.slice(0, 150)}...\n`);
      
      updateLead(lead.handle, {
        status: 'dispatched',
        outreachHistory: [
          ...lead.outreachHistory,
          {
            sentAt: new Date().toISOString(),
            subject,
            mode: 'simulated',
          },
        ],
      });
      sentCount++;
      continue;
    }

    if (!transporter) {
      console.warn(`[Growth Outbound] Skipping @${lead.handle} - SMTP not configured.`);
      skippedCount++;
      continue;
    }

    try {
      console.log(`[Growth Outbound] Dispatching to ${lead.email} (@${lead.handle})...`);
      await transporter.sendMail({
        from: `"${config.fromName || 'PassDigit Growth'}" <${config.fromEmail || config.smtpUser}>`,
        to: lead.email,
        subject,
        text,
        html,
      });

      updateLead(lead.handle, {
        status: 'dispatched',
        outreachHistory: [
          ...lead.outreachHistory,
          {
            sentAt: new Date().toISOString(),
            subject,
            mode: 'direct_smtp',
          },
        ],
      });

      sentCount++;

      // Stagger delay between emails to protect sender reputation
      const delay = config.delayMs || 3000;
      if (delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (err) {
      console.error(`[Growth Outbound] Failed to dispatch to @${lead.handle}:`, err);
      skippedCount++;
    }
  }

  return { sent: sentCount, skipped: skippedCount };
}
