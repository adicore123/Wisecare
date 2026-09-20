'use client';

// Video-call join boundary: the WhatsApp join link is one-shot in the patient's
// eyes — a render error here must offer a retry, not a dead page.
export default function JoinCallError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px 16px',
        background: '#0f172a',
      }}
      dir="rtl"
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px 28px',
          borderRadius: '24px',
          background: '#1e293b',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', margin: '0 auto 12px' }}>📹</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' }}>
          טעינת השיחה נתקלה בשגיאה
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>
          נסה/י לחזור לקישור שקיבלת בוואטסאפ, או פנה/י למטפל/ת שלך לקבלת קישור חדש.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '12px 28px',
            borderRadius: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            color: '#ffffff',
          }}
        >
          נסה/י שוב
        </button>
      </div>
    </div>
  );
}
