import fs from 'node:fs';
import path from 'node:path';
import { addLead, getAllLeads, findLeadByHandle } from './db.ts';
import type { CreatorLead } from './db.ts';

interface YouTubeSearchItem {
  id: { videoId?: string; channelId?: string };
  snippet: {
    channelId: string;
    channelTitle: string;
    title: string;
    description: string;
  };
}

/**
 * Harvest leads via free YouTube Data API v3 (10,000 units/day free on GCP).
 */
export async function harvestFromYouTube(apiKey: string, query: string, maxResults = 10): Promise<CreatorLead[]> {
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is required for YouTube harvesting.');
  }

  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodedQuery}&maxResults=${maxResults}&key=${apiKey}`;

  console.log(`[Growth Harvester] Querying YouTube Data API: "${query}"...`);
  const res = await fetch(searchUrl);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`YouTube API returned ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as { items?: YouTubeSearchItem[] };
  const items = data.items || [];
  const added: CreatorLead[] = [];

  for (const item of items) {
    const desc = item.snippet.description || '';
    const title = item.snippet.title || '';
    const channelName = item.snippet.channelTitle || '';

    // Check for drive, gumroad, or freebies
    const driveMatch = desc.match(/https?:\/\/(?:drive\.google\.com|gumroad\.com\/l\/|notion\.site)\/[^\s]+/i);
    const emailMatch = desc.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

    const detectedLink = driveMatch ? driveMatch[0] : '';
    const detectedEmail = emailMatch ? emailMatch[1] : '';

    if (!detectedLink) {
      continue; // Skip if no resource link found
    }

    const cleanHandle = channelName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);

    if (cleanHandle.length < 3 || findLeadByHandle(cleanHandle)) {
      continue;
    }

    let linkType: CreatorLead['currentLinkType'] = 'other';
    if (detectedLink.includes('drive.google.com')) linkType = 'drive';
    else if (detectedLink.includes('gumroad.com')) linkType = 'gumroad';
    else if (detectedLink.includes('notion.site')) linkType = 'notion';

    const newLead = addLead({
      creatorName: channelName,
      handle: cleanHandle,
      platform: 'youtube',
      email: detectedEmail || `inquiry@${cleanHandle}.social`,
      channelOrProfileUrl: `https://youtube.com/channel/${item.snippet.channelId}`,
      resourceTitle: title.slice(0, 50),
      currentLinkUrl: detectedLink,
      currentLinkType: linkType,
      status: 'scraped',
      notes: `Harvested from video: ${title}`,
    });

    added.push(newLead);
  }

  return added;
}

/**
 * Import free leads exported from Apollo.io CSV (10,000 free credits/mo).
 */
export function importFromApolloCSV(filePath: string): CreatorLead[] {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`CSV file not found at: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const firstNameIdx = headers.findIndex(h => h.includes('first name'));
  const lastNameIdx = headers.findIndex(h => h.includes('last name'));
  const emailIdx = headers.findIndex(h => h === 'email');
  const titleIdx = headers.findIndex(h => h.includes('title'));
  const companyIdx = headers.findIndex(h => h.includes('company'));

  const added: CreatorLead[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const email = row[emailIdx] || '';
    if (!email || !email.includes('@')) continue;

    const firstName = row[firstNameIdx] || 'Creator';
    const lastName = row[lastNameIdx] || '';
    const creatorName = `${firstName} ${lastName}`.trim();
    const cleanHandle = firstName.toLowerCase().replace(/[^a-z0-9_]/g, '') + Math.floor(10 + Math.random() * 89);

    if (findLeadByHandle(cleanHandle)) continue;

    const lead = addLead({
      creatorName,
      handle: cleanHandle,
      platform: 'x',
      email,
      resourceTitle: `${firstName}'s Starter Playbook`,
      currentLinkUrl: 'https://drive.google.com/sample',
      currentLinkType: 'drive',
      status: 'scraped',
      notes: `Imported via Apollo free lead export. Title: ${row[titleIdx] || 'Content Creator'}`,
    });

    added.push(lead);
  }

  return added;
}
