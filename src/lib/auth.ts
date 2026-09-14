import jwt from 'jsonwebtoken';

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
}

export interface ClientPayload {
  clientId: string;
  role: 'client';
  portalCode: string;
}

/**
 * Sign a JWT for a therapist or superadmin user
 */
export function signToken(user: { id: string; role: string; username: string }): string {
  const secret = getSecret();
  return jwt.sign(
    { userId: user.id, role: user.role, username: user.username },
    secret,
    { expiresIn: '8h', issuer: 'wisecare', audience: 'wisecare-app' }
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
    { expiresIn: '7d', issuer: 'wisecare', audience: 'wisecare-portal' }
  );
}

/**
 * Verify a token and return the decoded payload
 */
export function verifyToken<T = UserPayload>(token: string): T | null {
  try {
    const secret = getSecret();
    return jwt.verify(token, secret) as T;
  } catch {
    return null;
  }
}

/**
 * Extract and verify token from a Next.js Request (Cookies first, then Authorization Header)
 */
export function getAuthFromRequest(request: Request): UserPayload | null {
  // 1. Try reading from HttpOnly Cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );

    const cookieToken = cookies['wisecare_token'] || cookies['wisecare_admin_token'];
    if (cookieToken) {
      const payload = verifyToken<UserPayload>(cookieToken);
      if (payload) return payload;
    }
  }

  // 2. Fallback to Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyToken<UserPayload>(token);
  }

  return null;
}

/**
 * Extract and verify client / patient session from Cookie or Bearer header
 */
export function getClientAuthFromRequest(request: Request): ClientPayload | null {
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );

    const clientToken = cookies['wisecare_client_token'];
    if (clientToken) {
      const payload = verifyToken<ClientPayload>(clientToken);
      if (payload) return payload;
    }
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyToken<ClientPayload>(token);
  }

  return null;
}

/**
 * Build HttpOnly, Secure, SameSite=Lax Set-Cookie header value
 */
export function createSessionCookie(
  token: string,
  name: string = 'wisecare_token',
  maxAgeSeconds: number = 8 * 3600
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

