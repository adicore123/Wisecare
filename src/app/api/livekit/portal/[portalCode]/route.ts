import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/livekit/portal/{portalCode}
 * Returns the client's currently active video call (if any) so the personal
 * space can show a "join now" banner. Follows the portal routes' portalCode
 * auth model (the unguessable code IS the credential).
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }
    if ((client as any).portalEnabled === false) {
      return NextResponse.json({ error: 'המרחב האישי אינו פעיל' }, { status: 403 });
    }

    const activeCall = db.collection('videoCalls').findOne({ clientId: client.id, status: 'active' }) as any;

    return NextResponse.json({
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
