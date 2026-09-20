import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { createSessionCookie, signToken } from '@/lib/auth';
import { hashPassword, isUsernameValid } from '@/lib/security';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';
import { normalizePhone, isTestPhoneNumber } from '@/lib/phoneHelpers';
import { checkRateLimit } from '@/lib/rateLimit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function generateLoginCode(username?: string, name?: string): string {
  let base = (username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!base) {
    base = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  if (!base) {
    base = 'therapist';
  }
  const rand = crypto.randomInt(100000, 999999);
  return `${base}-${rand}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, username, password, email, phone, title, specialty, clinicName } = body;

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'שם מלא, שם משתמש וסיסמה הינם שדות חובה' }, { status: 400 });
    }

    // Abuse brake: cap registrations per IP.
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
    const ipLimit = checkRateLimit(`register-therapist:${ip}`, 5, 60 * 60);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'בוצעו יותר מדי הרשמות מכתובת זו. נסה/י שוב מאוחר יותר.' }, { status: 429 });
    }

    // Optional invite gate: set THERAPIST_REGISTRATION_CODE in the environment to
    // require it at sign-up (recommended in production; empty = open registration).
    const inviteCode = process.env.THERAPIST_REGISTRATION_CODE;
    if (inviteCode && body.inviteCode !== inviteCode) {
      return NextResponse.json({ error: 'נדרש קוד הזמנה תקף לפתיחת קליניקה חדשה.' }, { status: 403 });
    }

    await db.ensureLoaded();

    const cleanUsername = String(username).trim();
    if (!isUsernameValid(cleanUsername)) {
      return NextResponse.json({
        error: 'שם משתמש אינו תקין: יש להשתמש באותיות אנגלית, מספרים, נקודות או קווים תחתונים בלבד (לפחות 3 תווים וללא רווחים).'
      }, { status: 400 });
    }

    if (String(password).length < 8) {
      return NextResponse.json({
        error: 'הסיסמה קצרה מדי: נדרשים לפחות 8 תווים לרמת אבטחה מקצועית.'
      }, { status: 400 });
    }

    if (email && String(email).trim() && !EMAIL_REGEX.test(String(email).trim())) {
      return NextResponse.json({ error: 'כתובת אימייל אינה תקינה' }, { status: 400 });
    }

    const users = db.collection('users');
    const existingUsername = users.findOne((u: any) => u.username?.toLowerCase() === cleanUsername.toLowerCase());
    if (existingUsername) {
      return NextResponse.json({ error: 'שם משתמש זה כבר תפוס במערכת. נא לבחור שם משתמש אחר.' }, { status: 400 });
    }

    // Check unique phone rule (whitelist 0509611808)
    if (phone && String(phone).trim()) {
      const cleanPhone = normalizePhone(String(phone));
      if (!isTestPhoneNumber(cleanPhone)) {
        const existingPhoneUser = users.findOne((u: any) => {
          if (!u.phone) return false;
          return normalizePhone(u.phone) === cleanPhone;
        });
        if (existingPhoneUser) {
          return NextResponse.json({
            error: `מספר טלפון זה כבר רשום במערכת עבור מטפל אחר (${existingPhoneUser.name}).`
          }, { status: 400 });
        }
      }
    }

    const loginCode = generateLoginCode(cleanUsername, name);
    const hashedPassword = hashPassword(password);

    const newTherapist = users.insertOne({
      name: String(name).trim(),
      username: cleanUsername,
      password: hashedPassword,
      email: email ? String(email).trim() : '',
      phone: phone ? String(phone).trim() : '',
      title: title ? String(title).trim() : 'מטפל/ת מוסמך/ת',
      specialty: specialty ? String(specialty).trim() : (clinicName ? String(clinicName).trim() : 'קליניקה פרטית'),
      loginCode,
      role: 'therapist',
      active: true,
      createdAt: new Date().toISOString()
    });

    const token = signToken({
      id: newTherapist.id,
      role: 'therapist',
      username: newTherapist.username
    });

    const { password: _, ...safeUser } = newTherapist;
    const clientAppUrl = getBaseUrl(request);
    const loginUrl = `${clientAppUrl}/login/${loginCode}`;
    const crmUrl = `${clientAppUrl}/crm/${loginCode}/clients`;

    // WhatsApp notification
    const settings = db.getSettings();
    if (phone && String(phone).trim() && settings.autoSendTherapistInviteWhatsApp !== false) {
      try {
        const template = settings.therapistInviteMessageTemplate || `שלום {{name}} יקר/ה,
ברוך/ה הבא/ה ל-WiseCare! הקליניקה האישית שלך נוצרה בהצלחה 🌿

להלן פרטי הגישה האישיים שלך למערכת:
🔗 קישור כניסה ייחודי:
{{loginUrl}}

👤 שם משתמש: {{username}}
🔑 סיסמה: {{password}}

מרחב ניהול הקליניקה (CRM):
{{crmUrl}}

בהצלחה רבה בעבודתך הטיפולית,
צוות WiseCare`;

        const message = template
          .replace(/\{\{name\}\}/g, newTherapist.name)
          .replace(/\{\{username\}\}/g, cleanUsername)
          .replace(/\{\{password\}\}/g, password)
          .replace(/\{\{loginUrl\}\}/g, loginUrl)
          .replace(/\{\{crmUrl\}\}/g, crmUrl)
          .replace(/\{\{clinicName\}\}/g, settings.clinicName || 'WiseCare');

        await sendWhatsAppMessage({ phone, message });
      } catch (waErr) {
        console.warn('[register-therapist] WhatsApp send failed:', waErr);
      }
    }

    // Persist the new therapist BEFORE responding — without this the user can
    // be lost if a Mongo sync replaces the in-memory snapshot first.
    await db.flush();

    const response = NextResponse.json({
      success: true,
      token,
      user: safeUser,
      redirectUrl: `/crm/${loginCode}/clients`,
      message: 'הקליניקה נפתחה בהצלחה!'
    });
    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_token'));
    return response;
  } catch (error: any) {
    console.error('[register-therapist Error]', error);
    return NextResponse.json({ error: error.message || 'שגיאה ביצירת הקליניקה' }, { status: 500 });
  }
}
