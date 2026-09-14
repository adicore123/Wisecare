import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'נדרשת כניסה למערכת. אנא התחבר/י מחדש.' }, { status: 401 });
    }

    const users = db.collection('users');
    const user = users.findById(auth.userId);

    if (!user || !user.active) {
      return NextResponse.json({ error: 'המשתמש אינו פעיל או לא קיים' }, { status: 401 });
    }

    const { password: _, ...userInfo } = user;
    return NextResponse.json({ user: userInfo });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
