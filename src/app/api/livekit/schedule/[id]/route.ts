import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendScheduledCallCancellation } from '@/services/scheduledCallScheduler';

/**
 * DELETE /api/livekit/schedule/{id}
 * Cancels a scheduled call and notifies the client on WhatsApp.
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const schedule = db.collection('scheduledCalls').findById(id) as any;
    if (!schedule) {
      return NextResponse.json({ error: 'השיחה המתוכננת לא נמצאה' }, { status: 404 });
    }
    if (schedule.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין לך הרשאה לבטל שיחה זו' }, { status: 403 });
    }
    if (schedule.status !== 'scheduled') {
      return NextResponse.json({ error: 'ניתן לבטל רק שיחה מתוכננת שטרם החלה' }, { status: 400 });
    }

    db.collection('scheduledCalls').updateOne({ id: schedule.id }, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });

    let whatsappSent = false;
    try {
      whatsappSent = await sendScheduledCallCancellation(schedule);
    } catch (waErr: any) {
      console.error('[ScheduledCalls] cancellation WhatsApp failed:', waErr.message);
    }

    await db.flush();

    return NextResponse.json({
      success: true,
      whatsappSent,
      message: whatsappSent ? 'השיחה בוטלה והודעה נשלחה למטופל' : 'השיחה בוטלה'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בביטול השיחה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
