"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Printer, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function CRMFormPrintPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params?.code || '');
  const signatureId = String(params?.signatureId || '');

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Authenticate therapist / admin in CRM context
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('wisecare_user') : null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role !== 'therapist' && user.role !== 'superadmin') {
          router.push('/login');
          return;
        }
      } catch {
        router.push('/login');
        return;
      }
    } else if (typeof window !== 'undefined') {
      router.push('/login');
      return;
    }

    if (!signatureId) return;

    setLoading(true);
    api.getFormSignature(signatureId)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || 'שגיאה בטעינת הטופס החתום');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [signatureId, router]);

  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b', direction: 'rtl' }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px', color: '#0d9488' }} />
        <div>טוען מסמך חתום להדפסה...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#b91c1c', direction: 'rtl' }}>
        <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{error || 'המסמך המבוקש לא נמצא'}</div>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            marginTop: '16px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          חזור
        </button>
      </div>
    );
  }

  const t = data.template || {};
  const accent = t.accentColor || '#0d9488';

  return (
    <div style={{ direction: 'rtl', fontFamily: 'inherit', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Screen Toolbar - Hidden during print */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-secondary"
            style={{ fontSize: '0.84rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowRight size={15} />
            <span>חזרה ל-CRM</span>
          </button>
          <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
            מסמך חתום: <strong>{t.title || t.name || 'טופס'}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            💡 בחלון ההדפסה בחר "שמור כ-PDF" (Save as PDF)
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{
              background: '#0d9488',
              borderColor: '#0d9488',
              padding: '8px 20px',
              fontSize: '0.9rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Printer size={16} />
            <span>הדפסה / שמירה כ-PDF</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Container */}
      <div
        className="print-a4"
        style={{
          background: '#ffffff',
          width: '210mm',
          minHeight: '297mm',
          margin: '24px auto',
          padding: '18mm 20mm',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          color: '#0f172a',
          fontSize: '11.5pt',
          lineHeight: 1.7
        }}
      >
        {/* Document Header */}
        <div style={{ textAlign: 'center', borderBottom: `3px double ${accent}`, paddingBottom: '14px', marginBottom: '18px' }}>
          <div style={{ fontSize: '18pt', fontWeight: 800, color: accent }}>
            {t.title || t.name || 'מסמך חתום'}
          </div>
          <div style={{ fontSize: '10pt', color: '#64748b', marginTop: '4px' }}>
            {data.clinicName || 'מרחב טיפולי WiseCare'}
          </div>
        </div>

        {/* Metadata Table */}
        <table style={{ width: '100%', fontSize: '9.5pt', borderCollapse: 'collapse', marginBottom: '18px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #e2e8f0', padding: '7px 10px', background: '#f8fafc', width: '50%' }}>
                <strong>שם המטופל/ת:</strong> {data.client ? `${data.client.firstName || ''} ${data.client.lastName || ''}`.trim() : '-'}
              </td>
              <td style={{ border: '1px solid #e2e8f0', padding: '7px 10px', background: '#f8fafc', width: '50%' }}>
                <strong>מטפל/ת מלווה:</strong> {data.therapistName || '-'}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #e2e8f0', padding: '7px 10px' }}>
                <strong>נשלח לחתימה:</strong> {data.sentAt ? new Date(data.sentAt).toLocaleString('he-IL') : '-'}
              </td>
              <td style={{ border: '1px solid #e2e8f0', padding: '7px 10px' }}>
                <strong>נחתם דיגיטלית:</strong> {data.signedAt ? new Date(data.signedAt).toLocaleString('he-IL') : '-'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Intro Text */}
        {String(t.introText || '').trim() && (
          <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 16px', fontSize: '11pt', lineHeight: 1.75 }}>
            {t.introText}
          </p>
        )}

        {/* Sections */}
        {(t.sections || []).map((s: any, i: number) => (
          <div key={i} style={{ marginBottom: '14px' }}>
            {String(s.heading || '').trim() && (
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px', fontSize: '11.5pt' }}>
                {i + 1}. {s.heading}
              </div>
            )}
            {String(s.body || '').trim() && (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '10.5pt', color: '#334155', lineHeight: 1.7 }}>
                {s.body}
              </p>
            )}
          </div>
        ))}

        {/* Answers to required fields */}
        {Object.keys(data.answers || {}).length > 0 && (
          <div style={{ margin: '18px 0', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ fontWeight: 800, marginBottom: '8px', fontSize: '11pt' }}>הצהרות ואישורים שנמסרו:</div>
            {Object.entries(data.answers).map(([label, value]: any) => (
              <div key={label} style={{ fontSize: '10.5pt', marginBottom: '4px' }}>
                {value === true ? '☑' : typeof value === 'string' && value ? '✎' : '☐'} <strong>{label}</strong>
                {typeof value === 'string' && value ? `: ${value}` : ''}
              </div>
            ))}
          </div>
        )}

        {/* Signature & Verification Block */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '24px',
          marginTop: '36px',
          paddingTop: '16px',
          borderTop: '2px solid #e2e8f0',
          pageBreakInside: 'avoid'
        }}>
          <div>
            <div style={{ fontSize: '9pt', color: '#64748b' }}>שם מלא לאימות החתימה:</div>
            <div style={{ fontWeight: 800, fontSize: '12pt', minWidth: '180px', paddingBottom: '3px', borderBottom: '1px solid #0f172a', marginTop: '2px' }}>
              {data.signedName || '-'}
            </div>
            <div style={{ fontSize: '8pt', color: '#94a3b8', marginTop: '6px' }}>
              מספר מזהה חתימה: <code>{data.id}</code>
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '9pt', color: '#64748b', marginBottom: '4px', textAlign: 'right' }}>
              חתימה ידנית דיגיטלית:
            </div>
            {data.signatureData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.signatureData}
                alt="חתימה דיגיטלית"
                style={{ maxHeight: '90px', maxWidth: '240px', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '4px', background: '#ffffff' }}
              />
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '9.5pt' }}>לא נדרשה חתימה בכתב יד</span>
            )}
          </div>
        </div>

        {/* Document Footer */}
        {String(t.footerText || '').trim() && (
          <p style={{
            whiteSpace: 'pre-wrap',
            marginTop: '20px',
            fontSize: '9pt',
            color: '#64748b',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '10px'
          }}>
            {t.footerText}
          </p>
        )}
      </div>
    </div>
  );
}
