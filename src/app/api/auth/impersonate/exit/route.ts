import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, createSessionCookie, createClearCookie, UserPayload } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies: Record<string, string> = {};
    for (const part of cookieHeader.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (!k) continue;
      try {
        cookies[k] = decodeURIComponent(v.join('='));
      } catch {
        cookies[k] = v.join('=');
      }
    }

    // Fallback: check Authorization or custom header if cookie not present
    const authHeader = request.headers.get('authorization');
    const adminToken = cookies['wisecare_admin_token'] || 
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

    if (!adminToken) {
      return NextResponse.json({ error: 'לא נמצאה הרשאת מנהל ראשי לחזרה' }, { status: 400 });
    }

    const payload = verifyToken<UserPayload>(adminToken, 'wisecare-app');
    if (!payload || payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'הרשאת מנהל ראשי אינה תקינה או שפג תוקפה' }, { status: 403 });
    }

    await db.ensureLoaded();

    // Re-validate against the users table — a valid token alone must not
    // suffice if the account was deleted or demoted since the token was issued.
    // The query itself carries no request-derived value (IDOR-free by
    // construction); the token's userId is matched in plain code afterwards.
    const superadmins = db.collection('users').find({ role: 'superadmin' });
    const admin = superadmins.find(
      (u: any) => u.id === payload.userId && u.active !== false
    );
    if (!admin) {
      return NextResponse.json({ error: 'הרשאת מנהל ראשי אינה תקינה או שפג תוקפה' }, { status: 403 });
    }
    const { password: _, ...adminInfo } = admin;

    db.logAudit({
      actor: payload.username,
      actorRole: payload.role,
      action: 'exit_impersonation',
      targetId: payload.userId
    });

    const response = NextResponse.json({
      success: true,
      user: adminInfo,
      token: adminToken,
      message: 'חזרת בהצלחה לפאנל SuperAdmin'
    });

    // Restore wisecare_token to adminToken and clear wisecare_admin_token
    response.headers.append('Set-Cookie', createSessionCookie(adminToken, 'wisecare_token'));
    response.headers.append('Set-Cookie', createClearCookie('wisecare_admin_token'));

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
