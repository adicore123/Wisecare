import crypto from 'crypto';

/**
 * Secure public-link tokens (same model as the video-call join links):
 * the raw 192-bit token lives only in the link sent to the recipient —
 * the database stores only its SHA-256 hash, verified in constant time.
 */

const TOKEN_PATTERN = /^[0-9a-f]{48}$/;

export function hashLinkToken(token: string): string {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function generateLinkToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(24).toString('hex');
  return { token, hash: hashLinkToken(token) };
}

export function isLinkTokenFormat(token: string): boolean {
  return TOKEN_PATTERN.test(String(token || ''));
}

export function verifyLinkToken(token: string, storedHash: string): boolean {
  try {
    if (!isLinkTokenFormat(token) || !storedHash) return false;
    const a = Buffer.from(hashLinkToken(token), 'hex');
    const b = Buffer.from(String(storedHash), 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
