import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getLiveKitConfig } from '@/services/livekit';
import { getBaseUrl } from '@/lib/urlHelpers';
import { isValidScheduleDateTime, israelNow, minutesBetween } from '@/lib/israelTime';
import {
  processScheduledCallsTick,
  sendScheduledCallConfirmation
} from '@/services/scheduledCallScheduler';

/**
 * GET /api/livekit/schedule
 * The therapist's scheduled video calls + any auto-started call waiting for
 * the host to join. Also drives the scheduler tick (throttled server-side) —
 * this is what gives minute-level precision while the meetings screen is open.
 */
export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    // Opportunistic scheduler tick (throttled + bounded so the poll stays snappy)
    void Promise.race([
      processScheduledCallsTick({ baseUrl: getBaseUrl(request) }),
      new Promise((r) => setTimeout(r, 3500))
    ]).catch(() => {});

    const schedules = db.collection('scheduledCalls')
      .find({ therapistId: auth.userId })
      .sort((a: any, b: any) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
      .slice(0, 60);

    // A scheduled call the engine already opened — surface it for the "join now" banner
    const pendingCall = db.collection('videoCalls').findOne({
      therapistId: auth.userId,
      status: 'active',
      startedBy: 'scheduled'
    }) as any;

    return NextResponse.json({
      schedules,
      pendingCall: pendingCall
        ? { id: pendingCall.id, clientName: pendingCall.clientName, startedAt: pendingCall.startedAt }
        : null
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת השיחות המתוכננות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/livekit/schedule  { clientId, date, time, notes? }
 * Books a scheduled video call and immediately sends the client a WhatsApp
 * confirmation (when a phone is set).
 */
export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const self = db.collection('users').findById(auth.userId) as any;
    if (self?.videoCallsEnabled === false) {
      return NextResponse.json(
        { error: 'מודול שיחות הווידאו כבוי בהגדרות. ניתן להפעיל אותו ממסך ההגדרות של המטפל/ת.' },
        { status: 403 }
      );
    }

    const config = getLiveKitConfig();
    if (!config.configured) {
      return NextResponse.json(
        { error: `שירות הווידאו (LiveKit) אינו מוגדר — חסרים בסביבה: ${config.missing.join(', ')}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const clientId = String(body.clientId || '').trim();
    const date = String(body.date || '').trim();
    const time = String(body.time || '').trim();
    const notes = String(body.notes || '').trim().slice(0, 300);

    if (!clientId) {
      return NextResponse.json({ error: 'נדרש מזהה מטופל' }, { status: 400 });
    }
    if (!isValidScheduleDateTime(date, time)) {
      return NextResponse.json({ error: 'נדרשים תאריך (YYYY-MM-DD) ושעה (HH:mm) תקינים' }, { status: 400 });
    }
    const now = israelNow();
    if (minutesBetween(`${date}T${time}`, now.stamp) <= 0) {
      return NextResponse.json({ error: 'לא ניתן לקבוע שיחה בזמן שכבר עבר' }, { status: 400 });
    }

    const client = db.collection('clients').findById(clientId) as any;
    if (!client || client.archived) {
      return NextResponse.json({ error: 'המטופל לא נמצא' }, { status: 404 });
    }
    if (client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'המטופל אינו משויך אליך' }, { status: 403 });
    }

    const therapist = db.collection('users').findById(auth.userId) as any;
    const schedule = db.collection('scheduledCalls').insertOne({
      therapistId: auth.userId,
      therapistName: therapist?.name || '',
      clientId: client.id,
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      clientPhone: client.phone || '',
      clientHasPortal: client.portalEnabled !== false,
      date,
      time,
      notes,
      status: 'scheduled',
      morningReminderSent: false,
      videoCallId: null,
      createdAt: new Date().toISOString()
    });

    let whatsappSent = false;
    try {
      whatsappSent = await sendScheduledCallConfirmation(schedule, getBaseUrl(request));
    } catch (waErr: any) {
      console.error('[ScheduledCalls] confirmation WhatsApp failed:', waErr.message);
    }

    await db.flush();

    return NextResponse.json({
      success: true,
      schedule,
      whatsappSent,
      message: whatsappSent
        ? 'השיחה נקבעה ואישור נשלח למטופל בוואטסאפ'
        : 'השיחה נקבעה'
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בקביעת השיחה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
