import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();
    const body = await request.json().catch(() => ({}));
    const { customMessage } = body;

    const clients = db.collection('clients');
    const users = db.collection('users');

    const client = clients.findById(id);
    if (!client) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope Guard: a therapist cannot message another therapist's patient
    if (auth.role === 'therapist' && client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין לך הרשאה לשלוח הודעה למטופל זה' }, { status: 403 });
    }

    const therapist = users.findById(client.therapistId);
    const settings = db.getSettings();
    const clientAppUrl = getBaseUrl(request);
    const portalUrl = `${clientAppUrl}/portal/${client.portalCode}`;

    let message = customMessage;
    if (!message) {
      message = settings.defaultMessageTemplate ||
        'שלום {{firstName}} יקר/ה,\nנפתח עבורך המרחב האישי המאובטח להמשך תרגול ומשימות טיפוליות עם {{therapistName}}.\n\nלהלן פרטי הגישה האישיים שלך למרחב:\n🔗 קישור:\n{{portalUrl}}\n\n👤 שם משתמש: {{username}}\n🔑 סיסמה: {{password}}\n\nמאחלים לך מסע טיפולי פורה ומעצים! ✨';

      message = message
        .replace(/{{firstName}}/g, client.firstName)
        .replace(/{{lastName}}/g, client.lastName)
        .replace(/{{therapistName}}/g, therapist ? therapist.name : 'המטפל/ת שלך')
        .replace(/{{portalUrl}}/g, portalUrl)
        .replace(/{{username}}/g, client.username || client.phone)
        .replace(/{{password}}/g, client.initialPassword || client.pin || 'ניתן לאפס דרך "שכחתי סיסמה" במסך הכניסה')
        .replace(/{{pin}}/g, client.pin);
    }

    const result = await sendWhatsAppMessage({
      phone: client.phone,
      message
    });

    clients.updateById(client.id, {
      whatsappStatus: 'sent',
      lastSentAt: new Date().toISOString()
    });

    await db.flush();
    return NextResponse.json({
      success: true,
      result,
      message: 'הודעת וואטסאפ נשלחה בהצלחה'
    });
  } catch (err: any) {
    console.error('[Client WhatsApp Error]', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'אירעה שגיאה בשליחת הודעת WhatsApp. אנא נסה/י שוב מאוחר יותר.'
    }, { status: 500 });
  }
}
