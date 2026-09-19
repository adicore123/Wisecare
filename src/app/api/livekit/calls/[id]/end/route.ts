import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * POST — marks a video call as ended and records end time + duration.
 * Called from the call UI's onDisconnected handler (therapist or client side).
 * Server computes the duration from startedAt so both sides agree; the optional
 * body durationSec is only a fallback for calls whose startedAt is missing.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const { id } = await props.params;

    const call = db.collection('videoCalls').findById(id);
    if (!call) {
      return NextResponse.json({ error: 'השיחה לא נמצאה' }, { status: 404 });
    }

    // Either the owning therapist or any authenticated therapist of the system may close;
    // portal clients close through their own portal route (they lack a wisecare token).
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }
    if (call.therapistId !== auth.userId && auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'השיחה אינה משויכת אליך' }, { status: 403 });
    }

    // Idempotent — a second disconnect event (tab close + button) must not corrupt the record
    if (call.status === 'ended' && call.endedAt) {
      return NextResponse.json({ success: true, alreadyEnded: true, durationSec: call.durationSec ?? null });
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const startedAt = call.startedAt ? new Date(call.startedAt) : null;
    const durationSec = startedAt
      ? Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000))
      : (Number(body.durationSec) || null);

    db.collection('videoCalls').updateOne({ id: call.id }, {
      status: 'ended',
      endedAt: now.toISOString(),
      durationSec
    });
    await db.flush();

    return NextResponse.json({ success: true, endedAt: now.toISOString(), durationSec });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בסיום השיחה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
