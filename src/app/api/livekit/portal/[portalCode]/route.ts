import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { getBaseUrl } from '@/lib/urlHelpers';
import { processScheduledCallsTick } from '@/services/scheduledCallScheduler';

/**
 * GET /api/livekit/portal/{portalCode}
 * Returns the client's currently active video call (if any) so the personal
 * space can show a "join now" banner. Requires the patient's portal session —
 * the portal code alone is a link, not a credential. Also opportunistically
 * drives the scheduled-calls engine (throttled server-side, bounded) — a
 * client sitting in their space keeps due scheduled calls flowing on time.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    // Opportunistic scheduled-calls tick (throttled + bounded, never blocks the poll)
    void Promise.race([
      processScheduledCallsTick({ baseUrl: getBaseUrl(request) }),
      new Promise((r) => setTimeout(r, 3000))
    ]).catch(() => {});

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }
    if ((client as any).portalEnabled === false) {
      return NextResponse.json({ error: 'המרחב האישי אינו פעיל' }, { status: 403 });
    }

    // The therapist can switch the whole video module off per practice
    const therapist = (client as any).therapistId
      ? db.collection('users').findById((client as any).therapistId) as any
      : null;
    if (therapist?.videoCallsEnabled === false) {
      return NextResponse.json({ videoEnabled: false, activeCall: null });
    }

    const activeCall = db.collection('videoCalls').findOne({ clientId: client.id, status: 'active' }) as any;

    return NextResponse.json({
      videoEnabled: true,
      activeCall: activeCall
        ? {
            id: activeCall.id,
            room: activeCall.room,
            startedAt: activeCall.startedAt,
            therapistName: activeCall.therapistName || ''
          }
        : null
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת מצב השיחה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
