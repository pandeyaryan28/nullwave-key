export interface UserSocialLinks {
  instagram?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string; // lowercase, alphanumeric + underscore
  photoURL?: string;
  bannerURL?: string;
  headline?: string;
  bio?: string;
  location?: string;
  socialLink?: string; // backwards compatibility e.g. instagram.com/username
  socialLinks?: UserSocialLinks;
  createdAt: number; // unix timestamp ms
  updatedAt: number; // unix timestamp ms
}

export interface UsernameDoc {
  uid: string;
  createdAt: number;
}

export type ResourceStatus = 'active' | 'disabled';

export interface Resource {
  id: string; // Firebase auto-generated doc ID
  creatorId: string; // creator uid
  creatorUsername: string; // for query convenience
  publicSlug: string; // safe public URL slug (e.g. "startup-gtm-guide-8k2p")
  code: string; // 6-digit numeric string, e.g. "482731"
  title: string;
  description: string;
  category?: string;
  fileUrl: string; // Storage URL or data payload
  fileName: string;
  fileSizeBytes: number;
  coverUrl?: string; // Optional cover image URL
  status: ResourceStatus;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  // Aggregate Counters
  totalViews: number;
  uniqueViews: number;
  totalDownloads: number;

  // Advanced Distribution Controls
  allowDownload?: boolean; // defaults to true; if false, view-only in browser
  isPublicListing?: boolean; // defaults to true; if false, unlisted/direct link only
  isPinned?: boolean; // defaults to false; featured at top of station
  expiresAt?: number | null; // optional expiration timestamp ms
  maxUnlocks?: number | null; // optional cap on total unlocks
}

export interface ResourceViewAudit {
  id?: string;
  resourceId: string;
  creatorId: string;
  visitorId: string; // anonymous local UUID
  viewedAt: number;
  isUnique: boolean;
}

export interface ResourceDownloadAudit {
  id?: string;
  resourceId: string;
  creatorId: string;
  visitorId: string;
  downloadedAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
