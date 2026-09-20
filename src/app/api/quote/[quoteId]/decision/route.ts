import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { checkRateLimit, checkWhatsAppThrottle } from '@/lib/rateLimit';
import { isLinkTokenFormat, verifyLinkToken } from '@/lib/linkToken';
import { getBaseUrl } from '@/lib/urlHelpers';
import { buildQuoteDecisionMessageForTherapist } from '@/lib/quoteHelpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quote/{quoteId}/decision  (public — the link token is the credential)
 * Body: { token, decision: 'confirm' | 'decline', selectedOptionId? }
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ quoteId: string }> }
) {
  try {
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
    const rate = checkRateLimit(`quote-decision:${ip}`, 10, 60);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'בוצעו יותר מדי ניסיונות. נסה/י שוב בעוד דקה.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter || 60) } }
      );
    }

    const { quoteId } = await props.params;
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '');
    const decision = body.decision === 'decline' ? 'decline' : 'confirm';

    if (!isLinkTokenFormat(token)) {
      return NextResponse.json({ error: 'קישור שגוי או שפג תוקפו' }, { status: 403 });
    }

    await db.ensureLoaded();

    const quotes = db.collection('quotes');
    const quote = quotes.findById(quoteId);
    if (!quote || !quote.confirmTokenHash || !verifyLinkToken(token, quote.confirmTokenHash)) {
      return NextResponse.json({ error: 'קישור שגוי או שפג תוקפו' }, { status: 403 });
    }
    if (quote.status !== 'sent') {
      // Idempotent re-open of an already-decided quote — reflect the current state
      return NextResponse.json({
        success: true,
        alreadyDecided: true,
        status: quote.status,
        selectedOptionId: quote.selectedOptionId
      });
    }

    // Validate the chosen option on confirmation
    let selectedOptionId: string | null = null;
    if (decision === 'confirm') {
      const options = Array.isArray(quote.options) ? quote.options : [];
      if (options.length === 0) {
        return NextResponse.json({ error: 'ההצעה אינה תקינה — נא לפנות למטפל/ת' }, { status: 400 });
      }
      const selected = options.find((o: any) => o.id === body.selectedOptionId) || options[0];
      selectedOptionId = selected.id;
    }

    const decidedAt = new Date().toISOString();
    const updated = quotes.updateById(quote.id, {
      status: decision === 'confirm' ? 'confirmed' : 'declined',
      selectedOptionId,
      decidedAt
    });

    db.logAudit({
      actor: `lead:${quote.leadName}`,
      actorRole: 'lead',
      action: decision === 'confirm' ? 'quote_confirmed' : 'quote_declined',
      targetId: quote.id,
      targetType: 'quotes',
      details: { selectedOptionId, leadPhoneMasked: `${String(quote.leadPhone).slice(-4)}` }
    });

    // Notify the therapist via WhatsApp (best-effort, throttled)
    let therapistNotified = false;
    let notifyError: string | null = null;
    const therapist = quote.therapistId ? db.collection('users').findById(quote.therapistId) as any : null;
    if (therapist?.phone) {
      const throttle = checkWhatsAppThrottle(therapist.phone);
      if (throttle.allowed) {
        try {
          const baseUrl = getBaseUrl(request);
          const quotesScreenUrl = `${baseUrl}/crm/${encodeURIComponent(therapist.loginCode || '')}/quotes`;
          await sendWhatsAppMessage({
            phone: therapist.phone,
            message: buildQuoteDecisionMessageForTherapist(
              { ...quote, selectedOptionId },
              decision === 'confirm' ? 'confirmed' : 'declined',
              quotesScreenUrl
            )
          });
          therapistNotified = true;
        } catch (err: any) {
          notifyError = err.message;
          console.warn('[Quote Decision WhatsApp Warning]', err.message);
        }
      } else {
        notifyError = 'throttled';
      }
    }

    quotes.updateById(quote.id, {
      notificationStatus: therapistNotified ? 'sent' : 'failed',
      notificationError: notifyError
    });

    await db.flush();

    return NextResponse.json({
      success: true,
      status: updated.status,
      selectedOptionId,
      therapistNotified
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשמירת האישור';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
