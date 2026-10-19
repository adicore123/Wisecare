import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/security';
import { createSessionCookie, signClientToken, signToken } from '@/lib/auth';
import { getBaseUrl } from '@/lib/urlHelpers';
import { normalizePhone } from '@/lib/phoneHelpers';
import { checkLoginBruteForce, recordFailedLogin, recordSuccessfulLogin } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const body = await request.json().catch(() => ({}));
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'נא להזין שם משתמש (או אימייל/טלפון) וסיסמה' }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    // כניסת סופראדמין מטופס ההתחברות של /join — אותם פרטים פותחים את
    // הפאנל הראשי במקום מרחב אישי (זהה לשערי הפורטל ב-verify-auth).
    const brute = checkLoginBruteForce(`join-login:${cleanId}`);
    if (brute.locked) {
      return NextResponse.json(
        { error: `נעילה זמנית עקב ריבוי ניסיונות שגויים. נסה/י שוב בעוד ${brute.remainingMinutes || 15} דקות.` },
        { status: 429 }
      );
    }
    const inputDigits = cleanId.replace(/\D/g, '');
    const saUser = db.collection('users').findOne((u: any) => {
      if (u.role !== 'superadmin') return false;
      const uName = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const phoneMatch = inputDigits.length >= 7 && uPhoneDigits.length >= 7 &&
        (uPhoneDigits === inputDigits || uPhoneDigits.endsWith(inputDigits) || inputDigits.endsWith(uPhoneDigits));
      return uName === cleanId || uEmail === cleanId || phoneMatch;
    });
    if (saUser) {
      if (!verifyPassword(password, saUser.password)) {
        const failure = recordFailedLogin(`join-login:${cleanId}`);
        if (failure.locked) {
          return NextResponse.json(
            { error: 'הוזנה סיסמה שגויה מספר פעמים. ננעל זמנית ל-15 דקות.' },
            { status: 429 }
          );
        }
        return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים.' }, { status: 401 });
      }
      recordSuccessfulLogin(`join-login:${cleanId}`);
      const token = signToken(saUser);
      const response = NextResponse.json({
        superadminSession: true,
        token,
        user: { id: saUser.id, name: saUser.name, username: saUser.username, role: saUser.role }
      });
      response.headers.append('Set-Cookie', createSessionCookie(token));
      return response;
    }

    const clients = db.collection('clients');

    // Username/email are globally unique; a phone number may now be shared by
    // the same patient under two therapists, so phone login is only accepted
    // when it matches exactly one active personal space.
    let client = clients.findOne((c: any) =>
      (c.username && c.username.toLowerCase() === cleanId) ||
      (c.email && c.email.toLowerCase() === cleanId)
    );
    if (!client) {
      const digits = cleanId.replace(/\D/g, '');
      if (digits) {
        const phoneMatches = clients.find({}).filter((c: any) =>
          !c.archived && c.portalEnabled !== false && c.phone && normalizePhone(c.phone) === digits
        );
        if (phoneMatches.length === 1) {
          client = phoneMatches[0];
        } else if (phoneMatches.length > 1) {
          return NextResponse.json({
            error: 'מספר טלפון זה משויך ליותר ממרחב אישי אחד. נא להיכנס עם שם המשתמש האישי שקיבלת מהמטפל/ת.'
          }, { status: 401 });
        }
      }
    }

    if (!client) {
      return NextResponse.json({ error: 'פרטי ההתחברות שגויים. לא נמצא משתמש תואם.' }, { status: 401 });
    }

    if (client.portalEnabled === false) {
      return NextResponse.json({ error: 'המרחב האישי אינו פעיל עבור חשבון זה. יש לפנות למטפל/ת.' }, { status: 403 });
    }

    if (!client.password || !verifyPassword(password, client.password)) {
      return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים.' }, { status: 401 });
    }

    const clientAppUrl = getBaseUrl(request);
    const portalUrl = `${clientAppUrl}/portal/${encodeURIComponent(client.portalCode)}`;
    const token = signClientToken(client);

    const response = NextResponse.json({
      success: true,
      portalCode: client.portalCode,
      portalUrl,
      token,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        username: client.username || client.firstName,
        phone: client.phone,
        email: client.email,
        portalCode: client.portalCode,
        isSelfCare: Boolean(client.isSelfCare || !client.therapistId)
      }
    });
    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
    return response;
  } catch (error: any) {
    console.error('[Portal Login Error]', error);
    return NextResponse.json({ error: 'אירעה שגיאה בהתחברות למערכת.' }, { status: 500 });
  }
}
