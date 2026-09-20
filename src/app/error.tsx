'use client';

// Root error boundary: any uncaught render error in a page shows this friendly
// fallback (with a retry) instead of Next's raw error screen / white page.
export default function Error({
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
        background: 'linear-gradient(145deg, var(--primary-faint) 0%, #f8fafc 100%)',
        fontFamily: 'inherit',
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
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
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
          משהו בדרך נתקל
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
          אירעה שגיאה זמנית בטעינת העמוד. הנתונים שלך בטוחים — נסה/י שוב בעוד רגע.
        </p>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 16px', direction: 'ltr' }}>
            מזהה שגיאה: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="btn btn-primary"
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
