'use client';

// Quote-link boundary: a lead opening a WhatsApp link gets a retry, never a dead page.
export default function QuoteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px 16px',
        background: 'linear-gradient(145deg, var(--primary-faint) 0%, #f8fafc 100%)',
      }}
      dir="rtl"
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px 28px',
          borderRadius: '24px',
          border: '1px solid var(--primary-glow, color-mix(in srgb, var(--primary) 30%, white))',
          background: '#ffffff',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', margin: '0 auto 12px' }}>📋</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          שגיאה זמנית בטעינת ההצעה
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
          נסה/י לרענן את העמוד מהקישור שבהודעת הוואטסאפ. אם הבעיה חוזרת — פנה/י למטפל/ת שלך.
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
