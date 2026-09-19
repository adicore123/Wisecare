import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/security';
import { signToken, signClientToken, createSessionCookie } from '@/lib/auth';
import { checkLoginBruteForce, recordFailedLogin, recordSuccessfulLogin } from '@/lib/rateLimit';
import { normalizePhone } from '@/lib/phoneHelpers';

export async function POST(request: Request) {
  try {
    await db.ensureLoaded();
    const body = await request.json();
    const rawIdentifier = body.username || body.identifier || '';
    const { password } = body;

    if (!rawIdentifier || !password) {
      return NextResponse.json({ error: 'נא להזין שם משתמש (או אימייל/טלפון) וסיסמה' }, { status: 400 });
    }

    const cleanInput = String(rawIdentifier).trim();
    const cleanLower = cleanInput.toLowerCase();
    const inputDigits = cleanInput.replace(/\D/g, '');

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const bruteForceCheck = checkLoginBruteForce(cleanLower);

    if (bruteForceCheck.locked) {
      db.logAudit({
        actor: cleanLower,
        actorRole: 'unknown',
        action: 'login_blocked_bruteforce',
        ip
      });
      return NextResponse.json({
        error: `חשבון זה נחסם זמנית עקב ריבוי ניסיונות שגויים מטעמי אבטחה. נא לנסות שוב בעוד ${bruteForceCheck.remainingMinutes || 15} דקות.`
      }, { status: 429 });
    }

    // 1. Check in 'users' collection (Therapists / Clinic Admins / SuperAdmins)
    const users = db.collection('users');
    const user = users.findOne((u: any) => {
      const uName = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const phoneMatches = inputDigits.length >= 7 && uPhoneDigits.length >= 7 &&
        (uPhoneDigits === inputDigits || uPhoneDigits.endsWith(inputDigits) || inputDigits.endsWith(uPhoneDigits));
      return uName === cleanLower || uEmail === cleanLower || phoneMatches;
    });

    if (user) {
      // SuperAdmin credentials may only be used through the dedicated /superadmin
      // login form (it sends adminPortal: true). The regular /login form keeps
      // receiving the dedicated-route message.
      if (user.role === 'superadmin' && body.adminPortal !== true) {
        return NextResponse.json({
          error: 'גישת מנהל מערכת ראשי (SuperAdmin) מבוצעת אך ורק דרך הכתובת הייעודית המאובטחת: /superadmin'
        }, { status: 403 });
      }

      if (!verifyPassword(password, user.password)) {
        const failureStatus = recordFailedLogin(cleanLower);
        db.logAudit({
          actor: user.username,
          actorRole: user.role || 'therapist',
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

      recordSuccessfulLogin(cleanLower);
      db.logAudit({
        actor: user.username,
        actorRole: user.role,
        action: 'login_success',
        targetId: user.id,
        ip
      });

      const { password: _, ...userInfo } = user;
      const token = signToken(user);
      const isAdmin = user.role === 'superadmin';
      const code = user.loginCode || 'dr-sarah-8821';
      const redirectUrl = isAdmin ? '/superadmin' : `/crm/${encodeURIComponent(code)}/clients`;

      const response = NextResponse.json({
        success: true,
        role: user.role || 'therapist',
        redirectUrl,
        user: userInfo,
        token
      });

      response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_token'));
      return response;
    }

    // 2. Check in 'clients' collection (Clients / Patients with personal portal or self-care)
    const clients = db.collection('clients');
    const client = clients.findOne((c: any) => {
      if (c.archived) return false;
      const cUsername = (c.username || '').toLowerCase();
      const cEmail = (c.email || '').toLowerCase();
      const cPhoneDigits = (c.phone || '').replace(/\D/g, '');
      const phoneMatches = inputDigits.length >= 7 && cPhoneDigits.length >= 7 &&
        (cPhoneDigits === inputDigits || cPhoneDigits.endsWith(inputDigits) || inputDigits.endsWith(cPhoneDigits));
      return cUsername === cleanLower || cEmail === cleanLower || phoneMatches;
    });

    if (client) {
      if (client.portalEnabled === false) {
        return NextResponse.json({
          error: 'המרחב האישי אינו פעיל עבור חשבון זה. יש לפנות למטפל/ת.'
        }, { status: 403 });
      }

      // Check if password has been established yet
      if (!client.password && !client.initialPassword) {
        return NextResponse.json({
          error: 'טרם הוגדרה סיסמה לחשבון זה. אנא היכנס/י דרך קישור ההזמנה שנשלח אליך ב-WhatsApp כדי לבחור שם משתמש וסיסמה אישית.'
        }, { status: 403 });
      }

      const isValidPassword = verifyPassword(password, client.password) ||
        (client.initialPassword && verifyPassword(password, client.initialPassword));

      if (!isValidPassword) {
        const failureStatus = recordFailedLogin(cleanLower);
        db.logAudit({
          actor: client.username || client.phone,
          actorRole: 'client',
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

      recordSuccessfulLogin(cleanLower);
      db.logAudit({
        actor: client.username || client.phone,
        actorRole: 'client',
        action: 'login_success',
        targetId: client.id,
        ip
      });

      const token = signClientToken(client);
      const redirectUrl = `/portal/${encodeURIComponent(client.portalCode)}`;

      const response = NextResponse.json({
        success: true,
        role: 'client',
        redirectUrl,
        portalCode: client.portalCode,
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          username: client.username || client.firstName,
          phone: client.phone,
          email: client.email,
          portalCode: client.portalCode,
          isSelfCare: Boolean(client.isSelfCare || !client.therapistId)
        },
        token
      });

      response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
      return response;
    }

    // 3. Not found in either collection
    recordFailedLogin(cleanLower);
    return NextResponse.json({
      error: 'שם משתמש או סיסמה שגויים. לא נמצא חשבון תואם.'
    }, { status: 401 });

  } catch (err: unknown) {
    console.error('[Unified Login Error]', err);
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
