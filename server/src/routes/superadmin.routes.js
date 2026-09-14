import crypto from 'crypto';
import express from 'express';
import { db } from '../db/db.js';
import { sendWhatsAppMessage, checkInstanceStatus } from '../services/greenApi.js';
import { 
  hashPassword, 
  isUsernameValid, 
  evaluatePasswordStrength, 
  generateSecurePassword 
} from '../utils/security.js';
import { requireAuth, requireSuperadmin, signClientToken } from '../middleware/auth.middleware.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Helper to generate clean login slug with cryptographic randomness
function generateLoginCode(username, name) {
  let base = (username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!base) {
    base = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  if (!base) {
    base = 'therapist';
  }
  const rand = crypto.randomInt(100000, 999999);
  return `${base}-${rand}`;
}

// Get global system statistics
router.get('/stats', requireAuth, requireSuperadmin, (req, res) => {
  const users = db.collection('users');
  const clients = db.collection('clients');
  const tasks = db.collection('tasks');

  const totalTherapists = users.find({ role: 'therapist' }).length;
  const activeTherapists = users.find({ role: 'therapist', active: true }).length;
  const totalClients = clients.count();
  const totalTasks = tasks.count();
  const completedTasks = tasks.find({ completed: true }).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  res.json({
    totalTherapists,
    activeTherapists,
    totalClients,
    totalTasks,
    completedTasks,
    completionRate
  });
});

// Get SuperAdmin automation & system settings
router.get('/settings', requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const settings = db.getSettings();
    let greenApiStatus = null;
    try {
      greenApiStatus = await checkInstanceStatus();
    } catch (e) {
      greenApiStatus = { status: 'error', message: e.message };
    }
    res.json({
      settings,
      greenApiStatus
    });
  } catch (err) {
    console.error('[SuperAdmin Settings Load Error]', err);
    res.status(500).json({ error: 'שגיאה בטעינת הגדרות SuperAdmin. אנא נסה שוב.' });
  }
});

// Update SuperAdmin automation & system settings
router.put('/settings', requireAuth, requireSuperadmin, (req, res) => {
  try {
    const allowedKeys = [
      'autoSendTherapistInviteWhatsApp',
      'therapistInviteMessageTemplate',
      'greenApiInstanceId',
      'greenApiToken',
      'greenApiUrl',
      'clinicName'
    ];
    const updates = {};
    allowedKeys.forEach(k => {
      if (req.body[k] !== undefined) {
        updates[k] = req.body[k];
      }
    });

    const updated = db.updateSettings(updates);
    res.json({
      success: true,
      message: 'הגדרות SuperAdmin עודכנו בהצלחה',
      settings: updated
    });
  } catch (err) {
    console.error('[SuperAdmin Settings Update Error]', err);
    res.status(500).json({ error: 'שגיאה בעדכון הגדרות. אנא נסה שוב.' });
  }
});

// List all therapists with enriched details & unique login codes
router.get('/therapists', requireAuth, requireSuperadmin, (req, res) => {
  const users = db.collection('users');
  const clients = db.collection('clients');
  const tasks = db.collection('tasks');

  const therapists = users.find({ role: 'therapist' }).map(t => {
    const therapistClients = clients.find({ therapistId: t.id });
    const therapistTasks = tasks.find({ therapistId: t.id });

    // Ensure loginCode exists
    let loginCode = t.loginCode;
    if (!loginCode) {
      loginCode = generateLoginCode(t.username, t.name);
      users.updateById(t.id, { loginCode });
    }

    const { password, ...safeData } = t;
    return {
      ...safeData,
      loginCode,
      loginUrl: `/login/${loginCode}`,
      clientsCount: therapistClients.length,
      tasksCount: therapistTasks.length,
      activeTasksCount: therapistTasks.filter(tsk => !tsk.completed).length
    };
  });

  res.json(therapists);
});

