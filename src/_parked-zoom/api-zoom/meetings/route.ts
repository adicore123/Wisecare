import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isZoomS2SConfigured, isUserZoomConnected, createZoomMeeting } from '@/services/zoom';
import { sendAppointmentConfirmation } from '@/services/reminderScheduler';

export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const all = db.collection('appointments')
      .find({ therapistId: auth.userId })
      .filter((a: any) => a.type === 'zoom' && a.status !== 'cancelled')
      .sort((a: any, b: any) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

    return NextResponse.json(all);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת פגישות הזום';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    if (!isZoomS2SConfigured() && !isUserZoomConnected(auth.userId)) {
      return NextResponse.json({ error: 'חשבון הזום עדיין לא מחובר — יש להזין את פרטי החיבור בהגדרת המערכת למעלה' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const clientId = String(body.clientId || '').trim();
    const date = String(body.date || '').trim();
    const time = String(body.time || '').trim();
    const durationMinutes = Number(body.durationMinutes) || 50;
    const notes = String(body.notes || '').trim();
    const sendWhatsApp = body.sendWhatsApp !== false;

    if (!clientId || !date || !time) {
      return NextResponse.json({ error: 'נדרשים לקוח, תאריך ושעה' }, { status: 400 });
    }

    const client = db.collection('clients').findById(clientId);
    if (!client || client.archived) {
      return NextResponse.json({ error: 'הלקוח לא נמצא' }, { status: 404 });
    }
    if (client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'הלקוח אינו משויך אליך' }, { status: 403 });
    }

    // 1. Create the real Zoom meeting on the therapist's own account
    const meeting = await createZoomMeeting(auth.userId, {
      topic: `טיפול — ${client.firstName} ${client.lastName || ''}`.trim(),
      date,
      time,
      durationMinutes,
      agenda: notes || 'מפגש טיפולי דרך WiseCare'
    });

    // 2. Create the appointment linked to it
    const therapist = db.collection('users').findById(auth.userId);
    const appointment = db.collection('appointments').insertOne({
      therapistId: auth.userId,
      clientId: client.id,
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      clientPhone: client.phone || '',
      date,
      time,
      durationMinutes,
      type: 'zoom',
      typeName: 'פגישת וידאו (Zoom)',
      location: meeting.joinUrl,
      notes,
      status: 'confirmed',
      zoomMeetingId: meeting.meetingId,
      joinUrl: meeting.joinUrl,
      startUrl: meeting.startUrl,
      passcode: meeting.passcode,
      requestedBy: 'therapist',
      sendWhatsApp
    });

    // 3. WhatsApp confirmation with the join link
    let whatsappSent = false;
    if (sendWhatsApp && client.phone) {
      try {
        await sendAppointmentConfirmation(appointment.id);
        whatsappSent = true;
      } catch (waErr: any) {
        console.error('[Zoom] confirmation WhatsApp failed:', waErr.message);
      }
    }

    await db.flush();

    return NextResponse.json({
      success: true,
      appointment,
      meeting: { meetingId: meeting.meetingId, joinUrl: meeting.joinUrl },
      whatsappSent,
      message: whatsappSent
        ? 'פגישת הזום נוצרה והקישור נשלח בוואטסאפ ללקוח'
        : 'פגישת הזום נוצרה. שליחת הוואטסאפ נכשלה — ניתן להעתיק את הקישור ידנית'
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת פגישת הזום';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
