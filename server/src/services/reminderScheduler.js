import { db } from '../db/db.js';
import { sendWhatsAppMessage } from './greenApi.js';

// Hebrew day names mapping
const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function formatHebrewDateString(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const dayName = HEBREW_DAYS[d.getDay()];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `יום ${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Build WhatsApp confirmation message for an appointment
 */
export function buildConfirmationMessage(appointment, therapistName, clinicName) {
  const dateFormatted = formatHebrewDateString(appointment.date);
  const typeText = appointment.typeName || (appointment.type === 'zoom' ? 'פגישת וידאו (Zoom)' : 'פגישה בקליניקה');
  const loc = appointment.location || clinicName || 'הקליניקה';

  return `שלום ${appointment.clientName} יקר/ה,
נקבעה ועודכנה עבורך פגישה טיפולית אישית:
📅 מועד: ${dateFormatted}
⏰ שעה: ${appointment.time} (משך: ${appointment.durationMinutes || 50} דקות)
📋 סוג פגישה: ${typeText}
📍 מיקום / פרטים: ${loc}
👩‍⚕️ מטפל/ת: ${therapistName || 'צוות הקליניקה'}

נשמח לראותך! 🌿
מרחב טיפולי ${clinicName || 'WiseCare'}`;
}

/**
 * Build WhatsApp reminder message for an appointment
 */
export function buildReminderMessage(appointment, therapistName, clinicName) {
  const dateFormatted = formatHebrewDateString(appointment.date);
  const typeText = appointment.typeName || (appointment.type === 'zoom' ? 'פגישת וידאו (Zoom)' : 'פגישה בקליניקה');
  const loc = appointment.location || clinicName || 'הקליניקה';

  return `שלום ${appointment.clientName} יקר/ה,
תזכורת חמה לקראת פגישתנו הקרובה:
📅 מועד: ${dateFormatted}
⏰ שעה: ${appointment.time}
📋 סוג פגישה: ${typeText}
📍 פרטים: ${loc}
👩‍⚕️ מטפל/ת: ${therapistName || 'צוות הקליניקה'}

מאחלים לך המשך יום רגוע ושקט, נשמח לראותך! 🌿
(במידה ויש צורך בשינוי מועד, ניתן לפנות ישירות בהודעה זו)`;
}

/**
 * Manually trigger confirmation message for an appointment
 */
export async function sendAppointmentConfirmation(appointmentId) {
  const apt = db.collection('appointments').findById(appointmentId);
  if (!apt) throw new Error('תור לא נמצא');
  if (!apt.clientPhone) throw new Error('ללקוח לא מוגדר מספר טלפון');

  const therapist = db.collection('users').findById(apt.therapistId) || { name: 'ד"ר שרה לוי' };
  const settings = db.getSettings();
  const clinicName = settings.clinicName || 'מרחב טיפולי WiseCare';

  const message = buildConfirmationMessage(apt, therapist.name, clinicName);
  const result = await sendWhatsAppMessage({ phone: apt.clientPhone, message });

  db.collection('appointments').updateById(appointmentId, {
    confirmationSent: true,
    confirmationSentAt: new Date().toISOString()
  });

  return result;
}

/**
 * Manually trigger reminder message for an appointment
 */
export async function sendAppointmentReminder(appointmentId) {
  const apt = db.collection('appointments').findById(appointmentId);
  if (!apt) throw new Error('תור לא נמצא');
  if (!apt.clientPhone) throw new Error('ללקוח לא מוגדר מספר טלפון');

  const therapist = db.collection('users').findById(apt.therapistId) || { name: 'ד"ר שרה לוי' };
  const settings = db.getSettings();
  const clinicName = settings.clinicName || 'מרחב טיפולי WiseCare';

  const message = buildReminderMessage(apt, therapist.name, clinicName);
  const result = await sendWhatsAppMessage({ phone: apt.clientPhone, message });

  db.collection('appointments').updateById(appointmentId, {
    reminderSent: true,
    reminderSentAt: new Date().toISOString()
  });

  return result;
}

/**
 * Scan appointments and send automatic 24h reminders
 */
export async function processAutomaticReminders() {
  try {
    const allAppointments = db.collection('appointments').find({ status: 'confirmed' });
    const now = new Date();
    const settings = db.getSettings();
    const clinicName = settings.clinicName || 'מרחב טיפולי WiseCare';

    // Look for appointments scheduled within the next 24-28 hours
    const minThreshold = new Date(now.getTime() + 1 * 60 * 60 * 1000); // at least 1 hour from now
    const maxThreshold = new Date(now.getTime() + 28 * 60 * 60 * 1000); // up to 28 hours from now

    for (const apt of allAppointments) {
      if (apt.reminderSent) continue;
      if (!apt.date || !apt.time || !apt.clientPhone) continue;

      try {
        const aptDateTime = new Date(`${apt.date}T${apt.time}:00`);
        if (isNaN(aptDateTime.getTime())) continue;

        if (aptDateTime >= minThreshold && aptDateTime <= maxThreshold) {
          console.log(`[Scheduler] Sending automated WhatsApp reminder for appointment ${apt.id} (${apt.clientName} at ${apt.date} ${apt.time})`);
          
          const therapist = db.collection('users').findById(apt.therapistId) || { name: 'צוות הקליניקה' };
          const message = buildReminderMessage(apt, therapist.name, clinicName);

          await sendWhatsAppMessage({ phone: apt.clientPhone, message });

          db.collection('appointments').updateById(apt.id, {
            reminderSent: true,
            reminderSentAt: new Date().toISOString(),
            reminderType: 'auto_24h'
          });

          console.log(`[Scheduler] Reminder sent successfully for ${apt.id}`);
        }
      } catch (err) {
        console.error(`[Scheduler] Failed reminder for ${apt.id}:`, err.message);
      }
    }
  } catch (outerErr) {
    console.error('[Scheduler] Error in automated reminder scanner:', outerErr);
  }
}

/**
 * Start the background scheduler (runs every 30 minutes)
 */
export function startReminderScheduler() {
  console.log('⏰ WiseCare Appointment Reminder Scheduler initialized');
  // Run once on startup (after 5 seconds to let server settle)
  setTimeout(() => {
    processAutomaticReminders();
  }, 5000);

  // Run every 30 minutes
  setInterval(() => {
    processAutomaticReminders();
  }, 30 * 60 * 1000);
}
