import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { checkWhatsAppThrottle } from '@/lib/rateLimit';
import { generateLinkToken } from '@/lib/linkToken';
import { getBaseUrl } from '@/lib/urlHelpers';
import { buildQuoteMessageForLead } from '@/lib/quoteHelpers';

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

    const quotes = db.collection('quotes');
    const quote = quotes.findById(id);
    if (!quote) {
      return NextResponse.json({ error: 'הצעת המחיר לא נמצאה' }, { status: 404 });
    }

    // Strict Tenant Scope
    if (auth.role === 'therapist' && quote.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לשלוח הצעה זו' }, { status: 403 });
    }

    if (quote.status === 'confirmed' || quote.status === 'declined') {
      return NextResponse.json(
        { error: 'הצעה זו כבר נענתה על ידי הלקוח ולא ניתן לשלוח אותה מחדש' },
        { status: 409 }
      );
    }
    if (!quote.options || quote.options.length === 0) {
      return NextResponse.json({ error: 'ההצעה אינה כוללת אפשרויות מחיר' }, { status: 400 });
    }

    const throttle = checkWhatsAppThrottle(quote.leadPhone);
    if (!throttle.allowed) {
      return NextResponse.json({ error: throttle.reason || 'המתנה קצרה בין שליחות לאותו מספר' }, { status: 429 });
    }

    // Each send mints a fresh token — links from previous sends stop working
    const { token, hash } = generateLinkToken();
    const quoteUrl = `${getBaseUrl(request)}/quote/${quote.id}/${token}`;

    quotes.updateById(quote.id, {
      status: 'sent',
      confirmTokenHash: hash,
      sentAt: new Date().toISOString(),
      selectedOptionId: null,
      decidedAt: null
    });

    let whatsappSent = false;
    let whatsappError: string | null = null;
    try {
      await sendWhatsAppMessage({
        phone: quote.leadPhone,
        message: buildQuoteMessageForLead(quote, quoteUrl)
      });
      whatsappSent = true;
    } catch (err: any) {
      console.warn('[Quote Send WhatsApp Warning]', err.message);
      whatsappError = err.message;
    }

    quotes.updateById(quote.id, {
      notificationStatus: whatsappSent ? 'sent' : 'failed',
      notificationError: whatsappError
    });

    db.logAudit({
      actor: auth.username,
      actorRole: auth.role,
      action: 'quote_sent',
      targetId: quote.id,
      targetType: 'quotes',
      details: { leadName: quote.leadName, whatsappSent }
    });

    await db.flush();

    return NextResponse.json({
      success: true,
      whatsappSent,
      whatsappError,
      quoteUrl,
      message: whatsappSent
        ? 'ההצעה נשלחה בהצלחה בוואטסאפ ללקוח 📲'
        : 'ההצעה סומנה כנשלחה אך שליחת הוואטסאפ נכשלה — ניתן להעתיק את הקישור ולשלוח ידנית'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליחת ההצעה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
