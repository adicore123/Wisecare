'use client';

// Last-resort boundary (errors in the root layout itself). Must render its own
// <html> and <body> — the root layout is replaced while this is shown.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px 16px',
          background: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: '460px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            שגיאה בלתי צפויה
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
            המערכת נתקלה בשגיאה ואינה יכולה להציג את העמוד כרגע. הנתונים שלך בטוחים.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', direction: 'ltr' }}>
              {error.digest}
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
      </body>
    </html>
  );
}
