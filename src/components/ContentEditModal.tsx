'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Video, FileText, Newspaper } from 'lucide-react';

export interface ContentEditPayload {
  type: string;
  title: string;
  url: string;
  description: string;
  sourceName: string;
  thumbnailUrl: string;
  shared: boolean;
}

interface ContentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: ContentEditPayload) => void;
  initial?: Partial<ContentEditPayload>;
  isEdit?: boolean;
  saving: boolean;
  error: string | null;
}

const TYPE_OPTIONS = [
  { value: 'video', label: 'סרטון', icon: Video },
  { value: 'post', label: 'פוסט', icon: FileText },
  { value: 'article', label: 'מאמר', icon: Newspaper }
];

/**
 * טופס הוספה/עריכת תוכן מומלץ בסופראדמין:
 * הדבקת קישור → מילוי אוטומטי של סוג + שם + תיאור + תצוגה מקדימה של תמונה.
 */
export default function ContentEditModal({
  isOpen, onClose, onSave, initial, isEdit, saving, error
}: ContentEditModalProps) {
  const [form, setForm] = useState({ title: '', url: '', description: '', sourceName: '' });
  const [type, setType] = useState('video');
  const [shared, setShared] = useState(true);
  const [metaThumb, setMetaThumb] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [localError, setLocalError] = useState('');
  const titleTouchedRef = useRef(false);
  const typeTouchedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: initial?.title || '',
        url: initial?.url || '',
        description: initial?.description || '',
        sourceName: initial?.sourceName || ''
      });
      setType(initial?.type || 'video');
      setShared(initial?.shared !== false);
      setMetaThumb(initial?.thumbnailUrl || '');
      setLocalError('');
      titleTouchedRef.current = Boolean(initial?.title);
      typeTouchedRef.current = Boolean(initial?.type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // מילוי אוטומטי מהקישור (debounce) — רק בשדות שהמשתמש לא מילא בעצמו
  useEffect(() => {
    const url = form.url.trim();
    if (!isOpen || !/^https?:\/\/.+/i.test(url)) {
      setMetaThumb((prev) => (initial?.thumbnailUrl && !url ? '' : prev));
      setFetchingMeta(false);
      return;
    }
    setFetchingMeta(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recommended-content/meta?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const meta = await res.json();
          if (meta.thumbnailUrl) setMetaThumb(meta.thumbnailUrl);
          if (meta.title && !titleTouchedRef.current && !form.title.trim()) {
            setForm((f) => ({ ...f, title: meta.title }));
          }
          if (meta.type && !typeTouchedRef.current && ['video', 'post', 'article'].includes(meta.type)) {
            setType(meta.type);
          }
          if (!form.description.trim() && meta.description) {
            setForm((f) => ({ ...f, description: String(meta.description).slice(0, 400) }));
          }
          if (!form.sourceName.trim() && meta.sourceName) {
            setForm((f) => ({ ...f, sourceName: meta.sourceName }));
          }
        }
      } catch {}
      setFetchingMeta(false);
    }, 600);
    return () => { clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, isOpen]);

  if (!isOpen) return null;

  const submit = () => {
    if (!/^https?:\/\/.+/i.test(form.url.trim())) {
      setLocalError('נא להזין קישור תקין (http/https)');
      return;
    }
    onSave({
      type,
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      sourceName: form.sourceName.trim(),
      thumbnailUrl: metaThumb,
      shared
    });
  };

  const shownError = localError || error;

  return (
    <div className="song-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="song-modal">
        <h3>{isEdit ? 'עריכת תוכן מומלץ ✏️' : 'הוספת תוכן מומלץ 🎬'}</h3>
        <label className="song-field">
          <span>קישור *</span>
          <input
            type="url"
            dir="ltr"
            value={form.url}
            autoFocus
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://... (יוטיוב, פייסבוק, טיקטוק, מאמר...)"
          />
          {(metaThumb || fetchingMeta) && form.url && (
            <div className="song-meta-preview">
              {fetchingMeta && !metaThumb ? (
                <Loader2 size={15} className="song-mini-spin" />
              ) : (
                <img src={metaThumb} alt="" />
              )}
              <span>{fetchingMeta ? 'מזהה את התוכן...' : 'זוהה מהקישור ✨'}</span>
            </div>
          )}
        </label>

        <fieldset className="space-goal-fieldset song-cat-fieldset">
          <legend>סוג התוכן</legend>
          <div className="space-goal-chips song-cat-picker">
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  type="button"
                  key={opt.value}
                  className={`space-goal-chip${type === opt.value ? ' space-goal-chip-active' : ''}`}
                  onClick={() => { typeTouchedRef.current = true; setType(opt.value); }}
                  aria-pressed={type === opt.value}
                >
                  <Icon size={14} /> {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="song-field">
          <span>שם (אופציונלי — ממולא אוטומטית מהקישור)</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => {
              titleTouchedRef.current = true;
              setForm((f) => ({ ...f, title: e.target.value }));
            }}
            placeholder={fetchingMeta ? 'מזהה את שם התוכן...' : 'ימולא אוטומטית'}
          />
        </label>
        <label className="song-field">
          <span>תיאור קצר (אופציונלי)</span>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="מה יש לצפות/לקרוא — ממולא אוטומטית מהקישור"
          />
        </label>
        <label className="song-field">
          <span>מקור (אופציונלי)</span>
          <input
            type="text"
            value={form.sourceName}
            onChange={(e) => setForm((f) => ({ ...f, sourceName: e.target.value }))}
            placeholder="לדוגמה: YouTube (Goodful)"
          />
        </label>

        <label className="content-share-field" title="פריטים מוסתרים נשארים בספרייה ולא מוצגים למטופלים">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
          <span>שיתוף לכל המטופלים 👁️</span>
        </label>

        {shownError && <div className="song-form-error">{shownError}</div>}
        <div className="song-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'שומר...' : isEdit ? 'שמירת שינויים' : 'הוספה להמלצות'}
          </button>
        </div>
      </div>
    </div>
  );
}
