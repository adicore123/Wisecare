import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { hashPassword, isUsernameValid } from '@/lib/security';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const body = await request.json().catch(() => ({}));
    const { password, username, sendWhatsApp } = body;

    const users = db.collection('users');
    const target = users.findById(id);
    if (!target || target.role !== 'therapist') {
      return NextResponse.json({ error: 'מטפל לא נמצא' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {};

    if (username && username.trim() !== target.username) {
      const cleanUsername = username.trim();
      if (!isUsernameValid(cleanUsername)) {
        return NextResponse.json({
          error: 'שם משתמש אינו תקין: יש להשתמש באותיות אנגלית, מספרים, נקודות או קווים תחתונים בלבד (לפחות 3 תווים).'
        }, { status: 400 });
      }
      const existing = users.findOne((u: any) => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== id);
      if (existing) {
        return NextResponse.json({ error: 'שם משתמש זה כבר קיים במערכת' }, { status: 400 });
      }
      updatePayload.username = cleanUsername;
    }

    if (password) {
      if (String(password).length < 8) {
        return NextResponse.json({
          error: 'סיסמה חייבת להכיל לפחות 8 תווים לרמת אבטחה מקצועית.'
        }, { status: 400 });
      }
      updatePayload.password = hashPassword(password);
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'לא סופקו פרטי גישה חדשים לעדכון' }, { status: 400 });
    }

    users.updateById(id, updatePayload);
    const clientAppUrl = getBaseUrl(request);
    const loginFullUrl = `${clientAppUrl}/login/${target.loginCode}`;

    let whatsappStatus: any = { sent: false };

    if (sendWhatsApp && target.phone) {
      try {
        const message = `שלום ${target.name} יקר/ה,
לבקשתך עודכנו פרטי ההתחברות למרחב הטיפול האישי שלך במערכת WiseCare 🌿

🔗 קישור הכניסה האישי שלך:
${loginFullUrl}

👤 שם משתמש: ${updatePayload.username || target.username}
${password ? `🔑 סיסמה חדשה: ${password}` : ''}

לכל שאלה, הנהלת המערכת עומדת לרשותך!`;

        const waResult = await sendWhatsAppMessage({ phone: target.phone, message });
        whatsappStatus = { sent: true, result: waResult };
      } catch (waErr: any) {
        console.error('Error sending reset WhatsApp:', waErr);
        whatsappStatus = { sent: false, error: waErr.message };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'פרטי הגישה עודכנו בהצלחה',
      whatsappStatus,
      loginUrl: `/login/${target.loginCode}`
    });
  } catch (err: any) {
    console.error('[SuperAdmin Credentials Update Error]', err);
    return NextResponse.json({ error: 'שגיאה בעדכון פרטי גישה' }, { status: 500 });
  }
}
