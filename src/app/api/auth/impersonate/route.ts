import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest, signToken, createSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה לפאנל SuperAdmin חסומה' }, { status: 403 });
    }

    const body = await request.json();
    const { targetTherapistId } = body;

    await db.ensureLoaded();

    const users = db.collection('users');
    const admin = users.findById(auth.userId);
    const therapist = users.findById(targetTherapistId);

    if (!therapist || therapist.role !== 'therapist') {
      return NextResponse.json({ error: 'מטפל לא נמצא' }, { status: 404 });
    }

    if (!therapist.active) {
      return NextResponse.json({ error: 'חשבון מטפל זה מושבת' }, { status: 403 });
    }

    const impersonationToken = signToken(therapist);
    const adminToken = admin ? signToken(admin) : null;
    const { password: _, ...therapistInfo } = therapist;

    db.logAudit({
      actor: auth.username,
      actorRole: auth.role,
      action: 'superadmin_impersonate_therapist',
      targetId: therapist.id
    });

    const response = NextResponse.json({
      user: therapistInfo,
      token: impersonationToken,
      adminToken: adminToken,
      isImpersonating: true,
      originalAdmin: admin?.name || 'SuperAdmin'
    });

    // Set therapist session cookie
    response.headers.append('Set-Cookie', createSessionCookie(impersonationToken, 'wisecare_token'));
    // Preserve admin session cookie for safe return
    if (adminToken) {
      response.headers.append('Set-Cookie', createSessionCookie(adminToken, 'wisecare_admin_token'));
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
