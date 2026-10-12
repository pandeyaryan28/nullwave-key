import fs from 'node:fs';
import path from 'node:path';

export interface TeardownComparison {
  currentSeconds: number;
  currentSteps: number;
  nullwaveSeconds: number;
  nullwaveSteps: number;
}

export interface OutreachRecord {
  sentAt: string;
  subject: string;
  mode: 'direct_smtp' | 'firestore_trigger' | 'simulated';
}

export interface BioCheckRecord {
  checkedAt: string;
  detected: boolean;
  bioUrl?: string;
}

export interface CreatorLead {
  id: string;
  creatorName: string;
  handle: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'x' | 'other';
  email: string;
  channelOrProfileUrl?: string;
  resourceTitle: string;
  currentLinkUrl: string;
  currentLinkType: 'drive' | 'gumroad' | 'notion' | 'linktree' | 'other';
  status: 'scraped' | 'audited' | 'dispatched' | 'replied' | 'claimed' | 'bio_active' | 'unresponsive';
  teardownGifUrl?: string;
  teardownComparison?: TeardownComparison;
  outreachHistory: OutreachRecord[];
  bioCheckResult?: BioCheckRecord;
  customizedMessage?: {
    subject: string;
    body: string;
    wordCount?: number;
    first_name?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'growth_leads.json');

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getAllLeads(): CreatorLead[] {
  ensureStorage();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as CreatorLead[];
  } catch {
    return [];
  }
}

export function saveAllLeads(leads: CreatorLead[]): void {
  ensureStorage();
  fs.writeFileSync(DB_FILE, JSON.stringify(leads, null, 2), 'utf-8');
}

export function findLeadByHandle(handle: string): CreatorLead | undefined {
  const leads = getAllLeads();
  const normalized = handle.toLowerCase().trim();
  return leads.find(l => l.handle.toLowerCase().trim() === normalized);
}

export function addLead(lead: Omit<CreatorLead, 'id' | 'createdAt' | 'updatedAt' | 'outreachHistory'>): CreatorLead {
  const leads = getAllLeads();
  const existing = findLeadByHandle(lead.handle);
  if (existing) {
    throw new Error(`Lead with handle @${lead.handle} already exists.`);
  }

  const now = new Date().toISOString();
  const newLead: CreatorLead = {
    ...lead,
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    outreachHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  leads.push(newLead);
  saveAllLeads(leads);
  return newLead;
}

export function updateLead(handle: string, patch: Partial<CreatorLead>): CreatorLead {
  const leads = getAllLeads();
  const normalized = handle.toLowerCase().trim();
  const index = leads.findIndex(l => l.handle.toLowerCase().trim() === normalized);

  if (index === -1) {
    throw new Error(`Lead with handle @${handle} not found.`);
  }

  const updated: CreatorLead = {
    ...leads[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  leads[index] = updated;
  saveAllLeads(leads);
  return updated;
}

export function getGrowthKPIs() {
  const leads = getAllLeads();
  return {
    total: leads.length,
    scraped: leads.filter(l => l.status === 'scraped').length,
    audited: leads.filter(l => l.status === 'audited').length,
    dispatched: leads.filter(l => l.status === 'dispatched').length,
    replied: leads.filter(l => l.status === 'replied').length,
    claimed: leads.filter(l => l.status === 'claimed').length,
    bioActive: leads.filter(l => l.status === 'bio_active').length,
  };
}
