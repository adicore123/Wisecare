import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendScheduledCallCancellation } from '@/services/scheduledCallScheduler';

/**
 * DELETE /api/livekit/schedule/{id}
 * - status 'scheduled' → cancel (WhatsApp notice to the client) and keep the record
 * - any other status (cancelled / started / missed) → purge the record entirely
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

    if (schedule.status === 'scheduled') {
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
    }

    // Non-scheduled records (cancelled / started / missed) — remove outright
    db.collection('scheduledCalls').deleteById(schedule.id);
    await db.flush();

    db.logAudit({
      actor: auth.username,
      actorRole: auth.role,
      action: 'delete_scheduled_call_record',
      targetId: schedule.id,
      targetType: 'scheduledCall',
      details: { clientName: schedule.clientName, date: schedule.date, time: schedule.time, status: schedule.status }
    } as any);

    return NextResponse.json({ success: true, message: 'הרישום נמחק' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בביטול השיחה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
