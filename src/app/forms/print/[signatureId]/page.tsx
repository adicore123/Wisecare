"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function FormPrintPage() {
  const params = useParams();
  const signatureId = String(params?.signatureId || '');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!signatureId) return;
    api.getFormSignature(signatureId)
      .then(setData)
      .catch(err => setError(err.message || 'שגיאה בטעינת המסמך'));
  }, [signatureId]);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#b91c1c' }}>{error}</div>;
  }
  if (!data) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>טוען מסמך...</div>;
  }

  const t = data.template || {};

  return (
    <div style={{ direction: 'rtl', fontFamily: 'inherit' }}>
      {/* Screen-only toolbar */}
      <div style={{ textAlign: 'center', padding: '14px', background: '#f1f5f9' }} className="no-print">
        <button
          type="button" onClick={() => window.print()}
          style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
        >
          🖨️ הדפסה / שמירה כ-PDF
        </button>
      </div>

      {/* A4 document */}
      <div style={{
        background: '#fff', width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '16mm',
        boxShadow: '0 2px 20px rgba(0,0,0,.12)', color: '#111827', fontSize: '11.5pt', lineHeight: 1.75
      }} className="print-a4">
        <div style={{ textAlign: 'center', borderBottom: `3px double ${t.accentColor || 'var(--primary)'}`, paddingBottom: 10, marginBottom: 14 }}>
          <div style={{ fontSize: '16pt', fontWeight: 800, color: t.accentColor || 'var(--primary)' }}>{t.title || t.name || 'מסמך חתום'}</div>
          <div style={{ fontSize: '9.5pt', color: '#6b7280', marginTop: 2 }}>{data.clinicName || 'WiseCare'}</div>
        </div>

        <table style={{ width: '100%', fontSize: '9.5pt', borderCollapse: 'collapse', marginBottom: 14 }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', background: '#f9fafb' }}><strong>שם המטופל/ת:</strong> {data.client ? `${data.client.firstName || ''} ${data.client.lastName || ''}` : '-'}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', background: '#f9fafb' }}><strong>מטפל/ת:</strong> {data.therapistName || '-'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px' }}><strong>נשלח לחתימה:</strong> {data.sentAt ? new Date(data.sentAt).toLocaleString('he-IL') : '-'}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px' }}><strong>נחתם:</strong> {data.signedAt ? new Date(data.signedAt).toLocaleString('he-IL') : '-'}</td>
            </tr>
          </tbody>
        </table>

        {String(t.introText || '').trim() && <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 12px' }}>{t.introText}</p>}

        {(t.sections || []).map((s: any, i: number) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {String(s.heading || '').trim() && <div style={{ fontWeight: 800, marginBottom: 2 }}>{i + 1}. {s.heading}</div>}
            {String(s.body || '').trim() && <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '10.5pt' }}>{s.body}</p>}
          </div>
        ))}

        {Object.keys(data.answers || {}).length > 0 && (
          <div style={{ margin: '12px 0' }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>הצהרות ואישורים:</div>
            {Object.entries(data.answers).map(([label, value]: any) => (
              <div key={label} style={{ fontSize: '10.5pt', marginBottom: 2 }}>
                {value === true ? '☑' : typeof value === 'string' && value ? '✎' : '☐'} {label}{typeof value === 'string' && value ? ` — ${value}` : ''}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginTop: 30, pageBreakInside: 'avoid' }}>
          <div>
            <div style={{ fontSize: '9pt', color: '#6b7280' }}>שם מלא (אימות):</div>
            <div style={{ fontWeight: 700, borderBottom: '1px solid #6b7280', minWidth: '150px', paddingBottom: 2 }}>{data.signedName}</div>
            <div style={{ fontSize: '8.5pt', color: '#9ca3af', marginTop: 4 }}>מספה מזהה: {data.id}</div>
          </div>
          <div>
            <div style={{ fontSize: '9pt', color: '#6b7280', marginBottom: 2 }}>חתימה דיגיטלית:</div>
            {data.signatureData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.signatureData} alt="חתימה דיגיטלית" style={{ maxHeight: 90, direction: 'ltr' }} />
            ) : (
              <span style={{ color: '#9ca3af' }}>לא נדרשה חתימה</span>
            )}
          </div>
        </div>

        {String(t.footerText || '').trim() && (
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 14, fontSize: '9pt', color: '#6b7280', borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>{t.footerText}</p>
        )}
      </div>
    </div>
  );
}
