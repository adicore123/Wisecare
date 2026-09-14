import crypto from 'crypto';

/**
 * Hash a plain password using Node's cryptographic scrypt with unique salt
 * @param {string} password 
 * @returns {string} salt:hash format
 */
export function hashPassword(password) {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plain password against stored salt:hash or fallback plain text
 * @param {string} password 
 * @param {string} stored 
 * @returns {boolean}
 */
export function verifyPassword(password, stored) {
  if (!password || !stored) return false;

  // Stored in salt:hash format
  if (stored.includes(':')) {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch (e) {
      return false;
    }
  }

  // Backward compatibility with legacy plain text passwords in demo/dev
  return stored === password;
}

/**
 * Generate a cryptographically secure random password
 * @param {number} length 
 * @returns {string}
 */
export function generateSecurePassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';

  // Ensure at least one from each character set
  const pick = (set) => set[crypto.randomInt(0, set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];

  const all = upper + lower + digits + special;
  const remainingCount = Math.max(0, length - required.length);
  const remaining = [];

  for (let i = 0; i < remainingCount; i++) {
    remaining.push(pick(all));
  }

  // Shuffle the result securely using Fisher-Yates
  const combined = [...required, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

/**
 * Evaluate password strength score (0-100) and details
 * @param {string} password 
 * @returns {{ score: number, level: 'weak'|'medium'|'strong', hasMinLength: boolean, hasUpper: boolean, hasLower: boolean, hasDigit: boolean, hasSpecial: boolean }}
 */
export function evaluatePasswordStrength(password) {
  const pwd = password || '';
  const hasMinLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  let score = 0;
  if (pwd.length >= 8) score += 25;
  if (pwd.length >= 12) score += 15;
  if (hasUpper && hasLower) score += 25;
  if (hasDigit) score += 20;
  if (hasSpecial) score += 15;

  let level = 'weak';
  if (score >= 80 && hasMinLength && (hasUpper || hasLower) && hasDigit) {
    level = 'strong';
  } else if (score >= 50 && hasMinLength) {
    level = 'medium';
  }

  return {
    score: Math.min(score, 100),
    level,
    hasMinLength,
    hasUpper,
    hasLower,
    hasDigit,
    hasSpecial
  };
}

/**
 * Validate username format
 * @param {string} username 
 * @returns {boolean}
 */
export function isUsernameValid(username) {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  // English letters, numbers, underscore, dot, hyphen (3 to 30 chars)
  return /^[a-zA-Z0-9_.-]{3,30}$/.test(trimmed);
}

// In-memory brute force protection tracking
const failedAttemptsMap = new Map(); // key -> { count: number, firstAttempt: number, blockedUntil: number }

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes block
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

/**
 * Check if identifier is currently blocked by rate limit
 * @param {string} identifier 
 * @returns {{ isBlocked: boolean, remainingMinutes: number }}
 */
export function checkRateLimit(identifier) {
  const now = Date.now();
  const entry = failedAttemptsMap.get(identifier);
  if (!entry) return { isBlocked: false, remainingMinutes: 0 };

  if (entry.blockedUntil && entry.blockedUntil > now) {
    const remainingMinutes = Math.ceil((entry.blockedUntil - now) / (60 * 1000));
    return { isBlocked: true, remainingMinutes };
  }

  // If block expired or window passed, clear
  if (entry.blockedUntil && entry.blockedUntil <= now) {
    failedAttemptsMap.delete(identifier);
    return { isBlocked: false, remainingMinutes: 0 };
  }

  if (now - entry.firstAttempt > WINDOW_MS) {
    failedAttemptsMap.delete(identifier);
    return { isBlocked: false, remainingMinutes: 0 };
  }

  return { isBlocked: false, remainingMinutes: 0 };
}

/**
 * Record a failed login attempt
 * @param {string} identifier 
 */
export function recordFailedLogin(identifier) {
  const now = Date.now();
  let entry = failedAttemptsMap.get(identifier);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    entry = { count: 1, firstAttempt: now, blockedUntil: 0 };
  } else {
    entry.count += 1;
  }

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
  }

  failedAttemptsMap.set(identifier, entry);
}

/**
 * Clear failed login attempts after successful authentication
 * @param {string} identifier 
 */
export function clearFailedLogin(identifier) {
  failedAttemptsMap.delete(identifier);
}
