import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Generates a random 6-digit numeric string from 100000 to 999999
 */
export function generateSixDigitCode(): string {
  const min = 100000;
  const max = 999999;
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  const codeNum = min + (array[0] % (max - min + 1));
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
