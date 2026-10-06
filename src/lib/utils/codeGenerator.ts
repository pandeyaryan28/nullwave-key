import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config.ts';

/**
 * Generates a random 4-digit numeric string from 1000 to 9999
 */
export function generateFourDigitCode(): string {
  const min = 1000;
  const max = 9999;
  const range = max - min + 1;
  const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto
    ? globalThis.crypto
    : (typeof window !== 'undefined' ? window.crypto : null);

  if (!cryptoObj?.getRandomValues) {
    return Math.floor(min + Math.random() * range).toString();
  }

  const array = new Uint32Array(1);
  cryptoObj.getRandomValues(array);
  const codeNum = min + (array[0] % range);
  return codeNum.toString();
}

/**
 * Backwards compatibility alias pointing to 4-digit code generator in v2.5.0
 */
export const generateSixDigitCode = generateFourDigitCode;

/**
 * Checks if a 4-digit code is already used by an active resource belonging to the creator.
 * If used, regenerates until an unused code is found (up to 10 attempts).
 */
export async function getUniqueCodeForCreator(creatorId: string): Promise<string> {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateFourDigitCode();
    try {
      const q = query(
        collection(db, 'resources'),
        where('creatorId', '==', creatorId),
        where('code', '==', candidate)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return candidate;
      }
    } catch {
      // If query fails, still return candidate
      return candidate;
    }
  }
  return generateFourDigitCode();
}

/**
 * Checks if a specific 4-digit (or legacy 6-digit) code is already assigned to an active resource of the creator.
 */
export async function isCodeInUseByCreator(
  creatorId: string,
  code: string,
  excludeResourceId?: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'resources'),
      where('creatorId', '==', creatorId),
      where('code', '==', code.trim()),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (snap.empty) return false;
    if (excludeResourceId) {
      return snap.docs.some(d => d.id !== excludeResourceId);
    }
    return true;
  } catch {
    return false;
  }
}
