import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config.ts';

/**
 * Generates a random 6-digit numeric string from 100000 to 999999
 */
export function generateSixDigitCode(): string {
  const min = 100000;
  const max = 999999;
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
 * Checks if a 6-digit code is already used by an active resource belonging to the creator.
 * If used, regenerates until an unused code is found (up to 10 attempts).
 */
export async function getUniqueCodeForCreator(creatorId: string): Promise<string> {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateSixDigitCode();
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
  return generateSixDigitCode();
}
