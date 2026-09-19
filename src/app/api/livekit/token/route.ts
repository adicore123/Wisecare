import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getLiveKitConfig, clientRoom, mintLiveKitToken, generateJoinToken } from '@/services/livekit';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';

/**
 * POST { clientId, sendWhatsApp? }
 * Starts (or restarts) a 1-on-1 video call with a client:
 *  - closes any previous active call for this client
 *  - logs a new "Video Call Started" record in `videoCalls`
 *  - returns a host (therapist) LiveKit access token for room customer_{clientId}
 */
export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    // Per-therapist module switch (Settings → שיחות וידאו)
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
        { error: `שירות הווידאו (LiveKit) אינו מוגדר — חסרים בסביבה: ${config.missing.join(', ')}. יש להוסיף אותם לקובץ .env.local` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const clientId = String(body.clientId || '').trim();
    const sendWhatsApp = body.sendWhatsApp !== false;

    if (!clientId) {
      return NextResponse.json({ error: 'נדרש מזהה מטופל' }, { status: 400 });
    }

    const client = db.collection('clients').findById(clientId);
    if (!client || client.archived) {
      return NextResponse.json({ error: 'המטופל לא נמצא' }, { status: 404 });
    }
    if (client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'המטופל אינו משויך אליך' }, { status: 403 });
    }

    // Close any stale active call for this client so the new one is the single truth
    const now = new Date();
    const activeCalls = db.collection('videoCalls').find({ clientId: client.id, status: 'active' });
    for (const stale of activeCalls) {
      const startedAt = stale.startedAt ? new Date(stale.startedAt) : now;
      const durationSec = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
      db.collection('videoCalls').updateOne({ id: stale.id }, {
        status: 'ended',
        endedAt: now.toISOString(),
        durationSec,
        endReason: 'restarted'
      });
    }

    const therapist = db.collection('users').findById(auth.userId);
    const room = clientRoom(client.id);
    const startedAt = now.toISOString();

    // Per-call secure join link: raw token goes only to the therapist response
    // (WhatsApp message / copy button); the DB keeps its SHA-256 hash alone.
    const join = generateJoinToken();

    // The "Video Call Started" event
    const call = db.collection('videoCalls').insertOne({
      therapistId: auth.userId,
      therapistName: therapist?.name || '',
      clientId: client.id,
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      room,
      startedAt,
      status: 'active',
      startedBy: 'therapist',
      joinTokenHash: join.hash
    });

    const token = await mintLiveKitToken({
      room,
      identity: `therapist-${auth.userId}`,
      name: therapist?.name || 'מטפל/ת',
      role: 'host'
    });

    const joinPath = `/join/${call.id}/${join.token}`;

    // Optional WhatsApp invite with the client-side join link
    let whatsappSent = false;
    if (sendWhatsApp && client.phone) {
      try {
        const joinUrl = `${getBaseUrl(request)}${joinPath}`;
        const firstName = client.firstName || '';
        await sendWhatsAppMessage({
          phone: client.phone,
          message: `שלום ${firstName} יקר/ה,\n🎥 נפתחה שיחת וידאו עם ${therapist?.name || 'המטפל/ת'}\nלהצטרפות לשיחה לחצ/י על הקישור:\n${joinUrl}\n\nבברכה,\nמרחב טיפולי WiseCare 🌿`
        });
        whatsappSent = true;
      } catch (waErr: any) {
        console.error('[LiveKit] invite WhatsApp failed:', waErr.message);
      }
    }

    await db.flush();

    return NextResponse.json({
      success: true,
      callId: call.id,
      room,
      token,
      url: config.url,
      joinUrl: joinPath,
      whatsappSent,
      message: whatsappSent
        ? 'השיחה נפתחה וקישור הצטרפות נשלח למטופל בוואטסאפ'
        : 'השיחה נפתחה'
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בפתיחת שיחת הווידאו';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
