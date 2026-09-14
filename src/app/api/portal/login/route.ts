import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/security';
import { createSessionCookie, signClientToken } from '@/lib/auth';
import { getBaseUrl } from '@/lib/urlHelpers';

export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const body = await request.json().catch(() => ({}));
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'נא להזין שם משתמש (או אימייל/טלפון) וסיסמה' }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const clients = db.collection('clients');

    const client = clients.findOne((c: any) =>
      (c.username && c.username.toLowerCase() === cleanId) ||
      (c.email && c.email.toLowerCase() === cleanId) ||
      (c.phone && c.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (!client) {
      return NextResponse.json({ error: 'פרטי ההתחברות שגויים. לא נמצא משתמש תואם.' }, { status: 401 });
    }

    if (!client.password || !verifyPassword(password, client.password)) {
      return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים.' }, { status: 401 });
    }

    const clientAppUrl = getBaseUrl(request);
    const portalUrl = `${clientAppUrl}/portal/${encodeURIComponent(client.portalCode)}`;
    const token = signClientToken(client);

    const response = NextResponse.json({
      success: true,
      portalCode: client.portalCode,
      portalUrl,
      token,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        username: client.username || client.firstName,
        phone: client.phone,
        email: client.email,
        portalCode: client.portalCode,
        isSelfCare: Boolean(client.isSelfCare || !client.therapistId)
      }
    });
    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
    return response;
  } catch (error: any) {
    console.error('[Portal Login Error]', error);
    return NextResponse.json({ error: 'אירעה שגיאה בהתחברות למערכת.' }, { status: 500 });
  }
}
