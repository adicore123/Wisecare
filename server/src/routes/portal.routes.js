import express from 'express';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db/db.js';
import { sendWhatsAppMessage } from '../services/greenApi.js';
import { hashPassword, verifyPassword } from '../utils/security.js';
import { signClientToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── Rate Limiters for public endpoints ──────────────────────────────────────
const joinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // max 5 registrations per IP per hour
  message: { error: 'יותר מדי ניסיונות הרשמה. אנא נסה שוב בעוד שעה.' }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // max 5 OTP requests per IP per 15 min
  message: { error: 'יותר מדי בקשות קוד איפוס. אנא נסה שוב בעוד 15 דקות.' }
});

const portalLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'יותר מדי ניסיונות כניסה. אנא נסה שוב בעוד 15 דקות.' }
});


/**
 * Helper to mask phone and email for security
 */
function maskPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 4) return '***';
  return `${clean.slice(0, 3)}-***-${clean.slice(-3)}`;
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}

/**
 * Public Self-Care Registration endpoint (/join)
 * Creates a client with username, password, email, and sends WhatsApp welcome message
 */
router.post('/join', joinLimiter, async (req, res) => {
  try {
    let { firstName, lastName = '', fullName, phone, email = '', username = '', password = '', goal = '' } = req.body;
    if (!firstName && fullName) {
      const parts = fullName.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'נא להזין שם מלא או שם פרטי' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'נא להזין מספר טלפון לקבלת הודעות ב-WhatsApp' });
    }
    // Validate email format more strictly
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !email.trim() || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'נא להזין כתובת אימייל תקינה לשחזור סיסמה' });
    }
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'שם משתמש חייב להכיל לפחות 3 תווים' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'סיסמה חייבת להכיל לפחות 8 תווים' });
    }

    const cleanFirst = firstName.trim();
    const cleanLast = (lastName || '').trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    const clients = db.collection('clients');
    const users = db.collection('users');

    // 1. Check if username is already taken in clients or users
    const existingClientByUsername = clients.findOne(c => (c.username || '').toLowerCase() === cleanUsername);
    const existingUserByUsername = users.findOne(u => (u.username || '').toLowerCase() === cleanUsername);
    if (existingClientByUsername || existingUserByUsername) {
      return res.status(400).json({ error: 'שם משתמש זה כבר תפוס במערכת. נא לבחור שם משתמש אחר.' });
    }

    // 2. Check if phone is already registered
    const existingClientByPhone = clients.findOne({ phone: cleanPhone });
    if (existingClientByPhone) {
      return res.status(400).json({ 
        error: 'מספר טלפון זה כבר רשום במערכת. אנא התחבר/י עם שם המשתמש והסיסמה שלך, או השתמש/י בשחזור סיסמה.' 
      });
    }

    // 3. Generate unique portalCode using cryptographically random numbers
    const baseSlug = (cleanFirst.toLowerCase().replace(/[^a-z0-9]/g, '') || 'my').slice(0, 15);
    const randDigits = crypto.randomInt(100000, 999999);
    let portalCode = `${baseSlug}-${randDigits}`;

    while (clients.findOne({ portalCode })) {
      portalCode = `${baseSlug}-${crypto.randomInt(100000, 999999)}`;
    }

    // 4. Hash password securely
    const passwordHash = hashPassword(password);

    // 5. Create client record
    const client = clients.insertOne({
      firstName: cleanFirst,
      lastName: cleanLast,
      phone: cleanPhone,
      email: cleanEmail,
      username: cleanUsername,
      password: passwordHash,
      portalCode,
      therapistId: null,
      isSelfCare: true,
      source: 'self_join',
      goal: (goal || '').trim(),
      status: 'active',
      createdAt: new Date().toISOString()
    });

    const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
    const portalUrl = `${clientAppUrl}/portal/${encodeURIComponent(client.portalCode)}`;

    let whatsappSent = false;
    let whatsappError = null;
    if (req.body.sendWhatsApp !== false) {
      try {
        const message = `שלום ${client.firstName}, המרחב האישי והמאובטח שלך ב-WiseCare מוכן 🌱\n\nפרטי החשבון שלך:\n👤 שם משתמש: *${client.username}*\n🔑 סיסמה: ${password}\n\nהקישור הישיר למרחב שלך:\n👉 ${portalUrl}\n\nכאן תוכל לנהל משימות, לשמור סרטונים ומאמרים, ולתעד פגישות.\n💡 מומלץ לשמור הודעה זו או להוסיף את הפורטל למסך הבית!`;
        await sendWhatsAppMessage({ phone: client.phone, message });
        whatsappSent = true;
      } catch (err) {
        console.warn('[WhatsApp Join Warning]', err.message);
        whatsappError = err.message;
      }
    }

    const token = signClientToken(client);

    return res.status(201).json({
      success: true,
      portalCode: client.portalCode,
      portalUrl,
      token,
      whatsappSent,
      whatsappError,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        username: client.username,
        phone: client.phone,
        email: client.email,
        portalCode: client.portalCode,
        isSelfCare: true
      }
    });
  } catch (error) {
    console.error('[Portal Join Error]', error);
    return res.status(500).json({ error: 'אירעה שגיאה ביצירת המרחב האישי. אנא נסה שוב.' });
  }
});

