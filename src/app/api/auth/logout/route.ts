import { NextResponse } from 'next/server';
import { createClearCookie, getAuthFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    if (auth) {
      db.logAudit({
        actor: auth.username,
        actorRole: auth.role,
        action: 'logout_success',
        targetId: auth.userId
      });
    }

    const response = NextResponse.json({ success: true, message: 'התנתקת בהצלחה מהמערכת' });
    response.headers.append('Set-Cookie', createClearCookie('wisecare_token'));
    response.headers.append('Set-Cookie', createClearCookie('wisecare_admin_token'));
    response.headers.append('Set-Cookie', createClearCookie('wisecare_client_token'));

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בהתנתקות';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
