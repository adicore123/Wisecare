import { db } from '@/lib/db';
import { sendWhatsAppMessage } from './greenApi';
import { checkWhatsAppThrottle } from '@/lib/rateLimit';
import { generateJoinToken, clientRoom } from './livekit';
import { israelNow, minutesBetween } from '@/lib/israelTime';
import { getBaseUrl } from '@/lib/urlHelpers';
import { formatHebrewDateString } from './reminderScheduler';

/**
 * Scheduled video-calls engine.
 *
 * processScheduledCallsTick() is idempotent and safe to call from anywhere:
 *  - the CRM meetings screen poll (every 60s while a therapist is online)
 *  - the client-portal status poll (server-side throttled)
 *  - the daily Vercel cron (/api/cron/reminders)
 *
 * Responsibilities per tick:
 *  1. Same-day 07:00 WhatsApp reminders — to the client AND the therapist.
 *  2. At the appointed time (within a grace window): pre-create the live call
 *     with a secure /join link, WhatsApp the link to the client, and notify
 *     the therapist with a link to the meetings screen.
 *  3. Past the grace window without anyone online: mark as missed.
 */

const MORNING_REMINDER_TIME = '07:00';
const START_GRACE_MINUTES = 60;

// Module-level throttle so frequent pollers don't rescan constantly
let lastTickAt = 0;
const TICK_THROTTLE_MS = 45 * 1000;

export interface TickSummary {
  skipped?: boolean;
  remindersSent: number;
  callsStarted: number;
  missed: number;
  retriesQueued: number;
}

async function safeWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!phone) return false;
  const throttle = checkWhatsAppThrottle(phone);
  if (!throttle.allowed) return false;
  try {
    await sendWhatsAppMessage({ phone, message });
    return true;
  } catch (err) {
    console.error('[ScheduledCalls] WhatsApp failed:', (err as Error).message);
    return false;
  }
}

function firstName(fullName?: string): string {
  return (fullName || '').trim().split(/\s+/)[0] || '';
}

function crmMeetingsUrl(therapistLoginCode: string, baseUrl: string): string {
  return `${baseUrl}/crm/${encodeURIComponent(therapistLoginCode || '')}/meetings`;
}

/** Creates the live call for a due scheduled call and notifies both sides. */
async function startScheduledCall(
  sc: any,
  therapist: any,
  baseUrl: string
): Promise<'started' | 'skipped' | 'failed'> {
  const scheduledCalls = db.collection('scheduledCalls');
  const videoCalls = db.collection('videoCalls');

  // Claim the transition FIRST and only if still 'scheduled' — two concurrent
  // ticks (CRM poll + portal poll usually land on different lambdas) must not
  // both mint a join token and WhatsApp two different links.
  const fresh = scheduledCalls.findById(sc.id);
  if (!fresh || fresh.status !== 'scheduled') return 'skipped';
  scheduledCalls.updateOne({ id: sc.id }, { status: 'starting' });

  // Idempotency: reuse the call record from a previous attempt whose link send
  // failed — never create two live calls for the same scheduled call.
  const room = clientRoom(sc.clientId);
  const join = generateJoinToken();
  let call = videoCalls.findOne({ scheduledCallId: sc.id, status: 'active' }) as any;
  if (call) {
    videoCalls.updateById(call.id, {
      joinTokenHash: join.hash,
      startedAt: new Date().toISOString()
    });
    call = videoCalls.findById(call.id);
  } else {
    call = videoCalls.insertOne({
      therapistId: sc.therapistId,
      therapistName: sc.therapistName || therapist?.name || '',
      clientId: sc.clientId,
      clientName: sc.clientName,
      room,
      startedAt: new Date().toISOString(),
      status: 'active',
      startedBy: 'scheduled',
      scheduledCallId: sc.id,
      joinTokenHash: join.hash
    });
  }

  const joinUrl = `${baseUrl}/join/${call.id}/${join.token}`;

  // Client gets the join link (works with or without a personal space).
  // Mark 'started' only AFTER the link actually went out — a failed send
  // returns the call to 'scheduled' so the next tick retries with a fresh token.
  const clientNotified = await safeWhatsApp(
    sc.clientPhone,
    `שלום ${firstName(sc.clientName)} יקר/ה,\n🎥 הגיע הזמן לשיחת הווידאו שלך עם ${sc.therapistName || 'המטפל/ת'}!\nלהצטרפות לשיחה לחצ/י על הקישור:\n${joinUrl}\n\nבברכה,\nמרחב טיפולי WiseCare 🌿`
  );
  if (!clientNotified) {
    scheduledCalls.updateOne({ id: sc.id }, {
      status: sc.clientPhone ? 'scheduled' : 'failed',
      joinLinkError: sc.clientPhone ? 'whatsapp_send_failed' : 'client_has_no_phone'
    });
    return 'failed';
  }

  // Therapist gets a heads-up with a shortcut into the meetings screen
  if (therapist?.phone) {
    await safeWhatsApp(
      therapist.phone,
      `🕒 ${sc.clientName || 'המטופל/ת'} ממתין/ה לך לשיחת הווידאו שנקבעה.\nלכניסה למסך הפגישות והצטרפות לשיחה:\n${crmMeetingsUrl(therapist.loginCode, baseUrl)}`
    );
  }

  scheduledCalls.updateOne({ id: sc.id }, {
    status: 'started',
    videoCallId: call.id,
    joinLinkError: null
  });
  return 'started';
}