// Create new therapist with unique loginCode & automated WhatsApp credentials delivery
router.post('/therapists', requireAuth, requireSuperadmin, async (req, res) => {
  const { name, username, password, email, phone, title, specialty, sendWhatsApp } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'שם מלא, שם משתמש וסיסמה הינם שדות חובה' });
  }

  // Username validation for security
  const cleanUsername = username.trim();
  if (!isUsernameValid(cleanUsername)) {
    return res.status(400).json({ 
      error: 'שם משתמש אינו תקין: יש להשתמש באותיות אנגלית, מספרים, נקודות או קווים תחתונים בלבד (לפחות 3 תווים וללא רווחים).' 
    });
  }

  // Password security validation
  if (password.length < 8) {
    return res.status(400).json({ 
      error: 'הסיסמה קצרה מדי: נדרשים לפחות 8 תווים לרמת אבטחה מקצועית.' 
    });
  }

  // Email format validation
  if (email && email.trim() && !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'כתובת אימייל אינה תקינה' });
  }

  const users = db.collection('users');
  const existing = users.findOne(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'שם משתמש זה כבר קיים במערכת' });
  }

  const loginCode = generateLoginCode(cleanUsername, name);
  const plainPassword = password;
  const hashedPassword = hashPassword(plainPassword);

  const newTherapist = users.insertOne({
    name,
    username: cleanUsername,
    password: hashedPassword,
    email: email || '',
    phone: phone || '',
    title: title || 'מטפל/ת רגשי/ת',
    specialty: specialty || 'טיפול רגשי ממוקד',
    loginCode,
    role: 'therapist',
    active: true
  });

  const { password: _, ...safeData } = newTherapist;
  // Use env var instead of trusting req.headers.origin (prevents header injection/phishing)
  const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
  const loginUrl = `${clientAppUrl}/login/${loginCode}`;
  const crmUrl = `${clientAppUrl}/crm/${loginCode}`;

  const responseData = {
    ...safeData,
    loginCode,
    loginUrl: `/login/${loginCode}`,
    crmUrl: `/crm/${loginCode}`
  };

  // WhatsApp Automation: Auto-send invite with credentials to therapist
  const settings = db.getSettings();
  const shouldAutoSend = sendWhatsApp !== undefined 
    ? Boolean(sendWhatsApp) 
    : (settings.autoSendTherapistInviteWhatsApp !== false);

  let whatsappStatus = { sent: false };

  if (shouldAutoSend && phone && phone.trim()) {
    try {
      const template = settings.therapistInviteMessageTemplate || `שלום {{name}} יקר/ה,
הוגדר עבורך בהצלחה חשבון מטפל/ת אישי במערכת WiseCare 🌿

להלן פרטי הגישה האישיים שלך למערכת:
🔗 קישור כניסה ייחודי למרחב שלך:
{{loginUrl}}

👤 שם משתמש: {{username}}
🔑 סיסמה ראשונית: {{password}}

כתובת ישירה למרחב העבודה (CRM):
{{crmUrl}}

בברכה,
הנהלת המערכת WiseCare`;

      const message = template
        .replace(/{{name}}/g, name)
        .replace(/{{username}}/g, username)
        .replace(/{{password}}/g, password)
        .replace(/{{loginUrl}}/g, loginUrl)
        .replace(/{{crmUrl}}/g, crmUrl)
        .replace(/{{clinicName}}/g, settings.clinicName || 'WiseCare');

      await sendWhatsAppMessage({ phone, message });
      whatsappStatus = {
        sent: true,
        message,
        recipient: phone
      };
      console.log(`[Auto WhatsApp] Sent credentials to new therapist ${name} (${phone})`);
    } catch (waErr) {
      console.error('[Auto WhatsApp] Failed to auto-send to new therapist:', waErr.message);
      whatsappStatus = {
        sent: false,
        error: waErr.message,
        recipient: phone
      };
    }
  }

  res.status(201).json({
    ...responseData,
    therapist: responseData,
    whatsappStatus
  });
});

// Send login credentials and unique link via WhatsApp to therapist
router.post('/therapists/:id/send-invite-whatsapp', requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const { id } = req.params;
    const users = db.collection('users');
    const therapist = users.findById(id);

    if (!therapist || therapist.role !== 'therapist') {
      return res.status(404).json({ error: 'מטפל לא נמצא' });
    }

    if (!therapist.phone) {
      return res.status(400).json({ error: 'למטפל זה לא מוגדר מספר טלפון' });
    }

    // Ensure loginCode exists
    let loginCode = therapist.loginCode;
    if (!loginCode) {
      loginCode = generateLoginCode(therapist.username, therapist.name);
      users.updateById(therapist.id, { loginCode });
    }

    const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
    const loginFullUrl = `${clientAppUrl}/login/${loginCode}`;

    const message = `שלום ${therapist.name} יקר/ה,
הוגדר עבורך בהצלחה חשבון מטפל/ת אישי במערכת WiseCare 🌿

קישור הכניסה הייחודי והמאובטח למרחב הטיפולי שלך:
${loginFullUrl}

שם משתמש: ${therapist.username}
(יש להזין את הסיסמה שנקבעה עבורך בכניסה למערכת)

לכל שאלה או סיוע, צוות המערכת עומד לרשותך.
מאחלים לך עבודה פורייה ומעצימה! ✨`;

    const result = await sendWhatsAppMessage({ phone: therapist.phone, message });

    res.json({
      success: true,
      message: 'קישור ההתחברות ופרטי הגישה נשלחו בהצלחה בוואטסאפ למטפל',
      result
    });
  } catch (err) {
    console.error('Error sending therapist invite WhatsApp:', err);
    res.status(400).json({ error: err.message || 'שגיאה בשליחת וואטסאפ למטפל' });
  }
});

