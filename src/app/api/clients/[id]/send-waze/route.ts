import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/clients/[id]/send-waze
 * Sends the client a WhatsApp message with a Waze navigation link to the
 * clinic, built from the address defined in the therapist's settings
 * (clinicAddress / clinicCity / clinicFloor / clinicArrivalInstructions).
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    await db.ensureLoaded();

    const client = db.collection('clients').findById(id);
    if (!client) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }

    // Strict Tenant Scope Guard
    if (auth.role === 'therapist' && client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין לך הרשאה לשלוח הודעה למטופל זה' }, { status: 403 });
    }

    if (!client.phone || client.phone.replace(/\D/g, '').length < 9) {
      return NextResponse.json({ error: 'ללקוח זה אין מספר טלפון תקין לשליחה' }, { status: 400 });
    }

    const settings = db.getSettings();
    const fullAddress = [settings.clinicAddress, settings.clinicCity]
      .map((part: string) => (part || '').trim())
      .filter(Boolean)
      .join(', ');

    if (!fullAddress) {
      return NextResponse.json(
        { error: 'לא הוגדרה כתובת קליניקה — יש להזין כתובת בהגדרות המערכת תחילה' },
        { status: 400 }
      );
    }

    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(fullAddress)}`;

    const lines: string[] = [
      `שלום ${client.firstName} יקר/ה,`,
      '',
      `להלן קישור ניווט לקליניקה בוויז 🧭`,
      `📍 ${settings.clinicName || 'הקליניקה'} — ${fullAddress}`
    ];
    if (settings.clinicFloor) {
      lines.push(`🏢 ${settings.clinicFloor}`);
    }
    lines.push('', `🚗 ניווט בוויז:`, wazeUrl);
    if (settings.clinicArrivalInstructions) {
      lines.push('', `ℹ️ ${settings.clinicArrivalInstructions}`);
    }
    lines.push('', 'מחכים לך! 🌿');

    const result = await sendWhatsAppMessage({
      phone: client.phone,
      message: lines.join('\n')
    });

    // The invite-tracking whatsappStatus column stays untouched — this is a
    // navigation message; only the last-contact timestamp updates.
    db.collection('clients').updateById(client.id, {
      lastSentAt: new Date().toISOString()
    });
    await db.flush();

    return NextResponse.json({
      success: true,
      result,
      wazeUrl,
      message: 'קישור הניווט בוויז נשלח ללקוח בהצלחה'
    });
  } catch (err: any) {
    console.error('[Client Waze Navigation Error]', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'אירעה שגיאה בשליחת ניווט הוויז. אנא נסה/י שוב מאוחר יותר.'
    }, { status: 500 });
  }
}
