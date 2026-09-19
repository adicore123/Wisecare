import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSessionCookie, getAuthFromRequest, signToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      // Probe mode (landing page session check): a silent 200 instead of 401
      // keeps the browser console clean for anonymous visitors.
      if (new URL(request.url).searchParams.get('probe') === '1') {
        return NextResponse.json({ user: null, token: null });
      }
      return NextResponse.json({ error: 'נדרשת כניסה למערכת. אנא התחבר/י מחדש.' }, { status: 401 });
    }

    const users = db.collection('users');
    const user = users.findById(auth.userId);

    if (!user || !user.active) {
      return NextResponse.json({ error: 'המשתמש אינו פעיל או לא קיים' }, { status: 401 });
    }

    const { password: _, ...userInfo } = user;
    const token = signToken(user);
    const response = NextResponse.json({ user: userInfo, token });
    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_token'));
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
