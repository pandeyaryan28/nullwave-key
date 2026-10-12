import fs from 'node:fs';
import path from 'node:path';
import { getAllLeads, getGrowthKPIs, addLead, findLeadByHandle } from './db.ts';
import { auditPendingLeads } from './teardown.ts';
import { dispatchOutreach } from './outreach.ts';
import { crawlCreatorBios } from './bioCrawler.ts';
import { harvestFromYouTube } from './harvest.ts';

// Load .env.growth if present
function loadGrowthEnv() {
  const envPath = path.resolve(process.cwd(), '.env.growth');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

loadGrowthEnv();

const args = process.argv.slice(2);
const command = args[0] || 'status';

async function main() {
  console.log('====================================================');
  console.log('         NULLWAVE AUTONOMOUS GROWTH ENGINE          ');
  console.log('====================================================\n');

  switch (command) {
    case 'status': {
      const kpis = getGrowthKPIs();
      const leads = getAllLeads();
      console.log('📊 Current Pipeline KPIs:');
      console.log(`- Total Ingested Leads : ${kpis.total}`);
      console.log(`- Scraped (Pending)   : ${kpis.scraped}`);
      console.log(`- Audited (Ready)     : ${kpis.audited}`);
      console.log(`- Dispatched (Sent)   : ${kpis.dispatched}`);
      console.log(`- Replied             : ${kpis.replied}`);
      console.log(`- Claimed Profiles    : ${kpis.claimed}`);
      console.log(`- Active Bio Links    : ${kpis.bioActive}\n`);

      if (leads.length > 0) {
        console.log('📋 Recent 5 Leads:');
        for (const lead of leads.slice(-5)) {
          console.log(`  [@${lead.handle}] ${lead.creatorName} | Status: ${lead.status} | Resource: "${lead.resourceTitle.slice(0, 30)}"`);
        }
      } else {
        console.log('No leads in database yet. Run `npm run growth:seed` to add test leads.');
      }
      break;
    }

    case 'seed': {
      console.log('🌱 Seeding initial high-intent creator cohort...');
      const sampleCreators = [
        {
          creatorName: 'Alex Rivers',
          handle: 'alexrivers',
          platform: 'youtube' as const,
          email: 'alex.rivers.tech@example.com',
          channelOrProfileUrl: 'https://youtube.com/@alexrivers_tech',
          resourceTitle: 'Full-Stack Developer 2026 Roadmap',
          currentLinkUrl: 'https://drive.google.com/file/d/1sample/view',
          currentLinkType: 'drive' as const,
          status: 'scraped' as const,
          notes: 'High engagement tech tutor, 24k subscribers, drive link in video description.',
        },
        {
          creatorName: 'Elena Rostova',
          handle: 'elenafit',
          platform: 'instagram' as const,
          email: 'inquiries@elenafit.example.com',
          channelOrProfileUrl: 'https://instagram.com/elenafit',
          resourceTitle: '12-Week Hypertrophy Training Split',
          currentLinkUrl: 'https://gumroad.com/l/hypertrophy-split',
          currentLinkType: 'gumroad' as const,
          status: 'scraped' as const,
          notes: 'Fitness creator, 45k followers, $0 Gumroad link in bio.',
        },
        {
          creatorName: 'Marcus Vance',
          handle: 'marcusbuilds',
          platform: 'x' as const,
          email: 'marcus@vancegrowth.example.com',
          channelOrProfileUrl: 'https://x.com/marcusbuilds',
          resourceTitle: 'Cold Outreach Mastery Checklist',
          currentLinkUrl: 'https://linktr.ee/marcusbuilds',
          currentLinkType: 'linktree' as const,
          status: 'scraped' as const,
          notes: 'Solopreneur creator, 18k followers, 12 buttons on linktree.',
        },
      ];

      for (const creator of sampleCreators) {
        if (!findLeadByHandle(creator.handle)) {
          addLead(creator);
          console.log(`✔ Added lead @${creator.handle} (${creator.creatorName})`);
        } else {
          console.log(`- Skipped @${creator.handle} (already exists)`);
        }
      }
      console.log('\nRun `npm run growth:audit` to generate speed teardowns for these leads.');
      break;
    }

    case 'audit': {
      console.log('🔍 Benchmarking link friction and generating teardowns...');
      const res = auditPendingLeads();
      console.log(`✔ Audited ${res.audited} pending lead(s). They are now ready for dispatch!`);
      break;
    }

    case 'dispatch': {
      const isDryRun = args.includes('--dry-run') || !process.env.SMTP_HOST;
      if (isDryRun && !args.includes('--dry-run')) {
        console.log('ℹ No SMTP_HOST found in .env.growth. Running in safe DRY-RUN simulation mode.');
      }

      console.log(`🚀 Dispatching outbound sequence (Dry Run: ${isDryRun})...`);
      const res = await dispatchOutreach({
        smtpHost: process.env.SMTP_HOST,
        smtpPort: Number(process.env.SMTP_PORT) || 587,
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
        fromEmail: process.env.OUTREACH_FROM_EMAIL || process.env.SMTP_USER,
        fromName: process.env.OUTREACH_FROM_NAME || 'Aryan from PassDigit',
        dryRun: isDryRun,
        delayMs: 1000,
      });

      console.log(`✔ Dispatch complete. Sent: ${res.sent}, Skipped: ${res.skipped}`);
      break;
    }

    case 'crawl': {
      console.log('🌐 Crawling creator profile links to check for passdigit.com in bios...');
      const res = await crawlCreatorBios();
      console.log(`✔ Crawl complete. Checked: ${res.checked}, Active Bios Detected: ${res.activeDetected}`);
      break;
    }

    case 'harvest': {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        console.log('⚠️ YOUTUBE_API_KEY not found in .env.growth. To harvest from YouTube, provide an API key.');
        console.log('You can also seed mock leads using `npm run growth:seed` or import Apollo CSVs.');
        return;
      }
      const query = args[1] || 'free coding roadmap drive.google.com';
      console.log(`🔍 Harvesting YouTube for: "${query}"...`);
      const added = await harvestFromYouTube(apiKey, query, 5);
      console.log(`✔ Harvested ${added.length} new leads from YouTube.`);
      break;
    }

    case 'export': {
      console.log('📄 Exporting leads to CSV (data/growth_leads.csv)...');
      const leads = getAllLeads();
      if (leads.length === 0) {
        console.log('No leads to export.');
        break;
      }
      const csvHeaders = ['Handle', 'Creator Name', 'Platform', 'Email', 'Resource Title', 'Status', 'Current Link', 'Claim URL'];
      const rows = leads.map(l => [
        `"${l.handle}"`,
        `"${l.creatorName.replace(/"/g, '""')}"`,
        `"${l.platform}"`,
        `"${l.email}"`,
        `"${l.resourceTitle.replace(/"/g, '""')}"`,
        `"${l.status}"`,
        `"${l.currentLinkUrl}"`,
        `"https://passdigit.com/signup?handle=${l.handle}"`
      ]);
      const csvContent = [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');
      const csvPath = path.resolve(process.cwd(), 'data', 'growth_leads.csv');
      fs.writeFileSync(csvPath, csvContent, 'utf-8');
      console.log(`✔ Successfully exported ${leads.length} leads to: data/growth_leads.csv`);
      break;
    }

    case 'sync': {
      console.log('🔄 Syncing leads with live Google Sheet...');
      const leads = getAllLeads();
      const csvHeaders = ['Handle', 'Creator Name', 'Platform', 'Email', 'Resource Title', 'Status', 'Current Link', 'Claim URL'];
      const rows = leads.map(l => [
        `"${l.handle}"`,
        `"${l.creatorName.replace(/"/g, '""')}"`,
        `"${l.platform}"`,
        `"${l.email}"`,
        `"${l.resourceTitle.replace(/"/g, '""')}"`,
        `"${l.status}"`,
        `"${l.currentLinkUrl}"`,
        `"https://passdigit.com/signup?handle=${l.handle}"`
      ]);
      const csvContent = [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');
      const csvPath = path.resolve(process.cwd(), 'data', 'growth_leads.csv');
      fs.writeFileSync(csvPath, csvContent, 'utf-8');

      const sheetId = process.env.GOOGLE_SHEET_ID || '10wfweIKZDr_Te9xZEk6VXEEPW69WdbesrzNafVdGT8s';
      try {
        const { execSync } = await import('node:child_process');
        execSync(`gsheets mutate import-csv ${sheetId} ${csvPath}`, { stdio: 'inherit' });
        execSync(`gsheets mutate format ${sheetId} --sheet-id 0 --start-row 0 --end-row 1 --start-col 0 --end-col 8 --bold --align CENTER --bg-color "#0F172A" --fg-color "#FFFFFF"`, { stdio: 'ignore' });
        console.log(`✔ Successfully synced ${leads.length} leads to Google Sheet: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
      } catch (e) {
        console.warn('Could not sync to Google Sheet:', e);
      }
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands: status, seed, audit, dispatch [--dry-run], crawl, harvest, export, sync');
  }
}

main().catch(err => {
  console.error('Error executing growth runner:', err);
  process.exit(1);
});
