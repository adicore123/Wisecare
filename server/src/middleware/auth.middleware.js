import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { db } from '../db/db.js';

const getSecret = () => process.env.JWT_SECRET;

/**
 * Verify JWT token and attach user to request.
 * Usage: router.get('/protected', requireAuth, handler)
 */
export function requireAuth(req, res, next) {
  const secret = getSecret();
  if (!secret) {
    console.error('[Auth] FATAL: JWT_SECRET env var is not set!');
    return res.status(500).json({ error: 'שגיאת תצורת שרת פנימית.' });
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'נדרשת כניסה למערכת. אנא התחבר/י מחדש.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, secret);
    // Re-verify user still exists and is active in DB
    const user = db.collection('users').findById(payload.userId);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'המשתמש אינו פעיל. אנא התחבר/י מחדש.' });
    }
    req.user = { id: user.id, role: user.role, username: user.username };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'פג תוקף ההתחברות. אנא התחבר/י מחדש.' });
    }
    return res.status(401).json({ error: 'טוקן אימות לא תקין. אנא התחבר/י מחדש.' });
  }
}

/**
 * Require superadmin role (must come after requireAuth).
 * Usage: router.get('/admin', requireAuth, requireSuperadmin, handler)
 */
export function requireSuperadmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'גישה לפאנל SuperAdmin חסומה' });
  }
  next();
}

/**
 * Require therapist or superadmin role.
 */
export function requireTherapist(req, res, next) {
  if (!req.user || (req.user.role !== 'therapist' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'גישה מורשית למטפלים בלבד' });
  }
  next();
}

/**
 * Sign a JWT for a given user.
 * @param {{ id: string, role: string, username: string }} user
 * @returns {string} signed JWT
 */
export function signToken(user) {
  const secret = getSecret();
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(
    { userId: user.id, role: user.role, username: user.username },
    secret,
    { expiresIn: '8h', issuer: 'wisecare', audience: 'wisecare-app' }
  );
}

/**
 * Sign a JWT session token for a client / portal patient.
 * @param {{ id: string, portalCode: string }} client
 * @returns {string} signed JWT
 */
export function signClientToken(client) {
  const secret = getSecret();
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(
    { clientId: client.id, role: 'client', portalCode: client.portalCode },
    secret,
    { expiresIn: '7d', issuer: 'wisecare', audience: 'wisecare-portal' }
  );
}

