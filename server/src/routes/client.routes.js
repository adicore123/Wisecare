import express from 'express';
import { db } from '../db/db.js';
import { sendWhatsAppMessage } from '../services/greenApi.js';
import crypto from 'crypto';
import { requireAuth, requireTherapist } from '../middleware/auth.middleware.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

const whatsappClientLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'יותר מדי שליחות WhatsApp. אנא נסה שוב בעוד דקה.' }
});

// Helper to generate readable short portal code with crypto randomness
function generatePortalCode(firstName) {
  const cleanName = (firstName || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'client';
  const randomNum = crypto.randomInt(100000, 999999);
  return `${cleanName}-${randomNum}`;
}

// Generate 4-digit PIN with crypto randomness
function generatePin() {
  return crypto.randomInt(1000, 9999).toString();
}

// List clients (filtered by therapistId if provided, or all if superadmin)
router.get('/', requireAuth, requireTherapist, (req, res) => {
  const therapistId = req.query.therapistId;
  const clientsCollection = db.collection('clients');
  const tasksCollection = db.collection('tasks');

  const filter = therapistId ? { therapistId } : {};
  const clientsList = clientsCollection.find(filter);

  // Enrich with tasks count
  const enriched = clientsList.map(c => {
    const clientTasks = tasksCollection.find({ clientId: c.id });
    const completedTasks = clientTasks.filter(t => t.completed).length;
    return {
      ...c,
      tasksTotal: clientTasks.length,
      tasksCompleted: completedTasks,
      tasksPending: clientTasks.length - completedTasks
    };
  });

  res.json(enriched);
});

// Get single client with tasks and therapist info
router.get('/:id', requireAuth, requireTherapist, (req, res) => {
  const { id } = req.params;
  const client = db.collection('clients').findById(id);

  if (!client) {
    return res.status(404).json({ error: 'לקוח לא נמצא' });
  }

  const therapist = db.collection('users').findById(client.therapistId);
  const tasks = db.collection('tasks').find({ clientId: client.id });
  const insights = db.collection('insights').find({ clientId: client.id });
  insights.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    client,
    therapist: therapist ? {
      name: therapist.name,
      title: therapist.title,
      phone: therapist.phone,
      email: therapist.email
    } : null,
    tasks,
    insights
  });
});

// Create new client
router.post('/', requireAuth, requireTherapist, async (req, res) => {
  const {
    therapistId,
    firstName,
    lastName,
    phone,
    age,
    gender,
    notes,
    sendWhatsAppNow
  } = req.body;

  if (!firstName || !lastName || !phone) {
    return res.status(400).json({ error: 'שם פרטי, שם משפחה ומספר טלפון הינם שדות חובה' });
  }

  if (!therapistId) {
    return res.status(400).json({ error: 'חסר מזהה מטפל (therapistId)' });
  }

  const clients = db.collection('clients');
  const users = db.collection('users');
  const therapist = users.findById(therapistId);

  const portalCode = generatePortalCode(firstName);
  const pin = generatePin();

  const newClient = clients.insertOne({
    therapistId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone.trim(),
    age: Number(age) || null,
    gender: gender || 'זכר',
    notes: notes ? notes.trim() : '',
    portalCode,
    pin,
    whatsappStatus: 'not_sent',
    lastSentAt: null
  });

  let whatsappResult = null;

  // If user requested to send WhatsApp now
  if (sendWhatsAppNow) {
    try {
      const settings = db.getSettings();
      const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
      const portalUrl = `${clientAppUrl}/portal/${portalCode}`;

      let message = settings.defaultMessageTemplate ||
        'שלום {{firstName}},\nנפתח עבורך המרחב האישי המאובטח להמשך תרגול ומשימות טיפוליות עם {{therapistName}}.\n\nלכניסה ישירה:\n{{portalUrl}}\nקוד גישה: {{pin}}';

      message = message
        .replace(/{{firstName}}/g, newClient.firstName)
        .replace(/{{lastName}}/g, newClient.lastName)
        .replace(/{{therapistName}}/g, therapist ? therapist.name : 'המטפל/ת שלך')
        .replace(/{{portalUrl}}/g, portalUrl)
        .replace(/{{pin}}/g, pin);

      whatsappResult = await sendWhatsAppMessage({
        phone: newClient.phone,
        message
      });

      // Update client status
      clients.updateById(newClient.id, {
        whatsappStatus: 'sent',
        lastSentAt: new Date().toISOString()
      });
      newClient.whatsappStatus = 'sent';
      newClient.lastSentAt = new Date().toISOString();
    } catch (err) {
      console.error('Error sending WhatsApp message on creation:', err.message);
      whatsappResult = {
        success: false,
        error: err.message
      };
      clients.updateById(newClient.id, {
        whatsappStatus: 'failed',
        whatsappError: err.message
      });
    }
  }

  res.status(201).json({
    client: newClient,
    whatsappResult
  });
});

