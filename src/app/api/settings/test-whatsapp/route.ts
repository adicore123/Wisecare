import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { phone, testMessage } = body;

    if (!phone) {
      return NextResponse.json({ error: 'נא להזין מספר טלפון לבדיקה' }, { status: 400 });
    }

    const result = await sendWhatsAppMessage({
      phone,
      message: testMessage || 'שלום! זוהי הודעת בדיקה ממערכת WiseCare למטפלים רגשיים ופסיכולוגים. החיבור ל-Green API פעיל בהצלחה! ✨'
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[Test WhatsApp Error]', err);
    return NextResponse.json({
      success: false,
      error: 'אירעה שגיאה בשליחת הודעת בדיקה ב-WhatsApp. אנא בדוק את הגדרות ה-API.'
    }, { status: 500 });
  }
}
