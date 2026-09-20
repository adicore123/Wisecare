import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/security';
import { signClientToken, createSessionCookie } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { maskPhone } from '@/lib/security';
import { checkRateLimit } from '@/lib/rateLimit';

interface RouteProps {
  params: Promise<{ portalCode: string }>;
}

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: NextRequest, props: RouteProps) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;

    if (!portalCode) {
      return NextResponse.json({ error: 'חסר מזהה פורטל' }, { status: 400 });
    }

    // Rate-limit the whole endpoint (OTP requests + submissions) per portal
    const ip = request.headers.get('x-forwarded-for') || 'local';
    const rl = checkRateLimit(`set-credentials:${portalCode}:${ip}`, 10, 10 * 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'יותר מדי ניסיונות. אנא נסה/י שוב בעוד מספר דקות.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));

    const clients = db.collection('clients');
    const users = db.collection('users');

    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    // ---- Step 1: request a one-time code sent to the patient's own phone ----
    if (body.requestOtp === true) {
      // OTP is only for FIRST-TIME setup; existing credentials must go through "forgot password"
      if (client.password || client.initialPassword || client.credentialsSetAt) {
        return NextResponse.json(
          { error: 'פרטי התחברות כבר נקבעו למרחב זה. לאיפוס סיסמה ניתן להשתמש ב"שכחתי סיסמה".' },
          { status: 403 }
        );
      }
      if (!client.phone) {
        return NextResponse.json({ error: 'אין מספר טלפון משויך למרחב — נא לפנות למטפל/ת.' }, { status: 400 });
      }

      const otpCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      clients.updateById(client.id, {
        setupOtp: { code: otpCode, expiresAt, attempts: 0 }
      });
      await db.flush();

      try {
        const message = `שלום ${client.firstName},\nקוד האימות להגדרת הכניסה למרחב האישי שלך ב-WiseCare:\n\n🔐 *${otpCode}*\n\nהקוד תקף ל-10 דקות. אם לא ביקשת זאת, אנא התעלם מההודעה.`;
        await sendWhatsAppMessage({ phone: client.phone, message });
      } catch (err: any) {
        console.warn('[Set Credentials OTP WhatsApp Warning]', err.message);
        return NextResponse.json(
          { error: 'שליחת קוד האימות בוואטסאפ נכשלה. אנא נסה/י שוב בעוד רגע או פנה/י למטפל/ת.' },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        otpSent: true,
        maskedPhone: maskPhone(client.phone)
      });
    }

    // ---- Step 2: set credentials, verified by the OTP ----
    const { username, password, otp } = body;

    if (!username || !String(username).trim()) {
      return NextResponse.json({ error: 'נא לבחור שם משתמש' }, { status: 400 });
    }
    if (!password || String(password).trim().length < 4) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 4 תווים' }, { status: 400 });
    }
    if (!otp || !/^\d{6}$/.test(String(otp).trim())) {
      return NextResponse.json({ error: 'נא להזין את קוד האימות שנשלח לטלפון שלך' }, { status: 400 });
    }

    // Already set up? Refuse — resets must go through the verified forgot-password flow
    if (client.password || client.initialPassword || client.credentialsSetAt) {
      return NextResponse.json(
        { error: 'פרטי התחברות כבר נקבעו למרחב זה.' },
        { status: 403 }
      );
    }

    if (!client.setupOtp || new Date(client.setupOtp.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'לא נשלח קוד אימות או שתוקפו פג. אנא בקש/י קוד חדש.' }, { status: 400 });
    }
    if ((client.setupOtp.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      clients.updateById(client.id, { setupOtp: null });
      await db.flush();
      return NextResponse.json({ error: 'חרגת ממספר הניסיונות. אנא בקש/י קוד חדש.' }, { status: 429 });
    }
    if (client.setupOtp.code !== String(otp).trim()) {
      clients.updateById(client.id, {
        setupOtp: { ...client.setupOtp, attempts: (client.setupOtp.attempts || 0) + 1 }
      });
      await db.flush();
      return NextResponse.json({ error: 'קוד האימות שהוזן אינו נכון.' }, { status: 400 });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const cleanUsernameLower = cleanUsername.toLowerCase();

    // Check if username is already taken by another client
    const existingClient = clients.findOne((c: any) =>
      c.id !== client.id && !c.archived && c.username && c.username.toLowerCase() === cleanUsernameLower
    );
    if (existingClient) {
      return NextResponse.json({ error: `שם המשתמש "${cleanUsername}" כבר תפוס במערכת. אנא בחר/י שם משתמש אחר.` }, { status: 400 });
    }

    // Check if username is taken in users collection
    const existingUser = users.findOne((u: any) =>
      u.username && u.username.toLowerCase() === cleanUsernameLower
    );
    if (existingUser) {
      return NextResponse.json({ error: `שם המשתמש "${cleanUsername}" כבר שמור במערכת. אנא בחר/י שם משתמש אחר.` }, { status: 400 });
    }

    const hashedPassword = hashPassword(cleanPassword);

    const updated = clients.updateById(client.id, {
      username: cleanUsername,
      password: hashedPassword,
      // Only the hash is persisted — never the plaintext
      initialPassword: '',
      hasPassword: true,
      credentialsSetAt: new Date().toISOString(),
      setupOtp: null
    });

    await db.flush();

    const token = signClientToken(updated);

    const response = NextResponse.json({
      success: true,
      message: 'פרטי ההתחברות האישיים נקבעו בהצלחה! ברוך/ה הבא/ה למרחב שלך.',
      client: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        username: updated.username,
        phone: updated.phone,
        portalCode: updated.portalCode
      },
      token
    });

    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
    return response;
  } catch (error: any) {
    console.error('[Set Credentials Error]', error);
    return NextResponse.json({ error: error.message || 'שגיאה בעדכון פרטי ההתחברות' }, { status: 500 });
  }
}