// Update client
router.put('/:id', requireAuth, requireTherapist, (req, res) => {
  const { id } = req.params;
  const clients = db.collection('clients');

  const existing = clients.findById(id);
  if (!existing) {
    return res.status(404).json({ error: 'לקוח לא נמצא' });
  }

  const allowedFields = ['firstName', 'lastName', 'phone', 'age', 'gender', 'notes', 'pin'];
  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const updated = clients.updateById(id, updateData);
  res.json(updated);
});

// Delete client (and all their associated tasks)
router.delete('/:id', requireAuth, requireTherapist, (req, res) => {
  const { id } = req.params;
  const clients = db.collection('clients');
  const tasks = db.collection('tasks');
  const contentAssignments = db.collection('contentAssignments');

  const client = clients.findById(id);
  if (!client) {
    return res.status(404).json({ error: 'לקוח לא נמצא' });
  }

  // Delete all tasks for this client
  const clientTasks = tasks.find({ clientId: id });
  clientTasks.forEach(t => tasks.deleteById(t.id));

  // Revoke every content assignment owned by the deleted client.
  const clientContentAssignments = contentAssignments.find({ clientId: id });
  clientContentAssignments.forEach(assignment => contentAssignments.deleteById(assignment.id));

  clients.deleteById(id);
  res.json({ message: 'לקוח וכלל המשימות המשויכות נמחקו בהצלחה' });
});

// Send WhatsApp invitation on-demand
router.post('/:id/send-whatsapp', requireAuth, requireTherapist, whatsappClientLimiter, async (req, res) => {
  const { id } = req.params;
  const { customMessage } = req.body;
  const clients = db.collection('clients');
  const users = db.collection('users');

  const client = clients.findById(id);
  if (!client) {
    return res.status(404).json({ error: 'לקוח לא נמצא' });
  }

  const therapist = users.findById(client.therapistId);
  const settings = db.getSettings();
  const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
  const portalUrl = `${clientAppUrl}/portal/${client.portalCode}`;

  let message = customMessage;
  if (!message) {
    message = settings.defaultMessageTemplate ||
      'שלום {{firstName}},\nנפתח עבורך המרחב האישי המאובטח להמשך תרגול ומשימות טיפוליות עם {{therapistName}}.\n\nלכניסה ישירה:\n{{portalUrl}}\nקוד גישה: {{pin}}';

    message = message
      .replace(/{{firstName}}/g, client.firstName)
      .replace(/{{lastName}}/g, client.lastName)
      .replace(/{{therapistName}}/g, therapist ? therapist.name : 'המטפל/ת שלך')
      .replace(/{{portalUrl}}/g, portalUrl)
      .replace(/{{pin}}/g, client.pin);
  }

  try {
    const result = await sendWhatsAppMessage({
      phone: client.phone,
      message
    });

    clients.updateById(client.id, {
      whatsappStatus: 'sent',
      lastSentAt: new Date().toISOString()
    });

    res.json({
      success: true,
      result,
      message: 'הודעת וואטסאפ נשלחה בהצלחה'
    });
  } catch (err) {
    console.error('[Client WhatsApp Error]', err);
    clients.updateById(client.id, {
      whatsappStatus: 'failed',
      whatsappError: err.message
    });
    res.status(500).json({
      success: false,
      error: 'אירעה שגיאה בשליחת הודעת WhatsApp. אנא נסה/י שוב מאוחר יותר.'
    });
  }
});

export default router;
