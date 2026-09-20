/**
 * Shared validation + WhatsApp message builders for the price-quote module
 * (הצעות מחיר ללקוחות פוטנציאליים).
 */

export type QuotePricingModel = 'single' | 'package';

export interface QuoteOption {
  id: string;
  label: string;
  pricingModel: QuotePricingModel;
  sessionPrice: number;
  sessionsCount: number;
  totalPrice: number;
}

export interface QuoteRecord {
  id: string;
  therapistId: string;
  therapistName: string;
  leadName: string;
  leadPhone: string;
  title: string;
  description: string;
  options: QuoteOption[];
  status: 'draft' | 'sent' | 'confirmed' | 'declined';
  selectedOptionId: string | null;
  confirmTokenHash: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  notificationStatus: 'none' | 'sent' | 'failed';
  notificationError: string | null;
  createdAt: string;
  updatedAt?: string;
}

function cleanMoney(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 1_000_000) return null;
  return Math.round(num * 100) / 100;
}

/**
 * Validate & normalize the options array coming from the therapist UI.
 * Returns { options } or { error } with a Hebrew user-facing message.
 */
export function normalizeQuoteOptions(raw: unknown): { options: QuoteOption[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'יש להוסיף לפחות אפשרות מחיר אחת להצעה' };
  }
  if (raw.length > 4) {
    return { error: 'ניתן לכלול עד 4 אפשרויות מחיר בהצעה אחת' };
  }

  const options: QuoteOption[] = [];
  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== 'object') {
      return { error: `אפשרות מחיר ${index + 1} אינה תקינה` };
    }
    const item = entry as Record<string, unknown>;

    const label = String(item.label || '').trim().slice(0, 120);
    if (!label) {
      return { error: `יש לתת שם לאפשרות מחיר ${index + 1} (למשל "מפגש בודד" או "תהליך טיפולי מלא")` };
    }

    const pricingModel: QuotePricingModel = item.pricingModel === 'package' ? 'package' : 'single';

    const sessionPrice = cleanMoney(item.sessionPrice);
    if (sessionPrice === null || sessionPrice <= 0) {
      return { error: `יש להזין מחיר תקין למפגש באפשרות "${label}"` };
    }

    let sessionsCount = 1;
    if (pricingModel === 'package') {
      const rawCount = Number(item.sessionsCount);
      if (!Number.isInteger(rawCount) || rawCount < 2 || rawCount > 96) {
        return { error: `באפשרות "${label}" (חבילה) יש להזין מספר מפגשים תקין בין 2 ל-96` };
      }
      sessionsCount = rawCount;
    }

    options.push({
      id: typeof item.id === 'string' && item.id ? item.id : `opt-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      pricingModel,
      sessionPrice,
      sessionsCount,
      totalPrice: Math.round(sessionPrice * sessionsCount * 100) / 100
    });
  }

  return { options };
}

export function formatILS(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${str} ₪`;
}

/** Status pill meta for the quotes table. */
export const QUOTE_STATUS_META: Record<string, { text: string; bg: string; color: string; border: string }> = {
  draft: { text: 'טיוטה (לא נשלח)', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  sent: { text: 'נשלח', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  confirmed: { text: 'אושר ✅', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  declined: { text: 'לא אושר', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

export function quoteStatusMeta(status: string) {
  return QUOTE_STATUS_META[status] || QUOTE_STATUS_META.draft;
}

/** One-line summary of a quote's options, for table rows. */
export function quoteOptionsSummary(options: Array<{ label: string; pricingModel: string; sessionPrice: number; sessionsCount: number; totalPrice: number }> | undefined): string {
  return (options || [])
    .map(o => o.pricingModel === 'package'
      ? `${o.label} (${o.sessionsCount}×${formatILS(o.sessionPrice)})`
      : `${o.label} (${formatILS(o.totalPrice)})`)
    .join(' · ');
}

/** Short label of the option a lead picked, e.g. "תהליך (12 מפגשים)". */
export function quoteChosenOptionLabel(quote: { options?: Array<{ id: string; label: string; pricingModel: string; sessionsCount: number }> | undefined; selectedOptionId?: string | null } | null | undefined): string {
  if (!quote?.selectedOptionId) return '';
  const chosen = (quote.options || []).find(o => o.id === quote.selectedOptionId);
  if (!chosen) return '';
  return chosen.pricingModel === 'package' ? `${chosen.label} (${chosen.sessionsCount} מפגשים)` : chosen.label;
}

/** The WhatsApp message the potential client receives with the quote link. */
export function buildQuoteMessageForLead(quote: QuoteRecord, quoteUrl: string): string {
  const lines: string[] = [
    `שלום ${quote.leadName} יקר/ה,`,
    '',
    `${quote.therapistName || 'המטפל/ת'} הכין/ה עבורך הצעת מחיר${quote.title ? ` — "${quote.title}"` : ''}:`,
    ''
  ];

  for (const option of quote.options) {
    if (option.pricingModel === 'package') {
      lines.push(`📦 ${option.label}: ${option.sessionsCount} מפגשים — ${formatILS(option.sessionPrice)} למפגש (סה"כ ${formatILS(option.totalPrice)})`);
    } else {
      lines.push(`🧩 ${option.label}: ${formatILS(option.totalPrice)} למפגש`);
    }
  }

  lines.push(
    '',
    'לצפייה בפירוט ההצעה ואישורה:',
    quoteUrl,
    '',
    'בברכה,',
    'מרחב טיפולי WiseCare 🌿'
  );

  return lines.join('\n');
}

/** The WhatsApp message the therapist receives when the lead decides. */
export function buildQuoteDecisionMessageForTherapist(
  quote: QuoteRecord,
  decision: 'confirmed' | 'declined',
  quotesScreenUrl: string
): string {
  if (decision === 'confirmed') {
    const selected = quote.options.find(o => o.id === quote.selectedOptionId) || quote.options[0];
    const chosenLine = selected
      ? selected.pricingModel === 'package'
        ? `${selected.label} — ${selected.sessionsCount} מפגשים בסה"כ ${formatILS(selected.totalPrice)}`
        : `${selected.label} — ${formatILS(selected.totalPrice)} למפגש`
      : '';
    return [
      `✅ הצעת המחיר "${quote.title || 'הצעה'}" אושרה על ידי ${quote.leadName}!`,
      chosenLine ? `האפשרות שנבחרה: ${chosenLine}` : '',
      '',
      `לצפייה בפרטים והמשך טיפול בהצעה:`,
      quotesScreenUrl,
      '',
      'מרחב טיפולי WiseCare 🌿'
    ].filter(Boolean).join('\n');
  }

  return [
    `📌 עדכון: ${quote.leadName} בחר/ה שלא להמשיך כרגע בהצעת המחיר"${quote.title ? ` "${quote.title}"` : ''}".`,
    'אפשר לפנות לשיחה הבהרה או לשלוח הצעה מעודכנת.',
    '',
    `לצפייה בהצעה:`,
    quotesScreenUrl,
    '',
    'מרחב טיפולי WiseCare 🌿'
  ].join('\n');
}

/** Safe subset returned to the PUBLIC quote page (no phones, no internal ids). */
export function publicQuoteView(quote: QuoteRecord, clinicName: string) {
  return {
    id: quote.id,
    title: quote.title,
    description: quote.description,
    therapistName: quote.therapistName,
    clinicName,
    leadName: quote.leadName,
    status: quote.status,
    selectedOptionId: quote.selectedOptionId,
    decidedAt: quote.decidedAt,
    sentAt: quote.sentAt,
    options: quote.options
  };
}
