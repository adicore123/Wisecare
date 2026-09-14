import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/security';
import { signClientToken } from '@/lib/auth';
import { getBaseUrl } from '@/lib/urlHelpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { identifier, code, newPassword } = body;

    if (!identifier || !code || !newPassword) {
      return NextResponse.json({ error: 'נא למלא את כל השדות' }, { status: 400 });
    }

    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: 'סיסמה חדשה חייבת להכיל לפחות 8 תווים' }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const cleanCode = String(code).trim();
    const clients = db.collection('clients');

    const client = clients.findOne((c: any) =>
      (c.username && c.username.toLowerCase() === cleanId) ||
      (c.email && c.email.toLowerCase() === cleanId) ||
      (c.phone && c.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (!client || !client.resetOtp) {
      return NextResponse.json({ error: 'בקשת איפוס לא נמצאה או שפג תוקפה. אנא בקש/י קוד חדש.' }, { status: 400 });
    }

    if (new Date(client.resetOtp.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'תוקף קוד האימות פג. אנא בקש/י קוד חדש.' }, { status: 400 });
    }

    if (client.resetOtp.code !== cleanCode) {
      return NextResponse.json({ error: 'קוד האימות שהוזן אינו נכון.' }, { status: 400 });
    }

    const passwordHash = hashPassword(String(newPassword).trim());
    clients.updateById(client.id, {
      password: passwordHash,
      resetOtp: null
    });

    const clientAppUrl = getBaseUrl(request);
    const portalUrl = `${clientAppUrl}/portal/${encodeURIComponent(client.portalCode)}`;
    const token = signClientToken(client);

    return NextResponse.json({
      success: true,
      message: 'הסיסמה אופסה בהצלחה!',
      portalCode: client.portalCode,
      portalUrl,
      token
    });
  } catch (error: any) {
    console.error('[Forgot Password Reset Error]', error);
    return NextResponse.json({ error: 'אירעה שגיאה באיפוס הסיסמה.' }, { status: 500 });
  }
}
