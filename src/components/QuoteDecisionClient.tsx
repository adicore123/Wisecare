'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Receipt, Loader2, ShieldCheck } from 'lucide-react';
import { formatILS } from '@/lib/quoteHelpers';

interface QuoteOptionView {
  id: string;
  label: string;
  pricingModel: 'single' | 'package';
  sessionPrice: number;
  sessionsCount: number;
  totalPrice: number;
}

interface QuoteView {
  id: string;
  title: string;
  description: string;
  therapistName: string;
  clinicName: string;
  leadName: string;
  status: 'draft' | 'sent' | 'confirmed' | 'declined';
  selectedOptionId: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  options: QuoteOptionView[];
}

/**
 * Public quote page: a potential client (no account in the system) reviews the
 * offer behind their personal secure link and confirms or declines it.
 */
export default function QuoteDecisionClient({ quote, token }: { quote: QuoteView | null; token: string }) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    quote?.options?.length === 1 ? quote.options[0].id : ''
  );
  const [submitting, setSubmitting] = useState<'confirm' | 'decline' | null>(null);
  const [error, setError] = useState('');
  const [decided, setDecided] = useState<'confirmed' | 'declined' | null>(
    quote?.status === 'confirmed' || quote?.status === 'declined' ? quote.status : null
  );

  // ---- Invalid or expired link ----
  if (!quote) {
    return (
      <div style={{ ...shellStyle, background: '#f8fafc' }} dir="rtl">
        <div style={cardStyle}>
          <div style={{ ...iconTileStyle, background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>🔗</div>
          <h2 style={h2Style}>הקישור אינו תקין או שפג תוקפו</h2>
          <p style={pStyle}>
            ייתכן שההצעה נשלחה מחדש בקישור חדש או שהקישור הוקלד בחלקו.
            ניתן לבקש מהמטפל/ת קישור מעודכן בהודעה.
          </p>
        </div>
      </div>
    );
  }

  const handleDecision = async (decision: 'confirm' | 'decline') => {
    if (decision === 'confirm' && !selectedOptionId) {
      setError('נא לבחור אפשרות מחיר לפני האישור');
      return;
    }
    setError('');
    setSubmitting(decision);
    try {
      const res = await fetch(`/api/quote/${encodeURIComponent(quote.id)}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decision, selectedOptionId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'שגיאה בשמירת האישור');
      setDecided(decision === 'confirm' ? 'confirmed' : 'declined');
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת האישור');
    } finally {
      setSubmitting(null);
    }
  };

  // ---- Already decided / thank-you state ----
  if (decided) {
    const confirmed = decided === 'confirmed';
    const selected = quote.options.find(o => o.id === (selectedOptionId || quote.selectedOptionId));
    return (
      <div style={shellStyle} dir="rtl">
        <div style={cardStyle}>
          <div style={{ ...iconTileStyle, background: confirmed ? 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>
            {confirmed ? <CheckCircle2 size={30} color="#fff" /> : <XCircle size={30} color="#fff" />}
          </div>
          <h2 style={h2Style}>
            {confirmed ? 'ההצעה אושרה בהצלחה! 🎉' : 'העדפת שלא להמשיך כרגע'}
          </h2>
          <p style={pStyle}>
            {confirmed
              ? `תודה ${quote.leadName}! ${quote.therapistName} קיבל/ה הודעה על האישור ותיצור/י איתך קשר לתיאום ההמשך.`
              : 'העדכון נשלח למטפל/ת. אם תרצה/י לשקול שוב — ניתן לבקש הצעה מעודכנת בכל עת.'}
          </p>
          {confirmed && selected && (
            <div style={summaryBoxStyle}>
              <strong>האפשרות שאושרה:</strong><br />
              {selected.label} — {selected.pricingModel === 'package'
                ? `${selected.sessionsCount} מפגשים, סה"כ ${formatILS(selected.totalPrice)}`
                : `${formatILS(selected.totalPrice)} למפגש`}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Quote review + decision ----
  const multipleOptions = quote.options.length > 1;

  return (
    <div style={shellStyle} dir="rtl">
      <div style={{ ...cardStyle, maxWidth: '640px' }}>

        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={iconTileStyle}>
            <Receipt size={30} color="#fff" />
          </div>
          <h2 style={{ ...h2Style, marginBottom: '4px' }}>
            הצעת מחיר{quote.title ? ` — ${quote.title}` : ''}
          </h2>
          <p style={{ ...pStyle, margin: 0 }}>
            הוכנה עבור <strong>{quote.leadName}</strong> על ידי {quote.therapistName || 'המטפל/ת'}
            {quote.clinicName ? ` · ${quote.clinicName}` : ''}
          </p>
        </div>

        {quote.description && (
          <div style={{ ...summaryBoxStyle, textAlign: 'right', whiteSpace: 'pre-wrap' }}>
            {quote.description}
          </div>
        )}

        <div style={{ display: 'grid', gap: '12px', marginTop: '18px' }}>
          {quote.options.map(option => {
            const selected = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => multipleOptions && setSelectedOptionId(option.id)}
                style={{
                  ...optionCardStyle,
                  ...(multipleOptions ? {} : { cursor: 'default' }),
                  ...(selected ? optionSelectedStyle : {})
                }}
                aria-pressed={multipleOptions ? selected : undefined}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{option.label}</strong>
                  {multipleOptions && (
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                      border: selected ? 'none' : '2px solid #cbd5e1',
                      background: selected ? 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {selected && <CheckCircle2 size={16} color="#fff" />}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: '8px', color: '#334155', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {option.pricingModel === 'package' ? (
                    <>
                      📦 תהליך של <strong>{option.sessionsCount}</strong> מפגשים ·{' '}
                      <strong>{formatILS(option.sessionPrice)}</strong> למפגש
                    </>
                  ) : (
                    <>🧩 מפגש בודד</>
                  )}
                </div>
                <div style={{
                  marginTop: '10px', fontSize: '1.25rem', fontWeight: 800, color: '#0f766e'
                }}>
                  {option.pricingModel === 'package'
                    ? `סה"כ ${formatILS(option.totalPrice)}`
                    : `${formatILS(option.totalPrice)} למפגש`}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ ...summaryBoxStyle, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleDecision('confirm')}
            disabled={submitting !== null}
            style={primaryButtonStyle}
          >
            {submitting === 'confirm' ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
            מאשר/ת את ההצעה
          </button>
          <button
            type="button"
            onClick={() => handleDecision('decline')}
            disabled={submitting !== null}
            style={secondaryButtonStyle}
          >
            {submitting === 'decline' ? <Loader2 size={18} className="spin" /> : <XCircle size={18} />}
            לא מעוניין/ת כרגע
          </button>
        </div>

        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
          <ShieldCheck size={14} />
          <span>קישור אישי ומאובטח · האישור נשלח ישירות למטפל/ת</span>
        </div>
      </div>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px 16px',
  background: 'linear-gradient(145deg, #f0fdfa 0%, #f8fafc 100%)',
  fontFamily: 'inherit'
};

const cardStyle: React.CSSProperties = {
  maxWidth: '460px',
  width: '100%',
  padding: '36px 28px',
  borderRadius: '24px',
  border: '1px solid #99f6e4',
  background: '#ffffff',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
  textAlign: 'center'
};

const iconTileStyle: React.CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
  boxShadow: '0 8px 20px rgba(13, 148, 136, 0.25)'
};

const h2Style: React.CSSProperties = {
  fontSize: '1.3rem',
  fontWeight: 800,
  color: '#0f172a',
  margin: '0 0 8px'
};

const pStyle: React.CSSProperties = {
  fontSize: '0.92rem',
  color: '#475569',
  lineHeight: 1.6,
  margin: '0 0 8px'
};

const summaryBoxStyle: React.CSSProperties = {
  marginTop: '14px',
  padding: '12px 16px',
  background: '#ecfdf5',
  borderRadius: '12px',
  border: '1px solid #a7f3d0',
  fontSize: '0.88rem',
  color: '#065f46',
  lineHeight: 1.6
};

const optionCardStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'right',
  padding: '16px 18px',
  borderRadius: '16px',
  border: '2px solid #e2e8f0',
  background: '#ffffff',
  cursor: 'pointer',
  transition: 'border-color 0.15s, box-shadow 0.15s'
};

const optionSelectedStyle: React.CSSProperties = {
  borderColor: '#0d9488',
  boxShadow: '0 8px 24px rgba(13, 148, 136, 0.18)',
  background: '#f0fdfa'
};

const primaryButtonStyle: React.CSSProperties = {
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '14px 24px',
  borderRadius: '14px',
  border: 'none',
  background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '1rem',
  cursor: 'pointer',
  minWidth: '200px'
};

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '14px 20px',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#64748b',
  fontWeight: 700,
  cursor: 'pointer'
};
