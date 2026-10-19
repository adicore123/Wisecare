'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Gift, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface MyRequest {
  id: string;
  title: string;
  url: string;
  suggestedCategory: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface SongRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  portalCode: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: 'ממתינה לאישור', color: '#b45309', bg: '#fffbeb', icon: Clock },
  approved: { label: 'אושרה — השיר עבר לכולם 🎉', color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
  rejected: { label: 'לא אושרה', color: '#b91c1c', bg: '#fef2f2', icon: XCircle }
};

/**
 * "בקשת שיר לכולם" — המטופל מגיש שיר שאהב עם הצעת קטגוריה;
 * הצוות מאשר, והשיר נוסף להמלצות שרואים כל המטופלים.
 */
export default function SongRequestModal({ isOpen, onClose, portalCode }: SongRequestModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [note, setNote] = useState('');
  const [metaThumb, setMetaThumb] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const titleTouchedRef = useRef(false);

  const loadMine = useCallback(async () => {
    try {
      const res = await api.getPortalSongRequests(portalCode);
      setMyRequests(Array.isArray(res) ? res : []);
    } catch {}
  }, [portalCode]);

  useEffect(() => {
    if (isOpen) {
      setUrl(''); setTitle(''); setSuggestedCategory(''); setNote('');
      setMetaThumb(''); setError(''); setSuccess('');
      titleTouchedRef.current = false;
      loadMine();
    }
  }, [isOpen, loadMine]);

  // זיהוי אוטומטי מהקישור — כמו בהוספת שיר רגיל
  useEffect(() => {
    const clean = url.trim();
    if (!isOpen || !/^https?:\/\/.+/i.test(clean)) {
      setFetchingMeta(false);
      return;
    }
    setFetchingMeta(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portal/${encodeURIComponent(portalCode)}/songs/meta?url=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const meta = await res.json();
          if (meta.thumbnailUrl) setMetaThumb(meta.thumbnailUrl);
          if (meta.title && !titleTouchedRef.current && !title.trim()) {
            setTitle(meta.title);
          }
        }
      } catch {}
      setFetchingMeta(false);
    }, 600);
    return () => { clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, isOpen, portalCode]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!/^https?:\/\/.+/i.test(url.trim())) {
      setError('נא להזין קישור תקין לשיר');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await api.createPortalSongRequest(portalCode, {
        url: url.trim(),
        title: title.trim(),
        suggestedCategory: suggestedCategory.trim(),
        note: note.trim()
      });
      setSuccess('הבקשה נשלחה לצווח! נעבור עליה ואם תאושר — השיר יגיע לכל המרחבים 🎁');
      setUrl(''); setTitle(''); setSuggestedCategory(''); setNote('');
      setMetaThumb(''); titleTouchedRef.current = false;
      loadMine();
    } catch (err: any) {
      setError(err.message || 'שגיאה בשליחת הבקשה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="song-modal-overlay" style={{ zIndex: 1300 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="song-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h3><Gift size={18} style={{ verticalAlign: '-3px', marginLeft: '6px' }} /> בקשת שיר לכולם 🎁</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
          אהבת שיר ורוצה שגם כולם יכירו? הגש/י בקשה — הצוות יעבור עליה, ואם תאושר השיר יתווסף להמלצות של כל המרחבים.
        </p>

        <label className="song-field">
          <span>קישור לשיר *</span>
          <input
            type="url"
            dir="ltr"
            value={url}
            autoFocus
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://... (יוטיוב, ספוטיפיי, סאונדקלאוד...)"
          />
          {(metaThumb || fetchingMeta) && url && (
            <div className="song-meta-preview">
              {fetchingMeta && !metaThumb ? (
                <Loader2 size={15} className="song-mini-spin" />
              ) : (
                <img src={metaThumb} alt="" />
              )}
              <span>{fetchingMeta ? 'מזהה את השיר...' : 'זוהה מהקישור ✨'}</span>
            </div>
          )}
        </label>

        <label className="song-field">
          <span>שם השיר (אופציונלי — ממולא אוטומטית)</span>
          <input
            type="text"
            value={title}
            onChange={(e) => { titleTouchedRef.current = true; setTitle(e.target.value); }}
            placeholder="ימולא אוטומטית"
          />
        </label>

        <label className="song-field">
          <span>הצעת קטגוריה (אופציונלי — איפה שהשיר ישתלב)</span>
          <input
            type="text"
            value={suggestedCategory}
            onChange={(e) => setSuggestedCategory(e.target.value)}
            placeholder="לדוגמה: שירים מרגיעים, שירי אמונה..."
          />
        </label>

        <label className="song-field">
          <span>למה דווקא השיר הזה? (אופציונלי)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="כמה מילים לצוות"
          />
        </label>

        {error && <div className="song-form-error">{error}</div>}
        {success && (
          <div className="quickshare-success" style={{ paddingBottom: '8px' }}>
            <CheckCircle2 size={26} />
            <p>{success}</p>
          </div>
        )}

        <div className="song-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>סגירה</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !url.trim()}>
            {saving ? 'שולח...' : 'שליחת הבקשה 🎁'}
          </button>
        </div>

        {myRequests.length > 0 && (
          <div style={{ marginTop: '18px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              הבקשות שלי ({myRequests.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myRequests.slice(0, 5).map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.pending;
                const Icon = meta.icon;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: '#f8fafc', border: '1px solid #eef2f6',
                      borderRadius: '12px', padding: '10px 12px', flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{r.title}</div>
                      {r.suggestedCategory && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                          הצעת קטגוריה: {r.suggestedCategory}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontSize: '0.74rem', fontWeight: 700,
                        color: meta.color, background: meta.bg,
                        padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap'
                      }}
                    >
                      <Icon size={12} /> {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
