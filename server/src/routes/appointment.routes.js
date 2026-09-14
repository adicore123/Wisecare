import express from 'express';
import { db } from '../db/db.js';
import { 
  sendAppointmentReminder, 
  sendAppointmentConfirmation,
  formatHebrewDateString 
} from '../services/reminderScheduler.js';
import { requireAuth, requireTherapist } from '../middleware/auth.middleware.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

const whatsappSendLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,               // max 10 WhatsApp sends per minute per IP
  message: { error: 'יותר מדי שליחות וואטסאפ. אנא נסה שוב בעוד דקה.' }
});


/**
 * GET /api/appointments
 * List appointments with optional filters: therapistId, clientId, status, date
 */
router.get('/', requireAuth, requireTherapist, (req, res) => {
  try {
    const { therapistId, clientId, status, date } = req.query;
    let appointments = db.collection('appointments').find();

    if (therapistId) {
      appointments = appointments.filter(a => a.therapistId === therapistId);
    }
    if (clientId) {
      appointments = appointments.filter(a => a.clientId === clientId);
    }
    if (status && status !== 'all') {
      appointments = appointments.filter(a => a.status === status);
    }
    if (date) {
      appointments = appointments.filter(a => a.date === date);
    }

    // Sort: upcoming dates first, then by time
    appointments.sort((a, b) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });

    res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'שגיאה בשליפת תורים' });
  }
});

/**
 * GET /api/appointments/:id
 */
router.get('/:id', requireAuth, requireTherapist, (req, res) => {
  try {
    const appointment = db.collection('appointments').findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'תור לא נמצא' });
    }
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת פרטי התור' });
  }
});

/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post('/', requireAuth, requireTherapist, async (req, res) => {
  try {
    const {
      clientId,
      therapistId = 'therapist-1',
      date,
      time,
      durationMinutes = 50,
      type = 'in_person',
      typeName,
      location,
      notes = '',
      status = 'confirmed',
      sendWhatsApp = true
    } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'חובה לבחור לקוח' });
    }
    if (!date || !time) {
      return res.status(400).json({ error: 'חובה לציין תאריך ושעת פגישה' });
    }

    const client = db.collection('clients').findById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'לקוח לא נמצא' });
    }

    const settings = db.getSettings();
    const defaultLocation = settings.clinicName || 'רחוב רוטשילד 45, תל אביב';

    const newAppointment = db.collection('appointments').insertOne({
      therapistId,
      clientId,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      clientPhone: client.phone,
      portalCode: client.portalCode,
      date,
      time,
      durationMinutes: Number(durationMinutes) || 50,
      type,
      typeName: typeName || (type === 'zoom' ? 'פגישת וידאו (Zoom)' : type === 'phone' ? 'שיחה טלפונית' : 'פגישה בקליניקה'),
      location: location || (type === 'in_person' ? defaultLocation : type === 'zoom' ? 'קישור Zoom יישלח לפני הפגישה' : 'שיחה טלפונית'),
      status, // 'confirmed', 'pending', 'cancelled', 'completed'
      notes,
      requestedBy: 'therapist',
      reminderSent: false,
      reminderSentAt: null,
      confirmationSent: false,
      confirmationSentAt: null
    });

    let whatsAppResult = null;
    let whatsAppError = null;

    if (sendWhatsApp && status === 'confirmed' && client.phone) {
      try {
        whatsAppResult = await sendAppointmentConfirmation(newAppointment.id);
      } catch (waErr) {
        console.warn('WhatsApp confirmation warning:', waErr.message);
        whatsAppError = waErr.message;
      }
    }

    res.status(201).json({
      ...newAppointment,
      whatsAppSent: !!whatsAppResult,
      whatsAppError
    });
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'שגיאה ביצירת תור חדש. אנא נסה שוב.' });
  }
});

/**
 * PUT /api/appointments/:id
 * Update appointment details or status
 */
router.put('/:id', requireAuth, requireTherapist, async (req, res) => {
  try {
    const existing = db.collection('appointments').findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'תור לא נמצא' });
    }

    const {
      date,
      time,
      durationMinutes,
      type,
      typeName,
      location,
      status,
      notes,
      sendWhatsAppNotification
    } = req.body;

    const updates = {};
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (durationMinutes !== undefined) updates.durationMinutes = Number(durationMinutes);
    if (type !== undefined) updates.type = type;
    if (typeName !== undefined) updates.typeName = typeName;
    if (location !== undefined) updates.location = location;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const updated = db.collection('appointments').updateById(req.params.id, updates);

    let whatsAppSent = false;
    let whatsAppError = null;

    // If appointment is newly confirmed or updated and notification requested
    if (sendWhatsAppNotification && updates.status === 'confirmed' && updated.clientPhone) {
      try {
        await sendAppointmentConfirmation(req.params.id);
        whatsAppSent = true;
      } catch (waErr) {
        whatsAppError = waErr.message;
      }
    }

    res.json({
      ...updated,
      whatsAppSent,
      whatsAppError
    });
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'שגיאה בעדכון התור' });
  }
});

/**
 * DELETE /api/appointments/:id
 */
router.delete('/:id', requireAuth, requireTherapist, (req, res) => {
  try {
    const deleted = db.collection('appointments').deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'תור לא נמצא' });
    }
    res.json({ success: true, message: 'התור נמחק בהצלחה' });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת התור' });
  }
});

/**
 * POST /api/appointments/:id/send-reminder
 * Manually trigger WhatsApp reminder
 */
router.post('/:id/send-reminder', requireAuth, requireTherapist, whatsappSendLimiter, async (req, res) => {
  try {
    const result = await sendAppointmentReminder(req.params.id);
    res.json({ success: true, message: 'תזכורת WhatsApp נשלחה בהצלחה', result });
  } catch (err) {
    console.error('Error sending appointment reminder:', err);
    res.status(400).json({ error: err.message || 'שגיאה בשליחת תזכורת WhatsApp' });
  }
});

/**
 * POST /api/appointments/:id/send-confirmation
 * Manually trigger WhatsApp confirmation
 */
router.post('/:id/send-confirmation', requireAuth, requireTherapist, whatsappSendLimiter, async (req, res) => {
  try {
    const result = await sendAppointmentConfirmation(req.params.id);
    res.json({ success: true, message: 'אישור פגישה נשלח בהצלחה בוואטסאפ', result });
  } catch (err) {
    console.error('Error sending appointment confirmation:', err);
    res.status(400).json({ error: err.message || 'שגיאה בשליחת אישור פגישה' });
  }
});

export default router;
