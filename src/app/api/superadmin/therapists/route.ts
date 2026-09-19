import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { hashPassword, isUsernameValid } from '@/lib/security';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';

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

export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const users = db.collection('users');
    const clients = db.collection('clients');
    const tasks = db.collection('tasks');

    const therapists = users.find({ role: 'therapist' }).map((t: any) => {
      const therapistClients = clients.find({ therapistId: t.id });
      const therapistTasks = tasks.find({ therapistId: t.id });

      let loginCode = t.loginCode;
      if (!loginCode) {
        loginCode = generateLoginCode(t.username, t.name);
        users.updateById(t.id, { loginCode });
      }

      const { password, ...safeData } = t;
      return {
        ...safeData,
        loginCode,
        loginUrl: `/login/${loginCode}`,
        clientsCount: therapistClients.length,
        tasksCount: therapistTasks.length,
        activeTasksCount: therapistTasks.filter((tsk: any) => !tsk.completed).length
      };
    });

    await db.flush();
    return NextResponse.json(therapists);
  } catch (error: any) {
    console.error('[SuperAdmin Therapists GET Error]', error);
    return NextResponse.json({ error: 'שגיאה בשליפת רשימת מטפלים' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, username, password, email, phone, title, specialty, sendWhatsApp } = body;

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'שם מלא, שם משתמש וסיסמה הינם שדות חובה' }, { status: 400 });
    }

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
    const existing = users.findOne((u: any) => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'שם משתמש זה כבר קיים במערכת' }, { status: 400 });
    }

    const loginCode = generateLoginCode(cleanUsername, name);
    const hashedPassword = hashPassword(password);

    const newTherapist = users.insertOne({
      name,
      username: cleanUsername,
      password: hashedPassword,
      email: email || '',
      phone: phone || '',
      title: title || 'מטפל/ת רגשי/ת',
      specialty: specialty || 'טיפול רגשי ממוקד',
      loginCode,
      role: 'therapist',
      active: true
    });

    const { password: _, ...safeData } = newTherapist;
    const clientAppUrl = getBaseUrl(request);
    const loginUrl = `${clientAppUrl}/login/${loginCode}`;
    const crmUrl = `${clientAppUrl}/crm/${loginCode}`;

    const responseData = {
      ...safeData,
      loginCode,
      loginUrl: `/login/${loginCode}`,
      crmUrl: `/crm/${loginCode}`
    };

    const settings = db.getSettings();
    const shouldAutoSend = sendWhatsApp !== undefined
      ? Boolean(sendWhatsApp)
      : (settings.autoSendTherapistInviteWhatsApp !== false);

    let whatsappStatus: any = { sent: false };

    if (shouldAutoSend && phone && String(phone).trim()) {
      try {
        const template = settings.therapistInviteMessageTemplate || `שלום {{name}} יקר/ה,
הוגדר עבורך בהצלחה חשבון מטפל/ת אישי במערכת WiseCare 🌿

להלן פרטי הגישה האישיים שלך למערכת:
🔗 קישור כניסה ייחודי למרחב שלך:
{{loginUrl}}

👤 שם משתמש: {{username}}
🔑 סיסמה ראשונית: {{password}}

כתובת ישירה למרחב העבודה (CRM):
{{crmUrl}}

בברכה,
הנהלת המערכת WiseCare`;

        const message = template
          .replace(/{{name}}/g, name)
          .replace(/{{username}}/g, username)
          .replace(/{{password}}/g, password)
          .replace(/{{loginUrl}}/g, loginUrl)
          .replace(/{{crmUrl}}/g, crmUrl)
          .replace(/{{clinicName}}/g, settings.clinicName || 'WiseCare');

        await sendWhatsAppMessage({ phone, message });
        whatsappStatus = {
          sent: true,
          message,
          recipient: phone
        };
      } catch (waErr: any) {
        console.error('[Auto WhatsApp] Failed to auto-send to new therapist:', waErr.message);
        whatsappStatus = {
          sent: false,
          error: waErr.message,
          recipient: phone
        };
      }
    }

    await db.flush();
    return NextResponse.json({
      ...responseData,
      therapist: responseData,
      whatsappStatus
    }, { status: 201 });
  } catch (error: any) {
    console.error('[SuperAdmin Therapist Create Error]', error);
    return NextResponse.json({ error: 'שגיאה ביצירת מטפל חדש' }, { status: 500 });
  }
}
