import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';
import { normalizePhone, isTestPhoneNumber } from '@/lib/phoneHelpers';
import { hashPassword, generateSecurePassword } from '@/lib/security';

function generatePortalCode(firstName: string): string {
  const cleanName = (firstName || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'client';
  const randomNum = crypto.randomInt(100000, 999999);
  return `${cleanName}-${randomNum}`;
}

function generatePin(): string {
  return crypto.randomInt(1000, 9999).toString();
}

export async function GET(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedTherapistId = searchParams.get('therapistId');

    // Strict Tenant Scope: Therapists can only fetch their own clients
    const effectiveTherapistId = auth.role === 'therapist' ? auth.userId : requestedTherapistId;

    const clientsCollection = db.collection('clients');
    const tasksCollection = db.collection('tasks');

    const filter = effectiveTherapistId ? { therapistId: effectiveTherapistId } : {};
    let clientsList = clientsCollection.find(filter);

    // Filter out archived clients
    clientsList = clientsList.filter((c: any) => !c.archived);

    const enriched = clientsList.map((c: any) => {
      const clientTasks = tasksCollection.find({ clientId: c.id });
      const completedTasks = clientTasks.filter((t: any) => t.completed).length;
      return {
        ...c,
        tasksTotal: clientTasks.length,
        tasksCompleted: completedTasks,
        tasksPending: clientTasks.length - completedTasks
      };
    });

    return NextResponse.json(enriched);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const body = await request.json();
    const {
      therapistId,
      firstName,
      lastName,
      phone,
      age,
      gender,
      notes,
      sendWhatsAppNow,
      username: rawUsername,
      password: inputPassword
    } = body;

    if (!firstName || !lastName || !phone) {
      return NextResponse.json({ error: 'שם פרטי, שם משפחה ומספר טלפון הינם שדות חובה' }, { status: 400 });
    }

    if (!therapistId) {
      return NextResponse.json({ error: 'חסר מזהה מטפל (therapistId)' }, { status: 400 });
    }

    const clients = db.collection('clients');
    const users = db.collection('users');
    const therapist = users.findById(therapistId);

    // Enforce phone uniqueness rule with test number whitelist
    const cleanPhone = normalizePhone(phone);
    if (!isTestPhoneNumber(cleanPhone)) {
      const existingClientWithPhone = clients.findOne((c: any) => 
        !c.archived && normalizePhone(c.phone) === cleanPhone
      );
      if (existingClientWithPhone) {
        return NextResponse.json({
          error: `מספר טלפון זה (${phone}) כבר קיים במערכת עבור לקוח אחר (${existingClientWithPhone.firstName} ${existingClientWithPhone.lastName}). לא ניתן לפתוח משתמשים כפולים עם אותו מספר טלפון (למעט מספר הבדיקות המורשה 0509611808).`
        }, { status: 400 });
      }
    }

    // Determine Username
    let chosenUsername = rawUsername ? String(rawUsername).trim() : '';
    if (!chosenUsername) {
      const cleanFirst = (firstName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '');
      chosenUsername = cleanFirst ? `${cleanFirst}${crypto.randomInt(100, 999)}` : `client${crypto.randomInt(1000, 9999)}`;
    }

    // Check username uniqueness
    const existingUsername = clients.findOne((c: any) => 
      !c.archived && c.username && c.username.toLowerCase() === chosenUsername.toLowerCase()
    );
    if (existingUsername) {
      return NextResponse.json({
        error: `שם המשתמש "${chosenUsername}" כבר תפוס במערכת. אנא בחר/י שם משתמש אחר.`
      }, { status: 400 });
    }

    // Determine Password
    let rawPassword = inputPassword ? String(inputPassword).trim() : '';
    if (!rawPassword) {
      rawPassword = generateSecurePassword(8);
    }
    const hashedPassword = hashPassword(rawPassword);

    const portalCode = generatePortalCode(firstName);
    const pin = generatePin();

    const newClient = clients.insertOne({
      therapistId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      username: chosenUsername,
      password: hashedPassword,
      initialPassword: rawPassword,
      hasPassword: true,
      age: Number(age) || null,
      gender: gender || 'זכר',
      notes: notes ? notes.trim() : '',
      portalCode,
      pin,
      whatsappStatus: 'not_sent',
      lastSentAt: null
    });

    let whatsappResult: any = null;

    if (sendWhatsAppNow) {
      try {
        const settings = db.getSettings();
        const clientAppUrl = getBaseUrl(request);
        const portalUrl = `${clientAppUrl}/portal/${portalCode}`;

        let message = settings.defaultMessageTemplate ||
          'שלום {{firstName}} יקר/ה,\nנפתח עבורך המרחב האישי המאובטח להמשך תרגול ומשימות טיפוליות עם {{therapistName}}.\n\nלהלן פרטי הגישה האישיים שלך למרחב:\n🔗 קישור:\n{{portalUrl}}\n\n👤 שם משתמש: {{username}}\n🔑 סיסמה: {{password}}\n\nמאחלים לך מסע טיפולי פורה ומעצים! ✨';

        message = message
          .replace(/{{firstName}}/g, newClient.firstName)
          .replace(/{{lastName}}/g, newClient.lastName)
          .replace(/{{therapistName}}/g, therapist ? therapist.name : 'המטפל/ת שלך')
          .replace(/{{portalUrl}}/g, portalUrl)
          .replace(/{{username}}/g, newClient.username || newClient.phone)
          .replace(/{{password}}/g, rawPassword)
          .replace(/{{pin}}/g, pin);

        whatsappResult = await sendWhatsAppMessage({
          phone: newClient.phone,
          message
        });

        clients.updateById(newClient.id, {
          whatsappStatus: 'sent',
          lastSentAt: new Date().toISOString()
        });
        newClient.whatsappStatus = 'sent';
        newClient.lastSentAt = new Date().toISOString();
      } catch (err: any) {
        console.error('Error sending WhatsApp message on creation:', err.message);
        whatsappResult = {
          success: false,
          error: err.message
        };
        clients.updateById(newClient.id, {
          whatsappStatus: 'failed',
          whatsappError: err.message
        });
      }
    }

    await db.flush();

    return NextResponse.json({
      client: newClient,
      whatsappResult
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאת שרת פנימית';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
