import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { checkWhatsAppThrottle } from '@/lib/rateLimit';

function generateLoginCode(username?: string, name?: string): string {
  let base = (username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!base) base = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!base) base = 'therapist';
  return `${base}-${crypto.randomInt(100000, 999999)}`;
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const users = db.collection('users');
    const therapist = users.findById(id);

    if (!therapist || therapist.role !== 'therapist') {
      return NextResponse.json({ error: 'מטפל לא נמצא' }, { status: 404 });
    }

    if (!therapist.phone) {
      return NextResponse.json({ error: 'למטפל זה לא מוגדר מספר טלפון' }, { status: 400 });
    }

    const throttleCheck = checkWhatsAppThrottle(therapist.phone);
    if (!throttleCheck.allowed) {
      return NextResponse.json({ error: throttleCheck.reason || 'נא להמתין לפני שליחת הודעה נוספת' }, { status: 429 });
    }

    let loginCode = therapist.loginCode;
    if (!loginCode) {
      loginCode = generateLoginCode(therapist.username, therapist.name);
      users.updateById(therapist.id, { loginCode });
    }

    const clientAppUrl = process.env.CLIENT_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginFullUrl = `${clientAppUrl}/login/${loginCode}`;

    const message = `שלום ${therapist.name} יקר/ה,
הוגדר עבורך בהצלחה חשבון מטפל/ת אישי במערכת WiseCare 🌿

קישור הכניסה הייחודי והמאובטח למרחב הטיפולי שלך:
${loginFullUrl}

שם משתמש: ${therapist.username}
(יש להזין את הסיסמה שנקבעה עבורך בכניסה למערכת)

לכל שאלה או סיוע, צוות המערכת עומד לרשותך.
מאחלים לך עבודה פורייה ומעצימה! ✨`;

    const result = await sendWhatsAppMessage({ phone: therapist.phone, message });

    return NextResponse.json({
      success: true,
      sentViaGreenApi: true,
      message: 'קישור ההתחברות ופרטי הגישה נשלחו בהצלחה בוואטסאפ למטפל',
      result
    });
  } catch (err: any) {
    console.error('Error sending therapist invite WhatsApp:', err);
    return NextResponse.json({ error: err.message || 'שגיאה בשליחת וואטסאפ למטפל' }, { status: 400 });
  }
}
