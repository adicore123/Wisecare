import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { maskPhone, maskEmail } from '@/lib/security';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { identifier } = body;

    if (!identifier || !String(identifier).trim()) {
      return NextResponse.json({ error: 'נא להזין מספר טלפון, אימייל או שם משתמש' }, { status: 400 });
    }

    // Rate-limit per IP and per identifier — this endpoint sends WhatsApp messages
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
    const ipLimit = checkRateLimit(`forgotpw-ip:${ip}`, 5, 15 * 60);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'בוצעו יותר מדי בקשות איפוס. נסה/י שוב בעוד מספר דקות.' }, { status: 429 });
    }
    const idLimit = checkRateLimit(`forgotpw-id:${String(identifier).trim().toLowerCase()}`, 3, 15 * 60);
    if (!idLimit.allowed) {
      return NextResponse.json({ error: 'בוצעו יותר מדי בקשות איפוס לחשבון זה. נסה/י שוב בעוד מספר דקות.' }, { status: 429 });
    }

    await db.ensureLoaded();

    const cleanId = String(identifier).trim().toLowerCase();
    const clients = db.collection('clients');

    const client = clients.findOne((c: any) =>
      (c.username && c.username.toLowerCase() === cleanId) ||
      (c.email && c.email.toLowerCase() === cleanId) ||
      (c.phone && c.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (!client) {
      return NextResponse.json({ error: 'לא נמצא חשבון התואם לפרטים שהוזנו.' }, { status: 404 });
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    clients.updateById(client.id, {
      resetOtp: {
        code: otpCode,
        expiresAt,
        attempts: 0
      }
    });

    let whatsappSent = false;
    let whatsappError = null;
    try {
      const message = `שלום ${client.firstName},\nקוד האימות שלך לאיפוס סיסמה ב-WiseCare הוא:\n\n🔐 *${otpCode}*\n\nהקוד תקף ל-10 דקות הקרובות. אם לא ביקשת לאפס סיסמה, אנא התעלם מהודעה זו.`;
      await sendWhatsAppMessage({ phone: client.phone, message });
      whatsappSent = true;
    } catch (err: any) {
      console.warn('[Forgot Password WhatsApp Warning]', err.message);
      whatsappError = err.message;
    }

    await db.flush();
    return NextResponse.json({
      success: true,
      whatsappSent,
      whatsappError,
      maskedPhone: maskPhone(client.phone),
      maskedEmail: maskEmail(client.email),
      identifier: client.username || client.phone
    });
  } catch (error: any) {
    console.error('[Forgot Password Request Error]', error);
    return NextResponse.json({ error: 'אירעה שגיאה בשליחת קוד האימות.' }, { status: 500 });
  }
}
