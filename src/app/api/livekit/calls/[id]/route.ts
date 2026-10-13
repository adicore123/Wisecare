import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * DELETE /api/livekit/calls/{id}
 * Removes a call record from history (therapist owner or superadmin).
 * Active calls must be ended first — this keeps the "one live call" invariant honest.
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
    let call = db.collection('videoCalls').findById(id) as any;
    if (!call) {
      // Stale serverless snapshot — refresh from MongoDB before deciding
      await db.ensureLoaded(true).catch(() => false);
      call = db.collection('videoCalls').findById(id) as any;
    }
    if (!call) {
      return NextResponse.json({ success: true, alreadyDeleted: true, message: 'רישום השיחה כבר נמחק' });
    }
    const calls = db.collection('videoCalls');
    if (auth.role === 'therapist' && call.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין לך הרשאה למחוק רישום זה' }, { status: 403 });
    }
    if (call.status === 'active') {
      return NextResponse.json({ error: 'לא ניתן למחוק שיחה פעילה — יש לסיים אותה קודם' }, { status: 409 });
    }

    calls.deleteById(id);
    await db.flush();

    db.logAudit({
      actor: auth.username,
      actorRole: auth.role,
      action: 'delete_video_call_record',
      targetId: id,
      targetType: 'videoCall',
      details: { clientName: call.clientName, startedAt: call.startedAt }
    } as any);

    return NextResponse.json({ success: true, message: 'רישום השיחה נמחק' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה במחיקת רישום השיחה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
