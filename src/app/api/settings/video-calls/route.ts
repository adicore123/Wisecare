import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * Per-therapist toggle for the video-calls module.
 *
 * GET            → { enabled }   (absence of the flag = enabled)
 * PUT { enabled } → stores videoCallsEnabled on the therapist's user doc.
 *   Turning it off also closes the therapist's active calls, so client
 *   portals stop showing the join banner on their next poll.
 */
export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const user = db.collection('users').findById(auth.userId) as any;
    return NextResponse.json({ enabled: user?.videoCallsEnabled !== false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת הגדרת שיחות הווידאו';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const enabled = body.enabled === true;

    const users = db.collection('users');
    const user = users.findById(auth.userId) as any;
    if (!user) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
    }

    users.updateById(auth.userId, { videoCallsEnabled: enabled });

    if (!enabled) {
      const now = new Date();
      const active = db.collection('videoCalls').find({ therapistId: auth.userId, status: 'active' });
      for (const call of active) {
        const startedAt = call.startedAt ? new Date(call.startedAt) : now;
        db.collection('videoCalls').updateOne({ id: call.id }, {
          status: 'ended',
          endedAt: now.toISOString(),
          durationSec: Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000)),
          endReason: 'module_disabled'
        });
      }
    }

    await db.flush();
    return NextResponse.json({ enabled });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון הגדרת שיחות הווידאו';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
