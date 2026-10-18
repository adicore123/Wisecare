import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { sendLoginDetailsEmail } from '@/services/email';
import { isSpaceLeadEmailEnabled, sendSpaceLeadEmails } from '@/services/spaceLeadEmail';
import { hashPassword } from '@/lib/security';
import { createSessionCookie, signClientToken } from '@/lib/auth';
import { getBaseUrl } from '@/lib/urlHelpers';
import { normalizePhone, isTestPhoneNumber } from '@/lib/phoneHelpers';

export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
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

    const emailRegex = /^[^\s@<>,;:]+@[^\s@<>,;:]+\.[^\s@<>,;:]{2,}$/;
    if (!email || !String(email).trim() || !emailRegex.test(String(email).trim())) {
      return NextResponse.json({ error: 'נא להזין כתובת אימייל תקינה לשחזור סיסמה' }, { status: 400 });
    }
    if (!username || String(username).trim().length < 3) {
      return NextResponse.json({ error: 'שם משתמש חייב להכיל לפחות 3 תווים' }, { status: 400 });
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'סיסמה חייבת להכיל לפחות 8 תווים' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length > 1024 || /[\r\n\u0000]/.test(password)) {
      return NextResponse.json({ error: 'הסיסמה אינה תקינה. יש להזין עד 1024 תווים ללא מעברי שורה.' }, { status: 400 });
    }

    const cleanFirst = String(firstName).trim();
    const cleanLast = String(lastName || '').trim();
    const cleanPhone = String(phone).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = String(username).trim().toLowerCase();
    const isSpaceRegistration = body.source === 'space';

    if ([cleanFirst, cleanLast, cleanPhone, cleanEmail, cleanUsername, String(goal)].some(value => /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value))) {
      return NextResponse.json({ error: 'נא להזין פרטים תקינים ללא תווי בקרה.' }, { status: 400 });
    }
    if (!/^[+\d\s().-]{9,40}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, '').length < 9) {
      return NextResponse.json({ error: 'נא להזין מספר וואטספ תקין.' }, { status: 400 });
    }
    if (cleanFirst.length > 100 || cleanLast.length > 150 || cleanPhone.length > 40 || cleanEmail.length > 254 || cleanUsername.length > 100 || String(goal).length > 120) {
      return NextResponse.json({ error: 'אחד הפרטים ארוך מדי. נא לבדוק את הטופס.' }, { status: 400 });
    }

    const clients = db.collection('clients');
    const users = db.collection('users');

    // 1. Check if username is already taken
    const existingClientByUsername = clients.findOne((c: any) => (c.username || '').toLowerCase() === cleanUsername);
    const existingUserByUsername = users.findOne((u: any) => (u.username || '').toLowerCase() === cleanUsername);
    if (existingClientByUsername || existingUserByUsername) {
      return NextResponse.json({ error: 'שם משתמש זה כבר תפוס במערכת. נא לבחור שם משתמש אחר.' }, { status: 400 });
    }

    // 2. Check if phone is already registered. The authorized QA number
    // (0509611808) is exempt and may open unlimited test accounts.
    if (!isTestPhoneNumber(cleanPhone)) {
      const normalized = normalizePhone(cleanPhone);
      const existingClientByPhone = clients.findOne((c: any) =>
        c.phone && normalizePhone(c.phone) === normalized
      );
      if (existingClientByPhone) {
        return NextResponse.json({
          error: 'מספר טלפון זה כבר רשום במערכת. אנא התחבר/י עם שם המשתמש והסיסמה שלך, או השתמש/י בשחזור סיסמה.'
        }, { status: 400 });
      }
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

    // Email links use a trusted configured origin, rather than a caller's Host header.
    const clientAppUrl = isSpaceRegistration && isSpaceLeadEmailEnabled()
      ? getBaseUrl()
      : getBaseUrl(request);
    const portalUrl = `${clientAppUrl}/portal/${encodeURIComponent(client.portalCode)}`;

    // Persist the account before sending any external notifications.
    await db.flush();

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

    // /space uses Apps Script when configured; otherwise retain the existing provider.
    // Failure does not roll back an account that was already created.
    let emailSent = false;
    let emailError: string | null = null;
    let adminEmailSent = false;
    try {
      const settings: any = db.getSettings();
      if (isSpaceRegistration && isSpaceLeadEmailEnabled()) {
        const delivery = await sendSpaceLeadEmails({
          id: client.id,
          fullName: [cleanFirst, cleanLast].filter(Boolean).join(' '),
          phone: cleanPhone,
          email: cleanEmail,
          username: cleanUsername,
          password,
          goal: String(goal || '').trim(),
          portalUrl,
          createdAt: client.createdAt
        });
        emailSent = delivery.userSent;
        adminEmailSent = delivery.adminSent;
        emailError = delivery.error || null;
        clients.updateOne({ id: client.id }, {
          spaceEmailDelivery: { ...delivery, attemptedAt: new Date().toISOString() }
        });
        if (delivery.error) console.warn('[Space Email]', delivery.error);
      } else if (settings?.autoSendLoginEmail !== false && client.email) {
        const result = await sendLoginDetailsEmail({
          to: client.email,
          firstName: client.firstName,
          username: client.username,
          password,
          portalUrl
        });
        emailSent = result.sent;
        emailError = result.error || null;
      }
    } catch (err: any) {
      console.warn('[Login Email Warning]', err.message);
      emailError = err.message;
    }

    // התראת רישום חדש למנהל — לפי הגדרות הסופראדמין. כישלון שקט: לא חוסם רישום.
    let registrationNotifySent = false;
    try {
      const settings: any = db.getSettings();
      if (settings?.autoSendSelfCareRegistrationWhatsApp && settings?.selfCareRegistrationNotifyPhone) {
        const GOAL_LABELS: Record<string, string> = {
          calm: 'רוגע והרפיה',
          habits: 'הרגלים בריאים',
          mood: 'שיפור מצב הרוח',
          growth: 'התפתחות אישית',
          sessions: 'תיעוד מפגשים',
          content: 'תכנים'
        };
        const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ');
        const template = settings.selfCareRegistrationNotificationTemplate ||
          '🌟 רישום חדש במרחב האישי!\n\n👤 שם: {{fullName}}\n📱 וואטספ: {{phone}}\n✉️ אימייל: {{email}}\n🔑 שם משתמש: {{username}}\n🎯 יעד: {{goal}}\n🔗 המרחב: {{portalUrl}}';
        const notifyMessage = template
          .replace(/\{\{fullName\}\}/g, fullName)
          .replace(/\{\{phone\}\}/g, client.phone || '')
          .replace(/\{\{email\}\}/g, client.email || '')
          .replace(/\{\{username\}\}/g, client.username || '')
          .replace(/\{\{goal\}\}/g, GOAL_LABELS[String(goal)] || 'לא צוין')
          .replace(/\{\{portalUrl\}\}/g, portalUrl);
        await sendWhatsAppMessage({ phone: settings.selfCareRegistrationNotifyPhone, message: notifyMessage });
        registrationNotifySent = true;
      }
    } catch (err: any) {
      console.warn('[WhatsApp Registration Notify Warning]', err.message);
    }

    const token = signClientToken(client);
    await db.flush();

    const response = NextResponse.json({
      success: true,
      portalCode: client.portalCode,
      portalUrl,
      token,
      whatsappSent,
      whatsappError,
      emailSent,
      emailError,
      adminEmailSent,
      registrationNotifySent,
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
    response.headers.append('Set-Cookie', createSessionCookie(token, 'wisecare_client_token'));
    return response;
  } catch (error: any) {
    console.error('[Portal Join Error]', error);
    return NextResponse.json({ error: 'אירעה שגיאה ביצירת המרחב האישי. אנא נסה שוב.' }, { status: 500 });
  }
}
