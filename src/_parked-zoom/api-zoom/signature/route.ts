import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest, getClientAuthFromRequest } from '@/lib/auth';
import { generateSdkSignature } from '@/services/zoom';

/**
 * Meeting SDK signature for embedding a Zoom meeting inside WiseCare.
 * - Therapist token → role 1 (host)
 * - Client portal token → role 0 (attendee); the appointment must belong to that client
 */
export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const body = await request.json().catch(() => ({}));
    const appointmentId = String(body.appointmentId || '').trim();
    if (!appointmentId) {
      return NextResponse.json({ error: 'חסר מזהה פגישה' }, { status: 400 });
    }

    const apt = db.collection('appointments').findById(appointmentId);
    if (!apt) {
      return NextResponse.json({ error: 'הפגישה לא נמצאה' }, { status: 404 });
    }
    if (!apt.zoomMeetingId) {
      return NextResponse.json({ error: 'לפגישה זו אין חדר זום מקושר' }, { status: 400 });
    }

    const therapistAuth = getAuthFromRequest(request);
    const clientAuth = getClientAuthFromRequest(request);

    let role: 0 | 1;
    if (therapistAuth && (therapistAuth.role === 'therapist' || therapistAuth.role === 'superadmin')) {
      role = 1;
    } else if (clientAuth && clientAuth.clientId === apt.clientId) {
      role = 0;
    } else {
      return NextResponse.json({ error: 'אין הרשאה להצטרף לפגישה זו' }, { status: 403 });
    }

    const { sdkKey, signature } = generateSdkSignature(String(apt.zoomMeetingId), role);
    return NextResponse.json({
      sdkKey,
      signature,
      meetingNumber: String(apt.zoomMeetingId),
      passcode: apt.passcode || '',
      role,
      userName: role === 1
        ? (db.collection('users').findById(therapistAuth!.userId)?.name || 'מטפל/ת')
        : (db.collection('clients').findById(clientAuth!.clientId)?.firstName || 'מטופל/ת')
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת חתימת הזום';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
