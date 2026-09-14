interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const generalRateLimits = new Map<string, { count: number; resetTime: number }>();
const whatsappThrottles = new Map<string, { lastSent: number; countInWindow: number; windowReset: number }>();

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export function checkLoginBruteForce(identifier: string): { locked: boolean; remainingMinutes?: number } {
  const key = identifier.toLowerCase().trim();
  const record = loginAttempts.get(key);

  if (!record) {
    return { locked: false };
  }

  const now = Date.now();

  // If locked, check if lockout period expired
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMs = record.lockedUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    return { locked: true, remainingMinutes };
  }

  // If attempt window expired without being locked, clean up
  if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(key);
    return { locked: false };
  }

  return { locked: false };
}

export function recordFailedLogin(identifier: string): { locked: boolean; attemptsLeft: number; remainingMinutes?: number } {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  let record = loginAttempts.get(key);

  if (!record || (now - record.firstAttempt > ATTEMPT_WINDOW_MS && !record.lockedUntil)) {
    record = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now
    };
  } else {
    record.count += 1;
    record.lastAttempt = now;
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOGIN_LOCKOUT_MS;
    loginAttempts.set(key, record);
    return { locked: true, attemptsLeft: 0, remainingMinutes: 15 };
  }

  loginAttempts.set(key, record);
  return { locked: false, attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - record.count) };
}

export function recordSuccessfulLogin(identifier: string) {
  const key = identifier.toLowerCase().trim();
  loginAttempts.delete(key);
}

/**
 * General API Rate Limiter
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowSeconds: number = 60
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = generalRateLimits.get(key);

  if (!entry || now > entry.resetTime) {
    generalRateLimits.set(key, {
      count: 1,
      resetTime: now + windowSeconds * 1000
    });
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * WhatsApp Specific Throttling to prevent infinite loops, spam and runaway costs
 */
export function checkWhatsAppThrottle(phone: string): { allowed: boolean; reason?: string } {
  const cleanPhone = phone.replace(/\D/g, '');
  const now = Date.now();
  const entry = whatsappThrottles.get(cleanPhone);

  if (!entry) {
    whatsappThrottles.set(cleanPhone, {
      lastSent: now,
      countInWindow: 1,
      windowReset: now + 10 * 60 * 1000
    });
    return { allowed: true };
  }

  // Minimum 10 seconds between messages to same number
  if (now - entry.lastSent < 10 * 1000) {
    return { allowed: false, reason: 'נא להמתין מספר שניות בין שליחת הודעות לאותו מספר' };
  }

  // Reset 10 minute window if expired
  if (now > entry.windowReset) {
    whatsappThrottles.set(cleanPhone, {
      lastSent: now,
      countInWindow: 1,
      windowReset: now + 10 * 60 * 1000
    });
    return { allowed: true };
  }

  // Max 6 messages per 10 minutes to same number
  if (entry.countInWindow >= 6) {
    return { allowed: false, reason: 'הוגבלה שליחה זמנית למספר זה עקב ריבוי הודעות בפרק זמן קצר' };
  }

  entry.lastSent = now;
  entry.countInWindow += 1;
  return { allowed: true };
}
