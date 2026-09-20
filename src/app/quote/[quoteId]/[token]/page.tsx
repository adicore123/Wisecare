import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { isLinkTokenFormat, verifyLinkToken } from '@/lib/linkToken';
import { publicQuoteView } from '@/lib/quoteHelpers';
import QuoteDecisionClient from '@/components/QuoteDecisionClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'הצעת מחיר | WiseCare',
  robots: { index: false, follow: false }
};

export default async function QuotePage(
  props: { params: Promise<{ quoteId: string; token: string }> }
) {
  const { quoteId, token } = await props.params;

  const validToken = isLinkTokenFormat(token);
  let view: ReturnType<typeof publicQuoteView> | null = null;

  if (validToken) {
    await db.ensureLoaded().catch(() => {});
    const quote = db.collection('quotes').findById(quoteId);
    if (quote && quote.confirmTokenHash && verifyLinkToken(token, quote.confirmTokenHash)) {
      const settings = db.getSettings();
      view = publicQuoteView(quote, settings.clinicName || 'WiseCare');
    }
  }

  return <QuoteDecisionClient quote={view} token={token} />;
}
