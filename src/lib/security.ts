import crypto from 'crypto';

/**
 * Hash a plain password using Node's cryptographic scrypt with unique salt
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plain password against stored salt:hash or fallback plain text
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;

  // Stored in salt:hash format
  if (stored.includes(':')) {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }

  // Backward compatibility with legacy plain text passwords in demo/dev
  return stored === password;
}

/**
 * Generate a cryptographically secure random password
 */
export function generateSecurePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';

  const pick = (set: string) => set[crypto.randomInt(0, set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];

  const all = upper + lower + digits + special;
  const remainingCount = Math.max(0, length - required.length);
  const remaining: string[] = [];

  for (let i = 0; i < remainingCount; i++) {
    remaining.push(pick(all));
  }

  const combined = [...required, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

export interface PasswordStrength {
  score: number;
  level: 'weak' | 'medium' | 'strong';
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
}

/**
 * Evaluate password strength score (0-100) and details
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
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

  let level: 'weak' | 'medium' | 'strong' = 'weak';
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
 */
export function isUsernameValid(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return /^[a-zA-Z0-9_.-]{3,30}$/.test(trimmed);
}

// In-memory brute force protection tracking
interface FailedAttempt {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
}

const failedAttemptsMap = new Map<string, FailedAttempt>();

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes block
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

export function checkRateLimit(identifier: string): { isBlocked: boolean; remainingMinutes: number } {
  const now = Date.now();
  const entry = failedAttemptsMap.get(identifier);
  if (!entry) return { isBlocked: false, remainingMinutes: 0 };

  if (entry.blockedUntil && entry.blockedUntil > now) {
    const remainingMinutes = Math.ceil((entry.blockedUntil - now) / (60 * 1000));
    return { isBlocked: true, remainingMinutes };
  }

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

export function recordFailedLogin(identifier: string): void {
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

export function clearFailedLogin(identifier: string): void {
  failedAttemptsMap.delete(identifier);
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 4) return '***';
  return `${clean.slice(0, 3)}-***-${clean.slice(-3)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}