/**
 * Public Self-Care Login endpoint (/api/portal/login)
 * Authenticates client by username, phone, or email + password
 */
router.post('/login', portalLoginLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'נא להזין שם משתמש (או אימייל/טלפון) וסיסמה' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const clients = db.collection('clients');

    // Find client by username, email or phone
    const client = clients.findOne(c => 
      (c.username && c.username.toLowerCase() === cleanId) ||
      (c.email && c.email.toLowerCase() === cleanId) ||
      (c.phone && c.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (!client) {
      return res.status(401).json({ error: 'פרטי ההתחברות שגויים. לא נמצא משתמש תואם.' });
    }

    if (!client.password || !verifyPassword(password, client.password)) {
      return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים.' });
    }

    const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
    const portalUrl = `${clientAppUrl}/portal/${encodeURIComponent(client.portalCode)}`;

    const token = signClientToken(client);

    return res.json({
      success: true,
      portalCode: client.portalCode,
      portalUrl,
      token,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        username: client.username || client.firstName,
        phone: client.phone,
        email: client.email,
        portalCode: client.portalCode,
        isSelfCare: Boolean(client.isSelfCare || !client.therapistId)
      }
    });
  } catch (error) {
    console.error('[Portal Login Error]', error);
    return res.status(500).json({ error: 'אירעה שגיאה בהתחברות למערכת.' });
  }
});

/**
 * Request Password Reset OTP (/api/portal/forgot-password/request)
 * Sends 6-digit OTP code to user's phone via WhatsApp
 */
