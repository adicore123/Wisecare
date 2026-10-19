import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/security';
import { createSessionCookie, getClientAuthFromRequest, signClientToken, signToken } from '@/lib/auth';
import { checkLoginBruteForce, recordFailedLogin, recordSuccessfulLogin } from '@/lib/rateLimit';
import { normalizePhone } from '@/lib/phoneHelpers';
import { recordLogin } from '@/lib/usageTracking';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  const { portalCode } = await props.params;
  const auth = getClientAuthFromRequest(request, portalCode);
  if (!auth || auth.portalCode !== portalCode) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  await db.ensureLoaded();
  const client = db.collection('clients').findById(auth.clientId) || db.collection('clients').findOne({ portalCode });
  if (!client || client.portalCode !== portalCode || client.status === 'inactive' || client.portalEnabled === false) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const token = signClientToken(client);
  const response = NextResponse.json({ authenticated: true, token });
  response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
  return response;
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'נא להזין שם משתמש וסיסמה' },
        { status: 400 }
      );
    }

    const clients = db.collection('clients');
    const client = clients.findOne({ portalCode });

    if (!client) {
      return NextResponse.json(
        { error: 'מרחב אישי לא נמצא' },
        { status: 404 }
      );
    }

    // Brute-force protection on the portal gate
    const bruteKey = `portal:${portalCode}:${String(username).trim().toLowerCase()}`;
    const brute = checkLoginBruteForce(bruteKey);
    if (brute.locked) {
      return NextResponse.json(
        { error: `נעילה זמנית עקב ריבוי ניסיונות שגויים. נסה/י שוב בעוד ${brute.remainingMinutes || 15} דקות.` },
        { status: 429 }
      );
    }

    // כניסת סופראדמין משער המרחב: אותם פרטים פותחים את הפאנל הראשי
    // במקום המרחב האישי — הלקוח ממשיך לזרימה הרגילה שלו למטה.
    const cleanLower = String(username).trim().toLowerCase();
    const inputDigits = String(username).replace(/\D/g, '');
    const saUser = db.collection('users').findOne((u: any) => {
      if (u.role !== 'superadmin') return false;
      const uName = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const phoneMatch = inputDigits.length >= 7 && uPhoneDigits.length >= 7 &&
        (uPhoneDigits === inputDigits || uPhoneDigits.endsWith(inputDigits) || inputDigits.endsWith(uPhoneDigits));
      return uName === cleanLower || uEmail === cleanLower || phoneMatch;
    });
    if (saUser) {
      if (!verifyPassword(password, saUser.password)) {
        const failure = recordFailedLogin(bruteKey);
        if (failure.locked) {
          return NextResponse.json(
            { error: 'הוזנה סיסמה שגויה מספר פעמים. ננעל זמנית ל-15 דקות.' },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { error: 'שם משתמש או סיסמה שגויים.' },
          { status: 401 }
        );
      }
      recordSuccessfulLogin(bruteKey);
      const token = signToken(saUser);
      const response = NextResponse.json({
        superadminSession: true,
        token,
        user: {
          id: saUser.id,
          name: saUser.name,
          username: saUser.username,
          role: saUser.role
        }
      });
      response.headers.append('Set-Cookie', createSessionCookie(token));
      return response;
    }

    // No credentials configured yet — the patient must complete the verified
    // first-time setup (OTP to their phone) instead of entering with the link alone
    if (!client.password && !client.initialPassword) {
      return NextResponse.json(
        { error: 'טרם הוגדרה סיסמה למרחב זה. אנא הגדר/י שם משתמש וסיסמה בכניסה הראשונה.' },
        { status: 403 }
      );
    }

    const cleanInput = String(username).trim().toLowerCase();
    const clientUsername = (client.username || '').toLowerCase();
    const clientPhoneClean = normalizePhone(client.phone);
    const inputPhoneClean = normalizePhone(cleanInput);

    // Verify username or phone match
    const isIdentityMatch =
      cleanInput === clientUsername ||
      (clientPhoneClean && inputPhoneClean && clientPhoneClean === inputPhoneClean);

    if (!isIdentityMatch) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים.' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid =
      (client.password && verifyPassword(password, client.password)) ||
      (client.initialPassword && verifyPassword(password, client.initialPassword));

    if (!isPasswordValid) {
      const failure = recordFailedLogin(bruteKey);
      if (failure.locked) {
        return NextResponse.json(
          { error: 'הוזנה סיסמה שגויה מספר פעמים. המרחב ננעל זמנית ל-15 דקות.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים.' },
        { status: 401 }
      );
    }

    recordSuccessfulLogin(bruteKey);

    // מעקב שימוש — כניסה מוצלחת של המטופל למרחב (לא סופראדמין)
    try {
      recordLogin(client.id);
      await db.flush();
    } catch {}

    // Migrate legacy plaintext credentials to a salted hash on first successful login
    if (client.initialPassword && verifyPassword(password, client.initialPassword)) {
      clients.updateById(client.id, {
        password: hashPassword(password),
        initialPassword: '',
        hasPassword: true
      });
    }

    const token = signClientToken(client);

    const response = NextResponse.json({
      success: true,
      token,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        username: client.username || client.firstName,
        portalCode: client.portalCode
      }
    });
    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
    return response;
  } catch (err: any) {
    console.error('[Portal Verify Auth Error]', err);
    return NextResponse.json(
      { error: 'שגיאה באימות פרטי ההתחברות' },
      { status: 500 }
    );
  }
}
