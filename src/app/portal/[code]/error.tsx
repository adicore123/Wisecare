'use client';

// Portal-specific boundary: a patient hitting an error mid-session gets a calm
// fallback instead of a dead page — the WhatsApp link they followed still works
// after pressing retry.
export default function PortalError({
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
        background: 'linear-gradient(145deg, #f0fdfa 0%, #f8fafc 100%)',
      }}
      dir="rtl"
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px 28px',
          borderRadius: '24px',
          border: '1px solid #99f6e4',
          background: '#ffffff',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '1.6rem',
          }}
        >
          🌿
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          המרחב האישי נתקל בשגיאה זמנית
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
          התוכן שלך שמור ובטוח. נסה/י לרענן את העמוד — אם הבעיה חוזרת, פנה/י למטפל/ת שלך.
        </p>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 16px', direction: 'ltr' }}>
            מזהה שגיאה: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: '12px 28px',
            borderRadius: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
            color: '#ffffff',
          }}
        >
          נסה/י שוב
        </button>
      </div>
    </div>
  );
}
