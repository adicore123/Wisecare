import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { hashPassword, generateSecurePassword } from '@/lib/security';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, props: RouteProps) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const clients = db.collection('clients');
    const users = db.collection('users');

    const client = clients.findById(id);
    if (!client) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope Guard
    if (auth.role === 'therapist' && client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין לך הרשאה לנהל לקוח זה' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    let rawPassword = body.newPassword ? String(body.newPassword).trim() : '';

    if (!rawPassword) {
      // Generate readable 8-character password
      const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let pass = '';
      for (let i = 0; i < 8; i++) {
        pass += chars.charAt(crypto.randomInt(0, chars.length));
      }
      rawPassword = pass;
    }

    const hashedPassword = hashPassword(rawPassword);

    // If client does not have a username yet, generate one
    let currentUsername = client.username;
    if (!currentUsername) {
      const cleanFirst = (client.firstName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '');
      currentUsername = cleanFirst ? `${cleanFirst}_${crypto.randomInt(100, 999)}` : `client_${crypto.randomInt(1000, 9999)}`;
    }

    clients.updateById(client.id, {
      username: currentUsername,
      password: hashedPassword,
      initialPassword: rawPassword,
      hasPassword: true,
      credentialsUpdatedAt: new Date().toISOString()
    });

    const therapist = users.findById(client.therapistId);
    const therapistName = therapist?.name || 'המטפל/ת שלך';
    const baseUrl = getBaseUrl(request);
    const portalUrl = `${baseUrl}/portal/${encodeURIComponent(client.portalCode)}`;
    const loginUrl = `${baseUrl}/login`;

    const message = `שלום ${client.firstName} יקר/ה,\nפרטי הגישה למרחב הטיפולי האישי שלך ב-WiseCare עודכנו בהצלחה ✨\n\n👤 *שם משתמש:* ${currentUsername}\n🔑 *סיסמה:* ${rawPassword}\n\n🌐 *כניסה ישירה למרחב האישי שלך:*\n${portalUrl}\n\n🔗 *דף ההתחברות הראשי למערכת:*\n${loginUrl}\n\nבברכה,\n${therapistName}`;

    let whatsappSent = false;
    let whatsappError = null;

    try {
      await sendWhatsAppMessage({
        phone: client.phone,
        message
      });
      whatsappSent = true;
      clients.updateById(client.id, {
        whatsappStatus: 'sent',
        lastSentAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn('[Password WhatsApp Send Error]:', err.message);
      whatsappError = err.message;
      clients.updateById(client.id, {
        whatsappStatus: 'failed',
        whatsappError: err.message
      });
    }

    await db.flush();

    return NextResponse.json({
      success: true,
      message: whatsappSent
        ? 'הסיסמה עודכנה ונשלחה בהצלחה בוואטסאפ ללקוח! 📲'
        : `הסיסמה עודכנה במערכת אך חלה שגיאה בשליחת הוואטסאפ: ${whatsappError}`,
      newPassword: rawPassword,
      username: currentUsername,
      whatsappSent,
      whatsappError
    });
  } catch (error: any) {
    console.error('[Reset Password WhatsApp Error]', error);
    return NextResponse.json({ error: error.message || 'שגיאה בעדכון ושליחת הסיסמה' }, { status: 500 });
  }
}
