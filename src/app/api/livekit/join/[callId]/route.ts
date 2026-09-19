import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { getLiveKitConfig, verifyJoinToken, mintLiveKitToken } from '@/services/livekit';

/**
 * POST /api/livekit/join/{callId}   body: { token }
 * Guest join for the per-call secure link /join/{callId}/{token}.
 *
 * Security model — the link IS the credential:
 *  - rate-limited per IP (brute-force protection on the 192-bit token)
 *  - token verified against the SHA-256 hash stored on the call record
 *  - a participant LiveKit token is minted ONLY while that exact call is active
 *  - works for clients with or without a personal portal
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ callId: string }> }
) {
  try {
    await db.ensureLoaded();
    const { callId } = await props.params;

    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
    const rate = checkRateLimit(`livekit-join:${ip}`, 10, 60);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'בוצעו יותר מדי ניסיונות הצטרפות — נסו שוב בעוד דקה' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter || 60) } }
      );
    }

    const config = getLiveKitConfig();
    if (!config.configured) {
      return NextResponse.json({ error: 'שירות הווידאו אינו זמין כרגע, נסו שוב מאוחר יותר' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '');
    if (!/^[0-9a-f]{48}$/.test(token)) {
      return NextResponse.json({ error: 'קישור הצטרפות שגוי' }, { status: 403 });
    }

    const call = db.collection('videoCalls').findById(callId) as any;
    if (!call) {
      return NextResponse.json({ error: 'קישור ההצטרפות אינו תקף או שפג תוקפו' }, { status: 404 });
    }
    if (call.status !== 'active') {
      return NextResponse.json({ error: 'השיחה כבר הסתיימה — ניתן לסגור את הדף' }, { status: 410 });
    }
    if (!call.joinTokenHash || !verifyJoinToken(token, call.joinTokenHash)) {
      return NextResponse.json({ error: 'קישור ההצטרפות שגוי' }, { status: 403 });
    }

    const participantToken = await mintLiveKitToken({
      room: call.room,
      identity: `client-${call.clientId}`,
      name: call.clientName || 'מטופל/ת',
      role: 'participant'
    });

    return NextResponse.json({
      success: true,
      callId: call.id,
      room: call.room,
      token: participantToken,
      url: config.url,
      therapistName: call.therapistName || ''
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בהצטרפות לשיחה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
