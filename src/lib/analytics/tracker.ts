import {
  doc,
  updateDoc,
  increment,
  addDoc,
  collection,
} from 'firebase/firestore';
import { db } from '../firebase/config.ts';

const VISITOR_ID_KEY = 'unlockr_visitor_id';
const VIEW_HISTORY_PREFIX = 'unlockr_viewed_';
const UNIQUENESS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24-hour uniqueness window

/**
 * Retrieves or initializes an anonymous, privacy-preserving visitor identifier.
 * Stored purely in browser localStorage without any PII.
 */
export function getOrCreateVisitorId(): string {
  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return 'v_' + Math.random().toString(36).substring(2, 12);
  }
}

export interface UniquenessResult {
  isUnique: boolean;
  now: number;
  commit: () => void;
  rollback: () => void;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

/**
 * Evaluates whether a view by this visitor on this resource is considered unique.
 * Rule:
 * - If never viewed before: Unique = true.
 * - If last viewed within 24 hours: Unique = false (repeat view).
 * - If last viewed > 24 hours ago: Unique = true (new measurement window).
 */
export function evaluateUniquenessWindow(
  resourceId: string,
  currentTime?: number,
  storageOverride?: StorageLike
): UniquenessResult {
  const now = currentTime ?? Date.now();
  const storage: StorageLike | null = storageOverride ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  const storageKey = `${VIEW_HISTORY_PREFIX}${resourceId}`;

  let lastViewedStr: string | null = null;
  try {
    lastViewedStr = storage ? storage.getItem(storageKey) : null;
  } catch {}

  const previousTimestamp = lastViewedStr;

  if (!lastViewedStr) {
    return {
      isUnique: true,
      now,
      commit: () => {
        try { storage?.setItem(storageKey, now.toString()); } catch {}
      },
      rollback: () => {
        try { storage?.removeItem?.(storageKey); } catch {}
      },
    };
  }

  const lastViewed = parseInt(lastViewedStr, 10);
  if (isNaN(lastViewed) || now - lastViewed >= UNIQUENESS_WINDOW_MS) {
    return {
      isUnique: true,
      now,
      commit: () => {
        try { storage?.setItem(storageKey, now.toString()); } catch {}
      },
      rollback: () => {
        try {
          if (previousTimestamp) storage?.setItem(storageKey, previousTimestamp);
          else storage?.removeItem?.(storageKey);
        } catch {}
      },
    };
  }

  return {
    isUnique: false,
    now,
    commit: () => {},
    rollback: () => {},
  };
}

/**
 * Tracks a resource page view.
 * Atomically increments totalViews, and conditionally increments uniqueViews if within a new 24h window.
 * Also logs an audit record in `resource_views` collection.
 */
export async function trackResourceView(
  resourceId: string,
  creatorId: string
): Promise<{ totalViewsIncremented: boolean; uniqueViewsIncremented: boolean }> {
  const visitorId = getOrCreateVisitorId();
  const { isUnique, now, commit, rollback } = evaluateUniquenessWindow(resourceId);

  try {
    const resourceRef = doc(db, 'resources', resourceId);

    // Atomically increment aggregate counters
    const updates: Record<string, unknown> = {
      totalViews: increment(1),
      lastAccessedAt: now,
    };

    if (isUnique) {
      updates.uniqueViews = increment(1);
    }

    await updateDoc(resourceRef, updates);
    // Successfully written to Firestore; commit the local uniqueness timestamp
    commit();

    // Write audit log (non-blocking)
    addDoc(collection(db, 'resource_views'), {
      resourceId,
      creatorId,
      visitorId,
      viewedAt: now,
      isUnique,
    }).catch(err => console.warn('Could not record view audit log:', err));

    return { totalViewsIncremented: true, uniqueViewsIncremented: isUnique };
  } catch (error) {
    rollback();
    console.error('Failed to track resource view in Firestore:', error);
    return { totalViewsIncremented: false, uniqueViewsIncremented: false };
  }
}

/**
 * Tracks a resource download event.
 * Atomically increments totalDownloads and logs an audit record in `resource_downloads`.
 */
export async function trackResourceDownload(
  resourceId: string,
  creatorId: string
): Promise<boolean> {
  const visitorId = getOrCreateVisitorId();
  const now = Date.now();

  try {
    const resourceRef = doc(db, 'resources', resourceId);

    await updateDoc(resourceRef, {
      totalDownloads: increment(1),
      lastAccessedAt: now,
    });

    // Write audit log (non-blocking)
    addDoc(collection(db, 'resource_downloads'), {
      resourceId,
      creatorId,
      visitorId,
      downloadedAt: now,
    }).catch(err => console.warn('Could not record download audit log:', err));

    return true;
  } catch (error) {
    console.error('Failed to track resource download in Firestore:', error);
    return false;
  }
}
