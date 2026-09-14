import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/security';
import { signToken, createSessionCookie } from '@/lib/auth';
import { checkLoginBruteForce, recordFailedLogin, recordSuccessfulLogin } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'נא להזין שם משתמש וסיסמה' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const bruteForceCheck = checkLoginBruteForce(username);

    if (bruteForceCheck.locked) {
      db.logAudit({
        actor: username,
        actorRole: 'unknown',
        action: 'login_blocked_bruteforce',
        ip
      });
      return NextResponse.json({
        error: `חשבון זה נחסם זמנית עקב ריבוי ניסיונות שגויים מטעמי אבטחה. נא לנסות שוב בעוד ${bruteForceCheck.remainingMinutes || 15} דקות.`
      }, { status: 429 });
    }

    const users = db.collection('users');
    const user = users.findOne((u: any) => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user || !verifyPassword(password, user.password)) {
      const failureStatus = recordFailedLogin(username);
      db.logAudit({
        actor: username,
        actorRole: 'unknown',
        action: 'login_failed',
        ip
      });

      if (failureStatus.locked) {
        return NextResponse.json({
          error: 'הוזנה סיסמה שגויה 5 פעמים. החשבון ננעל זמנית ל-15 דקות להגנה על המערכת.'
        }, { status: 429 });
      }

      return NextResponse.json({
        error: `שם משתמש או סיסמה שגויים. נותרו עוד ${failureStatus.attemptsLeft} ניסיונות לפני נעילת החשבון.`
      }, { status: 401 });
    }

    if (!user.active) {
      db.logAudit({
        actor: user.username,
        actorRole: user.role,
        action: 'login_rejected_inactive',
        ip
      });
      return NextResponse.json({ error: 'משתמש זה מושבת על ידי מנהל המערכת' }, { status: 403 });
    }

    recordSuccessfulLogin(username);

    db.logAudit({
      actor: user.username,
      actorRole: user.role,
      action: 'login_success',
      targetId: user.id,
      ip
    });

    const { password: _, ...userInfo } = user;
    const token = signToken(user);

    const response = NextResponse.json({
      user: userInfo,
      token
    });

    // Set HttpOnly session cookies
    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_token'));
    if (user.role === 'superadmin') {
      response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_admin_token'));
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
