import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/security';
import { signClientToken, createSessionCookie } from '@/lib/auth';

interface RouteProps {
  params: Promise<{ portalCode: string }>;
}

export async function POST(request: NextRequest, props: RouteProps) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;

    if (!portalCode) {
      return NextResponse.json({ error: 'חסר מזהה פורטל' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !String(username).trim()) {
      return NextResponse.json({ error: 'נא לבחור שם משתמש' }, { status: 400 });
    }

    if (!password || String(password).trim().length < 4) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 4 תווים' }, { status: 400 });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const cleanUsernameLower = cleanUsername.toLowerCase();

    const clients = db.collection('clients');
    const users = db.collection('users');

    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    // Check if username is already taken by another client
    const existingClient = clients.findOne((c: any) =>
      c.id !== client.id && !c.archived && c.username && c.username.toLowerCase() === cleanUsernameLower
    );
    if (existingClient) {
      return NextResponse.json({ error: `שם המשתמש "${cleanUsername}" כבר תפוס במערכת. אנא בחר/י שם משתמש אחר.` }, { status: 400 });
    }

    // Check if username is taken in users collection
    const existingUser = users.findOne((u: any) =>
      u.username && u.username.toLowerCase() === cleanUsernameLower
    );
    if (existingUser) {
      return NextResponse.json({ error: `שם המשתמש "${cleanUsername}" כבר שמור במערכת. אנא בחר/י שם משתמש אחר.` }, { status: 400 });
    }

    const hashedPassword = hashPassword(cleanPassword);

    const updated = clients.updateById(client.id, {
      username: cleanUsername,
      password: hashedPassword,
      initialPassword: cleanPassword,
      hasPassword: true,
      credentialsSetAt: new Date().toISOString()
    });

    await db.flush();

    const token = signClientToken(updated);

    const response = NextResponse.json({
      success: true,
      message: 'פרטי ההתחברות האישיים נקבעו בהצלחה! ברוך/ה הבא/ה למרחב שלך.',
      client: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        username: updated.username,
        phone: updated.phone,
        portalCode: updated.portalCode
      },
      token
    });

    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
    return response;
  } catch (error: any) {
    console.error('[Set Credentials Error]', error);
    return NextResponse.json({ error: error.message || 'שגיאה בעדכון פרטי ההתחברות' }, { status: 500 });
  }
}