router.post('/forgot-password/request', forgotPasswordLimiter, async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'נא להזין מספר טלפון, אימייל או שם משתמש' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const clients = db.collection('clients');

    const client = clients.findOne(c => 
      (c.username && c.username.toLowerCase() === cleanId) ||
      (c.email && c.email.toLowerCase() === cleanId) ||
      (c.phone && c.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (!client) {
      return res.status(404).json({ error: 'לא נמצא חשבון התואם לפרטים שהוזנו.' });
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    clients.updateById(client.id, {
      resetOtp: {
        code: otpCode,
        expiresAt
      }
    });

    // Send WhatsApp OTP
    let whatsappSent = false;
    let whatsappError = null;
    try {
      const message = `שלום ${client.firstName},\nקוד האימות שלך לאיפוס סיסמה ב-WiseCare הוא:\n\n🔐 *${otpCode}*\n\nהקוד תקף ל-10 דקות הקרובות. אם לא ביקשת לאפס סיסמה, אנא התעלם מהודעה זו.`;
      await sendWhatsAppMessage({ phone: client.phone, message });
      whatsappSent = true;
    } catch (err) {
      console.warn('[Forgot Password WhatsApp Warning]', err.message);
      whatsappError = err.message;
    }

    return res.json({
      success: true,
      whatsappSent,
      whatsappError,
      maskedPhone: maskPhone(client.phone),
      maskedEmail: maskEmail(client.email),
      identifier: client.username || client.phone
    });
  } catch (error) {
    console.error('[Forgot Password Request Error]', error);
    return res.status(500).json({ error: 'אירעה שגיאה בשליחת קוד האימות.' });
  }
});

/**
 * Verify OTP and Reset Password (/api/portal/forgot-password/reset)
 */
router.post('/forgot-password/reset', forgotPasswordLimiter, async (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;
    if (!identifier || !code || !newPassword) {
      return res.status(400).json({ error: 'נא למלא את כל השדות' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'סיסמה חדשה חייבת להכיל לפחות 6 תווים' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanCode = code.trim();
    const clients = db.collection('clients');

    const client = clients.findOne(c => 
      (c.username && c.username.toLowerCase() === cleanId) ||
      (c.email && c.email.toLowerCase() === cleanId) ||
      (c.phone && c.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (!client || !client.resetOtp) {
      return res.status(400).json({ error: 'בקשת איפוס לא נמצאה או שפג תוקפה. אנא בקש/י קוד חדש.' });
    }

    if (new Date(client.resetOtp.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'תוקף קוד האימות פג. אנא בקש/י קוד חדש.' });
    }

    if (client.resetOtp.code !== cleanCode) {
      return res.status(400).json({ error: 'קוד האימות שהוזן אינו נכון.' });
    }

    // Minimum password length 8 for consistency
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'סיסמה חדשה חייבת להכיל לפחות 8 תווים' });
    }

    // Hash and update new password, clear OTP
    const passwordHash = hashPassword(newPassword.trim());
    clients.updateById(client.id, {
      password: passwordHash,
      resetOtp: null
    });

    const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
    const portalUrl = `${clientAppUrl}/portal/${encodeURIComponent(client.portalCode)}`;

    const token = signClientToken(client);

    return res.json({
      success: true,
      message: 'הסיסמה אופסה בהצלחה!',
      portalCode: client.portalCode,
      portalUrl,
      token
    });
  } catch (error) {
    console.error('[Forgot Password Reset Error]', error);
    return res.status(500).json({ error: 'אירעה שגיאה באיפוס הסיסמה.' });
  }
});

// Get client portal data by portalCode
router.get('/:portalCode', (req, res) => {
  const { portalCode } = req.params;
  const clients = db.collection('clients');
  const tasks = db.collection('tasks');
  const users = db.collection('users');
  const contentItems = db.collection('contentItems');
  const contentAssignments = db.collection('contentAssignments');
  const settings = db.getSettings();

  const client = clients.findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב טיפולי זה לא נמצא או שהקישור שגוי' });
  }

  const therapist = users.findById(client.therapistId);
  const clientTasks = tasks.find({ clientId: client.id });
  const clientContent = contentAssignments
    .find({ clientId: client.id })
    .map(assignment => {
      const item = contentItems.findById(assignment.contentId);
      if (!item || item.archived) return null;
      return {
        id: item.id,
        assignmentId: assignment.id,
        title: item.title,
        description: item.description,
        type: item.type,
        url: item.url,
        imageData: item.imageData,
        category: item.category,
        sourceName: item.sourceName,
        assignedAt: assignment.createdAt
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));

  // Safe client data for the patient portal (never expose internal therapist diagnosis notes if private)
  res.json({
    portalInfo: {
      clinicName: settings.clinicName || 'WiseCare מרחב טיפולי',
      clinicAddress: settings.clinicAddress || '',
      clinicCity: settings.clinicCity || '',
      clinicFloor: settings.clinicFloor || '',
      clinicPhone: settings.clinicPhone || therapist?.phone || '',
      clinicArrivalInstructions: settings.clinicArrivalInstructions || '',
      themeId: settings.themeId || 'sage',
      portalCode: client.portalCode,
      clientName: `${client.firstName} ${client.lastName}`,
      firstName: client.firstName,
      gender: client.gender,
      therapist: therapist ? {
        name: therapist.name,
        title: therapist.title,
        phone: therapist.phone,
        email: therapist.email,
        specialty: therapist.specialty
      } : null,
      isSelfCare: Boolean(client.isSelfCare || !client.therapistId)
    },
    // Tasks: sorted by dueDate or completion
    tasks: clientTasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      dueDate: t.dueDate,
      completed: !!t.completed,
      completedAt: t.completedAt,
      clientNotes: t.clientNotes || '',
      isSelfCreated: Boolean(t.isSelfCreated || client.isSelfCare || !client.therapistId),
      createdAt: t.createdAt
    })),
    content: clientContent
  });
});