// Reset / Update therapist credentials with professional security & optional WhatsApp dispatch
router.put('/therapists/:id/credentials', requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, username, sendWhatsApp } = req.body;

    const users = db.collection('users');
    const target = users.findById(id);
    if (!target || target.role !== 'therapist') {
      return res.status(404).json({ error: 'מטפל לא נמצא' });
    }

    const updatePayload = {};

    if (username && username.trim() !== target.username) {
      const cleanUsername = username.trim();
      if (!isUsernameValid(cleanUsername)) {
        return res.status(400).json({ error: 'שם משתמש אינו תקין: יש להשתמש באותיות אנגלית, מספרים, נקודות או קווים תחתונים בלבד (לפחות 3 תווים).' });
      }
      const existing = users.findOne(u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== id);
      if (existing) {
        return res.status(400).json({ error: 'שם משתמש זה כבר קיים במערכת' });
      }
      updatePayload.username = cleanUsername;
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'סיסמה חייבת להכיל לפחות 8 תווים לרמת אבטחה מקצועית.' });
      }
      updatePayload.password = hashPassword(password);
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'לא סופקו פרטי גישה חדשים לעדכון' });
    }

    const updated = users.updateById(id, updatePayload);
    const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
    const loginFullUrl = `${clientAppUrl}/login/${target.loginCode}`;

    let whatsappStatus = { sent: false };

    if (sendWhatsApp && target.phone) {
      try {
        const message = `שלום ${target.name} יקר/ה,
לבקשתך עודכנו פרטי ההתחברות למרחב הטיפול האישי שלך במערכת WiseCare 🌿

🔗 קישור הכניסה האישי שלך:
${loginFullUrl}

👤 שם משתמש: ${updatePayload.username || target.username}
${password ? `🔑 סיסמה חדשה: ${password}` : ''}

לכל שאלה, הנהלת המערכת עומדת לרשותך!`;

        const waResult = await sendWhatsAppMessage({ phone: target.phone, message });
        whatsappStatus = { sent: true, result: waResult };
      } catch (waErr) {
        console.error('Error sending reset WhatsApp:', waErr);
        whatsappStatus = { sent: false, error: waErr.message };
      }
    }

    res.json({
      success: true,
      message: 'פרטי הגישה עודכנו בהצלחה',
      whatsappStatus,
      loginUrl: `/login/${target.loginCode}`
    });
  } catch (err) {
    console.error('[SuperAdmin Credentials Update Error]', err);
    res.status(500).json({ error: 'שגיאה בעדכון פרטי גישה. אנא נסה שוב.' });
  }
});

// Update therapist
router.put('/therapists/:id', requireAuth, requireSuperadmin, (req, res) => {
  const { id } = req.params;
  const users = db.collection('users');

  const target = users.findById(id);
  if (!target || target.role !== 'therapist') {
    return res.status(404).json({ error: 'מטפל לא נמצא' });
  }

  const allowedUpdates = ['name', 'email', 'phone', 'title', 'specialty', 'active', 'password'];
  const updateData = {};
  allowedUpdates.forEach(key => {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  });

  if (updateData.password) {
    updateData.password = hashPassword(updateData.password);
  }

  const updated = users.updateById(id, updateData);
  const { password: _, ...safeData } = updated;
  res.json(safeData);
});

// List all clients across the system (clinic clients + independent self-care clients)
router.get('/clients', requireAuth, requireSuperadmin, (req, res) => {
  try {
    const clientsCollection = db.collection('clients');
    const usersCollection = db.collection('users');
    const tasksCollection = db.collection('tasks');

    const allClients = clientsCollection.find().map(client => {
      let therapist = null;
      if (client.therapistId) {
        const t = usersCollection.findById(client.therapistId);
        if (t) {
          therapist = {
            id: t.id,
            name: t.name,
            title: t.title,
            loginCode: t.loginCode
          };
        }
      }

      const clientTasks = tasksCollection.find({ clientId: client.id });
      const completedTasks = clientTasks.filter(tsk => tsk.completed).length;

      const { password, ...safeClient } = client;
      return {
        ...safeClient,
        isSelfCare: Boolean(client.isSelfCare || !client.therapistId),
        therapist,
        tasksCount: clientTasks.length,
        completedTasksCount: completedTasks
      };
    });

    res.json(allClients);
  } catch (err) {
    console.error('[SuperAdmin Clients Error]', err);
    res.status(500).json({ error: 'שגיאה בטעינת רשימת הלקוחות' });
  }
});

// SuperAdmin direct client impersonation without password
router.post('/impersonate-client/:clientId', requireAuth, requireSuperadmin, (req, res) => {
  try {
    const { clientId } = req.params;
    const clients = db.collection('clients');
    
    // Find by ID or portalCode
    const client = clients.findOne(c => c.id === clientId || c.portalCode === clientId);
    if (!client) {
      return res.status(404).json({ error: 'הלקוח/המטופל המבוקש לא נמצא במערכת' });
    }

    // Sign a fresh, valid client session token directly for SuperAdmin without password check
    const token = signClientToken(client);

    res.json({
      success: true,
      message: `הונפקה גישת SuperAdmin למרחב הלקוח ${client.firstName || ''} ${client.lastName || ''}`,
      token,
      portalCode: client.portalCode,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        portalCode: client.portalCode,
        isSelfCare: Boolean(client.isSelfCare || !client.therapistId)
      }
    });
  } catch (err) {
    console.error('[SuperAdmin Client Impersonation Error]', err);
    res.status(500).json({ error: 'שגיאה בהנפקת גישת SuperAdmin למרחב הלקוח' });
  }
});

export default router;
