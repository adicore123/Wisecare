import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { hashPassword } from '@/lib/security';
import { signClientToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let { firstName, lastName = '', fullName, phone, email = '', username = '', password = '', goal = '' } = body;

    if (!firstName && fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    if (!firstName || !String(firstName).trim()) {
      return NextResponse.json({ error: 'נא להזין שם מלא או שם פרטי' }, { status: 400 });
    }
    if (!phone || !String(phone).trim()) {
      return NextResponse.json({ error: 'נא להזין מספר טלפון לקבלת הודעות ב-WhatsApp' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !String(email).trim() || !emailRegex.test(String(email).trim())) {
      return NextResponse.json({ error: 'נא להזין כתובת אימייל תקינה לשחזור סיסמה' }, { status: 400 });
    }
    if (!username || String(username).trim().length < 3) {
      return NextResponse.json({ error: 'שם משתמש חייב להכיל לפחות 3 תווים' }, { status: 400 });
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'סיסמה חייבת להכיל לפחות 8 תווים' }, { status: 400 });
    }

    const cleanFirst = String(firstName).trim();
    const cleanLast = String(lastName || '').trim();
    const cleanPhone = String(phone).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = String(username).trim().toLowerCase();

    const clients = db.collection('clients');
    const users = db.collection('users');

    // 1. Check if username is already taken
    const existingClientByUsername = clients.findOne((c: any) => (c.username || '').toLowerCase() === cleanUsername);
    const existingUserByUsername = users.findOne((u: any) => (u.username || '').toLowerCase() === cleanUsername);
    if (existingClientByUsername || existingUserByUsername) {
      return NextResponse.json({ error: 'שם משתמש זה כבר תפוס במערכת. נא לבחור שם משתמש אחר.' }, { status: 400 });
    }

    // 2. Check if phone is already registered
    const existingClientByPhone = clients.findOne({ phone: cleanPhone });
    if (existingClientByPhone) {
      return NextResponse.json({
        error: 'מספר טלפון זה כבר רשום במערכת. אנא התחבר/י עם שם המשתמש והסיסמה שלך, או השתמש/י בשחזור סיסמה.'
      }, { status: 400 });
    }

    // 3. Generate unique portalCode
    const baseSlug = (cleanFirst.toLowerCase().replace(/[^a-z0-9]/g, '') || 'my').slice(0, 15);
    let portalCode = `${baseSlug}-${crypto.randomInt(100000, 999999)}`;
    while (clients.findOne({ portalCode })) {
      portalCode = `${baseSlug}-${crypto.randomInt(100000, 999999)}`;
    }

    // 4. Hash password
    const passwordHash = hashPassword(password);

    // 5. Create client record
    const client = clients.insertOne({
      firstName: cleanFirst,
      lastName: cleanLast,
      phone: cleanPhone,
      email: cleanEmail,
      username: cleanUsername,
      password: passwordHash,
      portalCode,
      therapistId: null,
      isSelfCare: true,
      source: 'self_join',
      goal: String(goal || '').trim(),
      status: 'active',
      createdAt: new Date().toISOString()
    });

    const clientAppUrl = process.env.CLIENT_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalUrl = `${clientAppUrl}/portal/${encodeURIComponent(client.portalCode)}`;

    let whatsappSent = false;
    let whatsappError = null;
    if (body.sendWhatsApp !== false) {
      try {
        const message = `שלום ${client.firstName}, המרחב האישי והמאובטח שלך ב-WiseCare מוכן 🌱\n\nפרטי החשבון שלך:\n👤 שם משתמש: *${client.username}*\n🔑 סיסמה: ${password}\n\nהקישור הישיר למרחב שלך:\n👉 ${portalUrl}\n\nכאן תוכל לנהל משימות, לשמור סרטונים ומאמרים, ולתעד פגישות.\n💡 מומלץ לשמור הודעה זו או להוסיף את הפורטל למסך הבית!`;
        await sendWhatsAppMessage({ phone: client.phone, message });
        whatsappSent = true;
      } catch (err: any) {
        console.warn('[WhatsApp Join Warning]', err.message);
        whatsappError = err.message;
      }
    }

    const token = signClientToken(client);

    return NextResponse.json({
      success: true,
      portalCode: client.portalCode,
      portalUrl,
      token,
      whatsappSent,
      whatsappError,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        username: client.username,
        phone: client.phone,
        email: client.email,
        portalCode: client.portalCode,
        isSelfCare: true
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Portal Join Error]', error);
    return NextResponse.json({ error: 'אירעה שגיאה ביצירת המרחב האישי. אנא נסה שוב.' }, { status: 500 });
  }
}
