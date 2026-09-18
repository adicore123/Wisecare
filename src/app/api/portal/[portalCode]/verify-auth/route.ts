import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/security';
import { createSessionCookie, getClientAuthFromRequest, signClientToken } from '@/lib/auth';
import { normalizePhone } from '@/lib/phoneHelpers';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  const { portalCode } = await props.params;
  const auth = getClientAuthFromRequest(request);
  if (!auth || auth.portalCode !== portalCode) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  await db.ensureLoaded();
  const client = db.collection('clients').findById(auth.clientId);
  if (!client || client.portalCode !== portalCode || client.status === 'inactive' || client.portalEnabled === false) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const token = signClientToken(client);
  const response = NextResponse.json({ authenticated: true, token });
  response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
  return response;
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'נא להזין שם משתמש וסיסמה' },
        { status: 400 }
      );
    }

    const clients = db.collection('clients');
    const client = clients.findOne({ portalCode });

    if (!client) {
      return NextResponse.json(
        { error: 'מרחב אישי לא נמצא' },
        { status: 404 }
      );
    }

    // If client has no password configured yet, allow login
    if (!client.password && !client.initialPassword) {
      const token = signClientToken(client);
      const response = NextResponse.json({ success: true, token });
      response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
      return response;
    }

    const cleanInput = String(username).trim().toLowerCase();
    const clientUsername = (client.username || '').toLowerCase();
    const clientPhoneClean = normalizePhone(client.phone);
    const inputPhoneClean = normalizePhone(cleanInput);

    // Verify username or phone match
    const isIdentityMatch =
      cleanInput === clientUsername ||
      (clientPhoneClean && inputPhoneClean && clientPhoneClean === inputPhoneClean);

    if (!isIdentityMatch) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים.' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid =
      (client.password && verifyPassword(password, client.password)) ||
      (client.initialPassword && client.initialPassword === password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים.' },
        { status: 401 }
      );
    }

    const token = signClientToken(client);

    const response = NextResponse.json({
      success: true,
      token,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        username: client.username || client.firstName,
        portalCode: client.portalCode
      }
    });
    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
    return response;
  } catch (err: any) {
    console.error('[Portal Verify Auth Error]', err);
    return NextResponse.json(
      { error: 'שגיאה באימות פרטי ההתחברות' },
      { status: 500 }
    );
  }
}