// Client marks task completed or adds patient feedback/notes
// Client has NO permission to delete or alter task title/instructions!
router.post('/:portalCode/task-status', (req, res) => {
  const { portalCode } = req.params;
  const { taskId, completed, clientNotes } = req.body;

  const clients = db.collection('clients');
  const tasks = db.collection('tasks');

  const client = clients.findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const task = tasks.findById(taskId);
  if (!task || task.clientId !== client.id) {
    return res.status(403).json({ error: 'אין הרשאה לעדכן משימה זו' });
  }

  const updateData = {};
  if (completed !== undefined) {
    updateData.completed = Boolean(completed);
    updateData.completedAt = completed ? new Date().toISOString() : null;
  }
  if (clientNotes !== undefined) {
    updateData.clientNotes = String(clientNotes).trim();
  }

  const updated = tasks.updateById(taskId, updateData);
  res.json({
    success: true,
    message: 'סטטוס המשימה עודכן בהצלחה במרחב הטיפולי',
    task: updated
  });
});

// Client creates a personal task/practice
router.post('/:portalCode/tasks', (req, res) => {
  const { portalCode } = req.params;
  const { title, description, category, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'נא להזין כותרת למשימה או לתרגול' });
  }

  const client = db.collection('clients').findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const newTask = db.collection('tasks').insertOne({
    clientId: client.id,
    therapistId: client.therapistId || null,
    title: title.trim(),
    description: description ? description.trim() : '',
    category: category ? category.trim() : 'אישי',
    dueDate: dueDate || null,
    completed: false,
    isSelfCreated: true,
    clientNotes: '',
    createdAt: new Date().toISOString()
  });

  res.status(201).json(newTask);
});

// Client deletes a personal task
router.delete('/:portalCode/tasks/:taskId', (req, res) => {
  const { portalCode, taskId } = req.params;
  const client = db.collection('clients').findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const task = db.collection('tasks').findById(taskId);
  if (!task || task.clientId !== client.id) {
    return res.status(403).json({ error: 'אין הרשאה למחוק משימה זו' });
  }

  db.collection('tasks').deleteById(taskId);
  res.json({ success: true, message: 'המשימה נמחקה בהצלחה' });
});

// Client adds content/video to their personal sanctuary
router.post('/:portalCode/content', (req, res) => {
  const { portalCode } = req.params;
  const { url, title, description, type = 'video', imageData, sourceName, category = 'אישי' } = req.body;

  const client = db.collection('clients').findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  if (!url && !description && !imageData) {
    return res.status(400).json({ error: 'נא להזין קישור, תיאור או תמונה' });
  }

  const finalTitle = (title && title.trim()) ? title.trim() : (
    type === 'video' ? `סרטון (${sourceName || 'מהרשת'})` :
    type === 'post' ? `פוסט (${sourceName || 'מרשת חברתית'})` :
    'פריט תוכן'
  );

  const item = db.collection('contentItems').insertOne({
    therapistId: client.therapistId || null,
    title: finalTitle,
    description: description ? description.trim() : '',
    type: type || 'video',
    url: url ? url.trim() : '',
    imageData: imageData || '',
    sourceName: sourceName ? sourceName.trim() : '',
    category: category ? category.trim() : 'אישי',
    customNote: '',
    createdAt: new Date().toISOString()
  });

  const assignment = db.collection('contentAssignments').insertOne({
    contentId: item.id,
    clientId: client.id,
    notificationStatus: 'none',
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    id: item.id,
    assignmentId: assignment.id,
    title: item.title,
    description: item.description,
    type: item.type,
    url: item.url,
    imageData: item.imageData,
    category: item.category,
    sourceName: item.sourceName,
    assignedAt: assignment.createdAt
  });
});

// Client removes content from their portal
router.delete('/:portalCode/content/:contentId', (req, res) => {
  const { portalCode, contentId } = req.params;
  const client = db.collection('clients').findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const assignments = db.collection('contentAssignments').find({ contentId, clientId: client.id });
  for (const a of assignments) {
    db.collection('contentAssignments').deleteById(a.id);
  }

  res.json({ success: true, message: 'התוכן הוסר מהמרחב האישי' });
});

// --- Insights & Thoughts Journal (יומן תובנות ומחשבות אישי) ---

// Get all insights for client portal
router.get('/:portalCode/insights', (req, res) => {
  const { portalCode } = req.params;
  const clients = db.collection('clients');
  const insights = db.collection('insights');

  const client = clients.findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const clientInsights = insights.find({ clientId: client.id });
  // Sort newest first
  clientInsights.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(clientInsights);
});

