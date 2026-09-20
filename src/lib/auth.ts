import jwt from 'jsonwebtoken';

// A remembered device stays signed in for 30 days. Successful visits refresh
// the cookie, so active users are not asked for credentials again.
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is not configured or too short (min 32 chars)');
  }
  return secret;
};

export interface UserPayload {
  userId: string;
  role: 'therapist' | 'superadmin' | 'client';
  username: string;
  loginCode?: string;
}

export interface ClientPayload {
  clientId: string;
  role: 'client';
  portalCode: string;
}

/**
 * Sign a JWT for a therapist or superadmin user
 */
export function signToken(user: { id: string; role: string; username: string; loginCode?: string }): string {
  const secret = getSecret();
  return jwt.sign(
    { userId: user.id, role: user.role, username: user.username, loginCode: user.loginCode },
    secret,
    { expiresIn: '30d', issuer: 'wisecare', audience: 'wisecare-app' }
  );
}

/**
 * Sign a JWT session token for a client / portal patient
 */
export function signClientToken(client: { id: string; portalCode: string }): string {
  const secret = getSecret();
  return jwt.sign(
    { clientId: client.id, role: 'client', portalCode: client.portalCode },
    secret,
    { expiresIn: '30d', issuer: 'wisecare', audience: 'wisecare-portal' }
  );
}

/**
 * Verify a token and return the decoded payload.
 * When `audience` is given, tokens minted for a different audience are rejected
 * (a portal client token can never authenticate as an app user token, and vice versa).
 */
export function verifyToken<T = UserPayload>(token: string, audience?: string): T | null {
  try {
    const secret = getSecret();
    const payload = audience
      ? jwt.verify(token, secret, { audience })
      : jwt.verify(token, secret);
    return payload as T;
  } catch {
    return null;
  }
}

/**
 * Parse a Cookie header safely — a malformed value (e.g. a stray '%') must never
 * throw, or a single bad cookie would 500 every authenticated request.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (!k) continue;
    try {
      cookies[k] = decodeURIComponent(v.join('='));
    } catch {
      cookies[k] = v.join('=');
    }
  }
  return cookies;
}

/**
 * Extract and verify token from a Next.js Request (Cookies first, then Authorization Header)
 */
export function getAuthFromRequest(request: Request): UserPayload | null {
  // 1. Try reading from HttpOnly Cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);

    const cookieToken = cookies['wisecare_token'] || cookies['wisecare_admin_token'];
    if (cookieToken) {
      const payload = verifyToken<UserPayload>(cookieToken, 'wisecare-app');
      if (payload) return payload;
    }
  }

  // 2. Fallback to Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyToken<UserPayload>(token, 'wisecare-app');
  }

  return null;
}

/**
 * Extract and verify client / patient session from Cookie or Bearer header
 */
export function getClientAuthFromRequest(request: Request): ClientPayload | null {
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);

    const clientToken = cookies['wisecare_client_token'];
    if (clientToken) {
      const payload = verifyToken<ClientPayload>(clientToken, 'wisecare-portal');
      if (payload) return payload;
    }
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyToken<ClientPayload>(token, 'wisecare-portal');
  }

  return null;
}

/**
 * True when the request carries a valid patient session for THIS portal.
 * Every /api/portal/[portalCode]/* data route must pass this before reading/writing.
 */
export function isAuthorizedPortalClient(request: Request, portalCode: string): boolean {
  const auth = getClientAuthFromRequest(request);
  return Boolean(auth && auth.portalCode === portalCode);
}

/**
 * Build HttpOnly, Secure, SameSite=Lax Set-Cookie header value
 */
export function createSessionCookie(
  token: string,
  name: string = 'wisecare_token',
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS
): string {
  const isProd = process.env.NODE_ENV === 'production';
  const secureFlag = isProd ? '; Secure' : '';
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`;
}

/**
 * Build cookie clearing header value
 */
export function createClearCookie(name: string = 'wisecare_token'): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
