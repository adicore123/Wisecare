import express from 'express';
import { db } from '../db/db.js';
import { 
  verifyPassword, 
  checkRateLimit, 
  recordFailedLogin, 
  clearFailedLogin 
} from '../utils/security.js';
import { signToken, requireAuth, requireSuperadmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Simple auth login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'נא להזין שם משתמש וסיסמה' });
  }

  const rateLimitKey = `login:${req.ip}:${username.trim().toLowerCase()}`;
  const rateLimit = checkRateLimit(rateLimitKey);
  if (rateLimit.isBlocked) {
    return res.status(429).json({ 
      error: `חשבון זה נחסם זמנית עקב ריבוי ניסיונות שגויים מטעמי אבטחה. נא לנסות שוב בעוד ${rateLimit.remainingMinutes} דקות.` 
    });
  }

  const users = db.collection('users');
  const user = users.findOne(u => u.username.toLowerCase() === username.trim().toLowerCase());

  if (!user || !verifyPassword(password, user.password)) {
    recordFailedLogin(rateLimitKey);
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'משתמש זה מושבת על ידי מנהל המערכת' });
  }

  // Clear failed attempts on success
  clearFailedLogin(rateLimitKey);

  // Return user info with a proper signed JWT
  const { password: _, ...userInfo } = user;
  res.json({
    user: userInfo,
    token: signToken(user)
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile from verified JWT
 */
router.get('/me', requireAuth, (req, res) => {
  const users = db.collection('users');
  const user = users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'משתמש לא נמצא' });
  }
  const { password: _, ...userInfo } = user;
  res.json({ user: userInfo });
});

// Impersonate therapist (Superadmin only) – requires valid JWT + superadmin role
router.post('/impersonate', requireAuth, requireSuperadmin, (req, res) => {
  const { targetTherapistId } = req.body;
  const users = db.collection('users');

  // req.user is set by requireAuth middleware from the verified JWT
  const admin = users.findById(req.user.id);

  const therapist = users.findById(targetTherapistId);
  if (!therapist || therapist.role !== 'therapist') {
    return res.status(404).json({ error: 'מטפל לא נמצא' });
  }

  if (!therapist.active) {
    return res.status(403).json({ error: 'חשבון מטפל זה מושבת' });
  }

  // Issue a short-lived impersonation token
  const impersonationToken = signToken(therapist);
  const { password: _, ...therapistInfo } = therapist;
  res.json({
    user: therapistInfo,
    token: impersonationToken,
    isImpersonating: true,
    originalAdmin: admin.name
  });
});

/**
 * GET /therapist-login/:loginCode
 * Fetch therapist workspace details for dedicated login screen
 */
router.get('/therapist-login/:loginCode', (req, res) => {
  const { loginCode } = req.params;
  const users = db.collection('users');
  const therapist = users.findOne({ loginCode, role: 'therapist' });

  if (!therapist) {
    return res.status(404).json({ error: 'קישור כניסה אישי זה אינו תקין או שפג תוקפו. אנא פנה למנהל המערכת.' });
  }

  if (!therapist.active) {
    return res.status(403).json({ error: 'חשבון מטפל זה מושבת כרגע. אנא פנה למנהל המערכת.' });
  }

  const settings = db.getSettings();

  res.json({
    id: therapist.id,
    name: therapist.name,
    username: therapist.username,
    title: therapist.title,
    specialty: therapist.specialty,
    loginCode: therapist.loginCode,
    clinicName: settings.clinicName || 'מרחב טיפולי WiseCare'
  });
});

/**
 * POST /therapist-login/:loginCode
 * Authenticate therapist specifically through their dedicated unique link
 */
router.post('/therapist-login/:loginCode', (req, res) => {
  const { loginCode } = req.params;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'נא להזין שם משתמש וסיסמה' });
  }

  const rateLimitKey = `therapist-login:${req.ip}:${loginCode}`;
  const rateLimit = checkRateLimit(rateLimitKey);
  if (rateLimit.isBlocked) {
    return res.status(429).json({ 
      error: `דף כניסה זה נחסם זמנית עקב ריבוי ניסיונות שגויים מטעמי אבטחה. נא לנסות שוב בעוד ${rateLimit.remainingMinutes} דקות.` 
    });
  }

  const users = db.collection('users');
  const therapist = users.findOne({ loginCode, role: 'therapist' });

  if (!therapist) {
    return res.status(404).json({ error: 'קישור כניסה אישי זה אינו תקין' });
  }

  if (!therapist.active) {
    return res.status(403).json({ error: 'חשבון מטפל זה מושבת. אנא פנה למנהל המערכת.' });
  }

  // Validate username and password using secure verification
  const usernameMatch = therapist.username.toLowerCase() === username.trim().toLowerCase();
  const passwordMatch = verifyPassword(password, therapist.password);

  if (!usernameMatch || !passwordMatch) {
    recordFailedLogin(rateLimitKey);
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  }

  // Clear failed attempts on successful login
  clearFailedLogin(rateLimitKey);

  const { password: _, ...userInfo } = therapist;
  res.json({
    success: true,
    user: userInfo,
    token: signToken(therapist)
  });
});

export default router;
