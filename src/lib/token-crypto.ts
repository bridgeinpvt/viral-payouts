/**
 * AES-256-GCM encryption for OAuth tokens stored in the database.
 * Requires TOKEN_ENCRYPTION_KEY env var: 64 hex chars (32 bytes).
 *
 * Generate a key:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts a plaintext token string.
 * Returns a base64 string: iv(12) + tag(16) + ciphertext, all concatenated.
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Layout: [iv (12)] [tag (16)] [ciphertext]
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a token encrypted by encryptToken().
 * Returns the original plaintext, or null on failure (bad key / tampered data).
 */
export function decryptToken(encoded: string): string | null {
  try {
    const key = getKey();
    const buf = Buffer.from(encoded, 'base64');

    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      iv
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);

    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch {
    return null;
  }
}

/**
 * Returns true if the value looks like an encrypted blob (base64, not a raw Meta token).
 * Meta tokens start with "EAA" or "IGQ" — encrypted blobs won't.
 * Used for backwards-compat migration when old plaintext tokens still exist in DB.
 */
export function isEncrypted(value: string): boolean {
  return (
    !value.startsWith('EAA') &&
    !value.startsWith('IGQ') &&
    !value.startsWith('EAB')
  );
}