// Add new insight entry by client
router.post('/:portalCode/insights', (req, res) => {
  const { portalCode } = req.params;
  const { title, content, mood, intensity } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'נא למלא תוכן לתובנה או למחשבה' });
  }

  const clients = db.collection('clients');
  const insights = db.collection('insights');

  const client = clients.findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const newInsight = insights.insertOne({
    clientId: client.id,
    therapistId: client.therapistId,
    portalCode,
    title: title ? title.trim() : 'תובנה שבועית',
    content: content.trim(),
    mood: mood || 'רגיל',
    intensity: Number(intensity) || 5,
    recordedDate: dateStr,
    recordedTime: timeStr,
    createdAt: now.toISOString()
  });

  res.status(201).json(newInsight);
});

// Delete an insight entry
router.delete('/:portalCode/insights/:id', (req, res) => {
  const { portalCode, id } = req.params;
  const clients = db.collection('clients');
  const insights = db.collection('insights');

  const client = clients.findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const insight = insights.findById(id);
  if (!insight || insight.clientId !== client.id) {
    return res.status(403).json({ error: 'אין הרשאה למחוק תובנה זו' });
  }

  insights.deleteById(id);
  res.json({ success: true, message: 'התובנה נמחקה' });
});

/**
 * GET /:portalCode/appointments
 * Get client's appointments (both confirmed and pending requests)
 */
router.get('/:portalCode/appointments', (req, res) => {
  const { portalCode } = req.params;
  const client = db.collection('clients').findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const appointments = db.collection('appointments').find({ clientId: client.id });
  appointments.sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare !== 0) return dateCompare;
    return (a.time || '').localeCompare(b.time || '');
  });

  res.json(appointments);
});

/**
 * POST /:portalCode/appointments
 * Client submits an appointment request or creates a self-care session
 */
router.post('/:portalCode/appointments', (req, res) => {
  const { portalCode } = req.params;
  const { preferredDate, preferredTime, type = 'in_person', notes, therapistName, location: customLocation } = req.body;

  if (!preferredDate) {
    return res.status(400).json({ error: 'נא לבחור תאריך לפגישה' });
  }

  const client = db.collection('clients').findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const isSelf = Boolean(client.isSelfCare || !client.therapistId);
  const settings = db.getSettings();
  const clinicName = settings.clinicName || 'הקליניקה';

  const defaultLocation = type === 'zoom' ? 'פגישת וידאו (Zoom)' : type === 'phone' ? 'שיחת טלפון' : clinicName;
  const location = customLocation || defaultLocation;

  const newAppointment = db.collection('appointments').insertOne({
    therapistId: client.therapistId || null,
    therapistName: therapistName ? therapistName.trim() : (isSelf ? 'פגישה אישית' : ''),
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`.trim(),
    clientPhone: client.phone,
    portalCode,
    date: preferredDate,
    time: preferredTime || '10:00',
    durationMinutes: 50,
    type,
    typeName: type === 'zoom' ? 'פגישת וידאו (Zoom)' : type === 'phone' ? 'שיחה טלפונית' : 'פגישה בקליניקה',
    location,
    status: isSelf ? 'confirmed' : 'pending',
    isSelfManaged: isSelf,
    requestedBy: 'client',
    notes: notes ? notes.trim() : (isSelf ? 'פגישה ביומן האישי' : 'בקשת תור חדש מפורטל הלקוח'),
    reminderSent: false,
    reminderSentAt: null,
    confirmationSent: false,
    confirmationSentAt: null,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(newAppointment);
});

/**
 * DELETE /:portalCode/appointments/:id
 * Client deletes an appointment
 */
router.delete('/:portalCode/appointments/:id', (req, res) => {
  const { portalCode, id } = req.params;
  const client = db.collection('clients').findOne({ portalCode });
  if (!client) {
    return res.status(404).json({ error: 'מרחב אישי לא נמצא' });
  }

  const appt = db.collection('appointments').findById(id);
  if (!appt || appt.clientId !== client.id) {
    return res.status(403).json({ error: 'אין הרשאה למחוק פגישה זו' });
  }

  db.collection('appointments').deleteById(id);
  res.json({ success: true, message: 'הפגישה נמחקה בהצלחה' });
});

export default router;