export async function processScheduledCallsTick(opts: { force?: boolean; baseUrl?: string } = {}): Promise<TickSummary> {
  const summary: TickSummary = { remindersSent: 0, callsStarted: 0, missed: 0, retriesQueued: 0 };

  if (!opts.force && Date.now() - lastTickAt < TICK_THROTTLE_MS) {
    return { ...summary, skipped: true };
  }
  lastTickAt = Date.now();

  try {
    await db.ensureLoaded();
    const now = israelNow();
    const baseUrl = opts.baseUrl || '';

    // Requeue calls stuck mid-start (a lambda that died between 'starting' and
    // 'started') so they are retried instead of hanging forever.
    const stuck = db.collection('scheduledCalls').find({ status: 'starting' });
    for (const sc of stuck as any[]) {
      const staleFor = sc.updatedAt ? Date.now() - new Date(sc.updatedAt).getTime() : Infinity;
      if (staleFor > 10 * 60 * 1000) {
        db.collection('scheduledCalls').updateOne({ id: sc.id }, { status: 'scheduled' });
        summary.retriesQueued++;
      }
    }

    const pending = db.collection('scheduledCalls').find({ status: 'scheduled' });
    for (const sc of pending) {
      const therapist = db.collection('users').findById(sc.therapistId) as any;
      const dueMinutes = minutesBetween(now.stamp, `${sc.date}T${sc.time}`);

      // 1) Same-day morning reminder (client + therapist) — only while the
      //    call is still in the future; once due, the join-link message below
      //    supersedes it (and the 10s WhatsApp throttle would eat it anyway).
      //    NOTE: dueMinutes = now − scheduled → negative means "still ahead".
      if (
        !sc.morningReminderSent &&
        sc.date === now.date &&
        now.time >= MORNING_REMINDER_TIME &&
        !isNaN(dueMinutes) && dueMinutes < 0
      ) {
        await safeWhatsApp(
          sc.clientPhone,
          `⏰ תזכורת: היום בשעה ${sc.time} נקבעה שיחת וידאו בינך לבין ${sc.therapistName || 'המטפל/ת'}.\nקישור ההצטרפות יישלח אלייך לכאן בשעה המיועדת.`
        );
        if (therapist?.phone) {
          await safeWhatsApp(
            therapist.phone,
            `⏰ תזכורת: היום בשעה ${sc.time} נקבעה לך שיחת וידאו עם ${sc.clientName || 'מטופל/ת'}.\nמסך הפגישות: ${crmMeetingsUrl(therapist.loginCode, baseUrl)}`
          );
        }
        db.collection('scheduledCalls').updateOne({ id: sc.id }, { morningReminderSent: true });
        summary.remindersSent++;
      }

      // 2) At the appointed time — start (or miss) the call
      if (!isNaN(dueMinutes) && dueMinutes >= 0) {
        if (dueMinutes <= START_GRACE_MINUTES) {
          const outcome = await startScheduledCall(sc, therapist, baseUrl);
          if (outcome === 'started') summary.callsStarted++;
        } else {
          db.collection('scheduledCalls').updateOne({ id: sc.id }, { status: 'missed' });
          summary.missed++;
        }
      }
    }

    await db.flush();
  } catch (err) {
    console.error('[ScheduledCalls] tick error:', err);
  }

  return summary;
}

/** WhatsApp confirmation sent immediately when a therapist books a scheduled call. */
export async function sendScheduledCallConfirmation(sc: any, baseUrl: string): Promise<boolean> {
  if (!sc.clientPhone) return false;
  const dateFormatted = (() => {
    try { return formatHebrewDateString(sc.date); } catch { return sc.date; }
  })();
  const portalLine = sc.clientHasPortal
    ? 'השיחה תמתין לך גם במרחב האישי שלך, וקישור ההצטרפות יישלח לכאן סמוך למועד.'
    : 'סמוך למועד השיחה יישלח אלייך לכאן קישור הצטרפות.';
  return safeWhatsApp(
    sc.clientPhone,
    `שלום ${firstName(sc.clientName)} יקר/ה,\n🎥 נקבעה עבורך שיחת וידאו עם ${sc.therapistName || 'המטפל/ת'}\n📅 מועד: ${dateFormatted}\n⏰ שעה: ${sc.time}\n${portalLine}\nתזכורת תישלח בבוקר יום השיחה.\n\nבברכה,\nמרחב טיפולי WiseCare 🌿`
  );
}

/** WhatsApp cancellation notice. */
export async function sendScheduledCallCancellation(sc: any): Promise<boolean> {
  if (!sc.clientPhone) return false;
  return safeWhatsApp(
    sc.clientPhone,
    `שלום ${firstName(sc.clientName)} יקר/ה,\nשיחת הווידאו שנקבעה לתאריך ${sc.date} בשעה ${sc.time} בוטלה.\nניתן לתאם מועד חדש עם ${sc.therapistName || 'המטפל/ת'}.\n\nמרחב טיפולי WiseCare 🌿`
  );
}
