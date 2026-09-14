import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, checkRateLimit, recordFailedLogin, clearFailedLogin } from '@/lib/security';
import { signToken } from '@/lib/auth';

interface RouteProps {
  params: Promise<{ loginCode: string }>;
}

export async function GET(request: Request, props: RouteProps) {
  try {
    const { loginCode } = await props.params;
    const users = db.collection('users');
    const therapist = users.findOne((u: any) => u.loginCode === loginCode && u.role === 'therapist');

    if (!therapist) {
      return NextResponse.json(
        { error: 'קישור כניסה אישי זה אינו תקין או שפג תוקפו. אנא פנה למנהל המערכת.' },
        { status: 404 }
      );
    }

    if (!therapist.active) {
      return NextResponse.json(
        { error: 'חשבון מטפל זה מושבת כרגע. אנא פנה למנהל המערכת.' },
        { status: 403 }
      );
    }

    const settings = db.getSettings();

    return NextResponse.json({
      id: therapist.id,
      name: therapist.name,
      username: therapist.username,
      title: therapist.title,
      specialty: therapist.specialty,
      loginCode: therapist.loginCode,
      clinicName: settings.clinicName || 'מרחב טיפולי WiseCare'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, props: RouteProps) {
  try {
    const { loginCode } = await props.params;
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'נא להזין שם משתמש וסיסמה' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `therapist-login:${ip}:${loginCode}`;
    const rateLimit = checkRateLimit(rateLimitKey);

    if (rateLimit.isBlocked) {
      return NextResponse.json({
        error: `דף כניסה זה נחסם זמנית עקב ריבוי ניסיונות שגויים מטעמי אבטחה. נא לנסות שוב בעוד ${rateLimit.remainingMinutes} דקות.`
      }, { status: 429 });
    }

    const users = db.collection('users');
    const therapist = users.findOne((u: any) => u.loginCode === loginCode && u.role === 'therapist');

    if (!therapist) {
      return NextResponse.json({ error: 'קישור כניסה אישי זה אינו תקין' }, { status: 404 });
    }

    if (!therapist.active) {
      return NextResponse.json({ error: 'חשבון מטפל זה מושבת. אנא פנה למנהל המערכת.' }, { status: 403 });
    }

    const usernameMatch = therapist.username.toLowerCase() === username.trim().toLowerCase();
    const passwordMatch = verifyPassword(password, therapist.password);

    if (!usernameMatch || !passwordMatch) {
      recordFailedLogin(rateLimitKey);
      return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים' }, { status: 401 });
    }

    clearFailedLogin(rateLimitKey);

    const { password: _, ...userInfo } = therapist;
    return NextResponse.json({
      success: true,
      user: userInfo,
      token: signToken(therapist)
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
