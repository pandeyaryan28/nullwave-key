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
  accountType?: 'creator' | 'viewer'; // account role distinction
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
  code: string; // 4-digit numeric string (e.g. "4827"), also supports legacy 6-digit codes
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
  allowSave?: boolean; // defaults to true; permits visitors to save to viewer library
  isPublicListing?: boolean; // defaults to true; if false, unlisted/direct link only
  isPinned?: boolean; // defaults to false; featured at top of profile
  expiresAt?: number | null; // optional expiration timestamp ms
  maxUnlocks?: number | null; // optional cap on total unlocks
  password?: string | null; // optional password protection for sensitive or exclusive documents
}

export interface SavedResource {
  id: string; // resource ID
  resourceId: string;
  title: string;
  description?: string;
  fileName: string;
  fileSizeBytes: number;
  fileUrl: string;
  coverUrl?: string;
  code: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName?: string;
  category?: string;
  savedAt: number;
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
