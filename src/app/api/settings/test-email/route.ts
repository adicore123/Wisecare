import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendTestEmail } from '@/services/email';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    // Sends an email from the clinic's Gmail — superadmin only
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל המערכת בלבד' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const to = String(body.to || '').trim();

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'נא להזין כתובת מייל תקינה לבדיקה' }, { status: 400 });
    }

    await db.ensureLoaded();
    const result = await sendTestEmail(to);
    if (!result.sent) {
      return NextResponse.json({ success: false, error: result.error || 'השליחה נכשלה' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Test Email Error]', err);
    return NextResponse.json({
      success: false,
      error: 'אירעה שגיאה בשליחת מייל הבדיקה. אנא בדוק את הגדרות ה-Gmail.'
    }, { status: 500 });
  }
}
