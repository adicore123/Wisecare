import express from 'express';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db/db.js';
import { sendWhatsAppMessage, checkInstanceStatus, getQrCode } from '../services/greenApi.js';
import { requireAuth, requireTherapist } from '../middleware/auth.middleware.js';

const router = express.Router();

const whatsappTestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'יותר מדי בדיקות WhatsApp. אנא נסה שוב בעוד דקה.' }
});

// Get Green API live status (Authenticated therapist/admin only)
router.get('/status', requireAuth, requireTherapist, async (req, res) => {
  try {
    const status = await checkInstanceStatus();
    res.json(status);
  } catch (err) {
    console.error('[Green API Status Error]', err);
    res.status(500).json({ error: 'שגיאה בבדיקת סטטוס Green API' });
  }
});

// Get Green API QR code for pairing WhatsApp (Authenticated therapist/admin only)
router.get('/qr', requireAuth, requireTherapist, async (req, res) => {
  try {
    const qr = await getQrCode();
    res.json(qr);
  } catch (err) {
    console.error('[Green API QR Error]', err);
    res.status(500).json({ error: 'שגיאה בטעינת קוד QR' });
  }
});

// Get settings - returns full settings for authenticated therapists, or public clinic info for portals
router.get('/', (req, res) => {
  const settings = db.getSettings();
  
  // Check if authenticated
  let isAuthenticated = false;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ') && process.env.JWT_SECRET) {
    try {
      jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  if (isAuthenticated) {
    return res.json(settings);
  }

  // Public safe subset for patient portal / unauthenticated visitors
  const publicSettings = {
    clinicName: settings.clinicName,
    therapistName: settings.therapistName,
    therapistTitle: settings.therapistTitle,
    clinicPhone: settings.clinicPhone,
    clinicEmail: settings.clinicEmail,
    clinicAddress: settings.clinicAddress,
    clinicCity: settings.clinicCity,
    clinicFloor: settings.clinicFloor,
    clinicArrivalInstructions: settings.clinicArrivalInstructions,
    clinicDescription: settings.clinicDescription,
    themeId: settings.themeId || 'sage',
    defaultMessageTemplate: settings.defaultMessageTemplate
  };

  res.json(publicSettings);
});

// Update settings (Authenticated therapist/admin only)
router.put('/', requireAuth, requireTherapist, (req, res) => {
  const allowedFields = [
    'clinicName',
    'therapistName',
    'therapistTitle',
    'clinicPhone',
    'clinicEmail',
    'clinicAddress',
    'clinicCity',
    'clinicFloor',
    'clinicArrivalInstructions',
    'clinicDescription',
    'themeId',
    'greenApiToken',
    'greenApiInstanceId',
    'greenApiUrl',
    'defaultMessageTemplate'
  ];
  const update = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      update[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
    }
  }
  // Preserve multiline formatting for templates & instructions
  if (req.body.defaultMessageTemplate !== undefined) update.defaultMessageTemplate = req.body.defaultMessageTemplate;
  if (req.body.clinicArrivalInstructions !== undefined) update.clinicArrivalInstructions = req.body.clinicArrivalInstructions;

  const updated = db.updateSettings(update);
  res.json(updated);
});

// Test WhatsApp connectivity (Authenticated therapist/admin only, rate-limited)
router.post('/test-whatsapp', requireAuth, requireTherapist, whatsappTestLimiter, async (req, res) => {
  const { phone, testMessage } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'נא להזין מספר טלפון לבדיקה' });
  }

  try {
    const result = await sendWhatsAppMessage({
      phone,
      message: testMessage || 'שלום! זוהי הודעת בדיקה ממערכת WiseCare למטפלים רגשיים ופסיכולוגים. החיבור ל-Green API פעיל בהצלחה! ✨'
    });
    res.json({ success: true, result });
  } catch (err) {
    console.error('[Test WhatsApp Error]', err);
    res.status(500).json({ success: false, error: 'אירעה שגיאה בשליחת הודעת בדיקה ב-WhatsApp. אנא בדוק את הגדרות ה-API.' });
  }
});

export default router;
