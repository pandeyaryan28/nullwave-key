import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Resource, SavedResource, UserProfile } from '../../types';

const LOCAL_SAVED_PREFIX = 'nullwave_saved_resources_';
const LEGACY_SAVED_PREFIX = 'unlockr_saved_resources_';

/**
 * Saves a resource into the user's personal saved library subcollection
 * (/users/{userId}/saved_resources/{resourceId}) with localStorage sync.
 */
export async function saveResource(
  userId: string,
  resource: Resource,
  creator: UserProfile | { username: string; displayName?: string }
): Promise<void> {
  if (!userId || !resource?.id) {
    throw new Error('Valid userId and resource are required.');
  }

  const savedItem: SavedResource = {
    id: resource.id,
    resourceId: resource.id,
    title: resource.title,
    description: resource.description || '',
    fileName: resource.fileName,
    fileSizeBytes: resource.fileSizeBytes,
    fileUrl: resource.fileUrl,
    coverUrl: resource.coverUrl,
    code: resource.code,
    creatorId: resource.creatorId,
    creatorUsername: creator.username || resource.creatorUsername,
    creatorDisplayName:
      ('displayName' in creator && creator.displayName) ||
      creator.username ||
      resource.creatorUsername,
    category: resource.category,
    savedAt: Date.now(),
  };

  // 1. Save to local storage first for instant feedback & offline capability
  try {
    const key = `${LOCAL_SAVED_PREFIX}${userId}`;
    const legacyKey = `${LEGACY_SAVED_PREFIX}${userId}`;
    const localSaved = JSON.parse(
      localStorage.getItem(key) || localStorage.getItem(legacyKey) || '[]'
    ) as SavedResource[];

    const filtered = localSaved.filter(item => item.resourceId !== resource.id);
    const updated = [savedItem, ...filtered];
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.setItem(legacyKey, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not cache saved resource in localStorage:', err);
  }

  // 2. Persist to Firestore subcollection
  try {
    const docRef = doc(db, 'users', userId, 'saved_resources', resource.id);
    const payload = Object.fromEntries(
      Object.entries(savedItem).filter(([_, v]) => v !== undefined)
    );
    await setDoc(docRef, payload);
  } catch (err) {
    console.warn('Firestore saved_resources write warning (retained in localStorage):', err);
  }
}

/**
 * Removes a resource from the user's saved library.
 */
export async function removeSavedResource(
  userId: string,
  resourceId: string
): Promise<void> {
  if (!userId || !resourceId) return;

  // 1. Remove from local storage
  try {
    const key = `${LOCAL_SAVED_PREFIX}${userId}`;
    const legacyKey = `${LEGACY_SAVED_PREFIX}${userId}`;
    const localSaved = JSON.parse(
      localStorage.getItem(key) || localStorage.getItem(legacyKey) || '[]'
    ) as SavedResource[];

    const updated = localSaved.filter(item => item.resourceId !== resourceId);
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.setItem(legacyKey, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not update localStorage on removeSavedResource:', err);
  }

  // 2. Delete from Firestore
  try {
    const docRef = doc(db, 'users', userId, 'saved_resources', resourceId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore saved_resources delete warning:', err);
  }
}

/**
 * Retrieves all saved resources for a user, sorted by newest saved date.
 */
export async function getSavedResources(userId: string): Promise<SavedResource[]> {
  if (!userId) return [];

  // Try Firestore first
  try {
    const collRef = collection(db, 'users', userId, 'saved_resources');
    const q = query(collRef, orderBy('savedAt', 'desc'));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedResource));
      // Sync to localStorage
      try {
        const key = `${LOCAL_SAVED_PREFIX}${userId}`;
        localStorage.setItem(key, JSON.stringify(list));
      } catch {}
      return list;
    }
  } catch (err) {
    console.warn('Could not query Firestore saved_resources, attempting fallback:', err);
    try {
      const fallbackCollRef = collection(db, 'users', userId, 'saved_resources');
      const snap = await getDocs(fallbackCollRef);
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedResource));
        list.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        return list;
      }
    } catch {}
  }

  // Fallback to localStorage
  try {
    const key = `${LOCAL_SAVED_PREFIX}${userId}`;
    const legacyKey = `${LEGACY_SAVED_PREFIX}${userId}`;
    const localSaved = JSON.parse(
      localStorage.getItem(key) || localStorage.getItem(legacyKey) || '[]'
    ) as SavedResource[];
    return localSaved;
  } catch {
    return [];
  }
}

/**
 * Checks whether a specific resource is saved in the user's library.
 */
export async function isResourceSaved(
  userId: string,
  resourceId: string
): Promise<boolean> {
  if (!userId || !resourceId) return false;

  // Check local cache first for instant responsiveness
  try {
    const key = `${LOCAL_SAVED_PREFIX}${userId}`;
    const legacyKey = `${LEGACY_SAVED_PREFIX}${userId}`;
    const localSaved = JSON.parse(
      localStorage.getItem(key) || localStorage.getItem(legacyKey) || '[]'
    ) as SavedResource[];
    if (localSaved.some(item => item.resourceId === resourceId)) {
      return true;
    }
  } catch {}

  // Check Firestore
  try {
    const docRef = doc(db, 'users', userId, 'saved_resources', resourceId);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch {
    return false;
  }
}
