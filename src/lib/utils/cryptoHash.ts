/**
 * NullWave Cryptographic Hashing Utilities
 *
 * Provides native Web Crypto API SHA-256 password hashing and verification
 * for protected documents. Maintains backward compatibility with legacy
 * plaintext passwords while securing new and updated resources.
 */

/**
 * Computes a SHA-256 hash of a plaintext password using the native Web Crypto API.
 * Returns a 64-character lowercase hex string.
 */
export async function hashPasswordSHA256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a candidate password against a stored value.
 * Supports:
 * 1. 64-character hex strings (SHA-256 hashes) - computes candidate hash and compares.
 * 2. Legacy plaintext values - direct equality comparison.
 *
 * Returns false if storedHashOrPlain is empty, null, or undefined.
 */
export async function verifyPassword(
  input: string,
  storedHashOrPlain?: string | null
): Promise<boolean> {
  if (!input || !storedHashOrPlain) {
    return false;
  }

  // Check if stored value is a 64-character hexadecimal SHA-256 hash
  const isSha256Hex = /^[0-9a-f]{64}$/i.test(storedHashOrPlain);

  if (isSha256Hex) {
    const inputHash = await hashPasswordSHA256(input);
    if (inputHash.toLowerCase() === storedHashOrPlain.toLowerCase()) {
      return true;
    }
    // Also test trimmed candidate input in case of mobile keyboard trailing whitespace
    if (input.trim() !== input && input.trim().length > 0) {
      const trimmedHash = await hashPasswordSHA256(input.trim());
      if (trimmedHash.toLowerCase() === storedHashOrPlain.toLowerCase()) {
        return true;
      }
    }
    // Fallback: In the improbable event a legacy plaintext password was a 64-char hex string
    return input === storedHashOrPlain || (input.trim().length > 0 && input.trim() === storedHashOrPlain);
  }

  // Legacy plaintext backwards-compatibility comparison
  return input === storedHashOrPlain || (input.trim().length > 0 && input.trim() === storedHashOrPlain);
}
