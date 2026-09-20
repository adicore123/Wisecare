import Link from 'next/link';

export default function NotFound() {
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
        <div style={{ fontSize: '2.4rem', margin: '0 auto 12px' }}>🧭</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          העמוד לא נמצא
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
          הקישור שניסית לפתוח אינו קיים או שפג תוקפו. אם הגעת לכאן דרך קישור מהמטפל/ת שלך — כדאי לבקש קישור מעודכן.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            borderRadius: '12px',
            fontWeight: 700,
            textDecoration: 'none',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            color: '#ffffff',
          }}
        >
          חזרה למסך הבית
        </Link>
      </div>
    </div>
  );
}
