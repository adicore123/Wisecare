import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLiveKitConfig, clientRoom, mintLiveKitToken } from '@/services/livekit';

/**
 * POST /api/livekit/portal/{portalCode}/token
 * Issues a participant (client-side) LiveKit token for the client's currently
 * active call room — the client can only join while the therapist has an open call.
 */
export async function POST(
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

    const config = getLiveKitConfig();
    if (!config.configured) {
      return NextResponse.json(
        { error: 'שירות הווידאו אינו מוגדר כרגע — נסו שוב מאוחר יותר' },
        { status: 400 }
      );
    }

    const activeCall = db.collection('videoCalls').findOne({ clientId: client.id, status: 'active' }) as any;
    if (!activeCall) {
      return NextResponse.json(
        { error: 'אין שיחת וידאו פעילה כרגע. כאשר המטפל/ת שלך יתחיל/ה שיחה — היא תופיע כאן' },
        { status: 404 }
      );
    }

    const room = clientRoom(client.id);
    const token = await mintLiveKitToken({
      room,
      identity: `client-${client.id}`,
      name: client.firstName || 'מטופל/ת',
      role: 'participant'
    });

    return NextResponse.json({
      success: true,
      callId: activeCall.id,
      room,
      token,
      url: config.url,
      therapistName: activeCall.therapistName || ''
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בהצטרפות לשיחה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
