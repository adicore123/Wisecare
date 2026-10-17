'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { isDirectAudioUrl, isStreamingUrl } from './MusicPlayerProvider';

export interface SongEditPayload {
  title: string;
  url: string;
  note: string;
  thumbnailUrl: string;
  categoryId?: string | null;
}

interface SongEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: SongEditPayload) => void;
  /** נקודת ה-meta למילוי האוטומטי — שונה בין הפורטל לסופראדמין */
  metaEndpoint: string;
  initial?: { title?: string; url?: string; note?: string; thumbnailUrl?: string; categoryId?: string | null };
  /** קטגוריות אישיות של המטופל (אופציונלי — רק בפורטל) */
  categories?: Array<{ id: string; name: string }>;
  isEdit?: boolean;
  saving: boolean;
  error: string | null;
}

/**
 * טופס הוספה/עריכת שיר משותף למטופל ולסופראדמין:
 * הדבקת קישור → מילוי אוטומטי של שם + תצוגה מקדימה של תמונה.
 * השם אופציונלי — השרת גוזר אותו מהקישור אם נשאר ריק.
 */
export default function SongEditModal({
  isOpen, onClose, onSave, metaEndpoint, initial, categories, isEdit, saving, error
}: SongEditModalProps) {
  const [form, setForm] = useState({ title: '', url: '', note: '' });
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [metaThumb, setMetaThumb] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [localError, setLocalError] = useState('');
  const titleTouchedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ title: initial?.title || '', url: initial?.url || '', note: initial?.note || '' });
      setCategoryId(initial?.categoryId || null);
      setMetaThumb(initial?.thumbnailUrl || '');
      setLocalError('');
      titleTouchedRef.current = Boolean(initial?.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // מילוי אוטומטי מהקישור (debounce) — רק כשהמשתמש לא הקליד שם בעצמו
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
        const res = await fetch(`${metaEndpoint}?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const meta = await res.json();
          if (meta.thumbnailUrl) setMetaThumb(meta.thumbnailUrl);
          if (meta.title && !titleTouchedRef.current && !form.title.trim()) {
            setForm((f) => ({ ...f, title: meta.title }));
          }
        }
      } catch {}
      setFetchingMeta(false);
    }, 600);
    return () => { clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, isOpen, metaEndpoint]);

  if (!isOpen) return null;

  const submit = () => {
    if (!/^https?:\/\/.+/i.test(form.url.trim())) {
      setLocalError('נא להזין קישור תקין (http/https)');
      return;
    }
    onSave({
      title: form.title.trim(),
      url: form.url.trim(),
      note: form.note.trim(),
      thumbnailUrl: metaThumb,
      categoryId
    });
  };

  const shownError = localError || error;

  return (
    <div className="song-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="song-modal">
        <h3>{isEdit ? 'עריכת שיר ✏️' : 'הוספת שיר 🎵'}</h3>
        <label className="song-field">
          <span>קישור *</span>
          <input
            type="url"
            dir="ltr"
            value={form.url}
            autoFocus
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://... (MP3 לניגון ברקע, או קישור ליוטיוב/ספוטיפיי)"
          />
          <small className="song-field-hint">
            {form.url && isDirectAudioUrl(form.url)
              ? '✅ קישור אודיו ישיר — יתנגן בנגן שלנו, כולל ברקע'
              : form.url && isStreamingUrl(form.url)
                ? 'ℹ️ קישור לשירות סטרימינג — ייפתח באפליקציה שלהם'
                : 'ניגון ברקע תומך בקבצי MP3/M4A/OGG/WAV ישירים'}
          </small>
          {(metaThumb || fetchingMeta) && form.url && (
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
          <span>שם השיר (אופציונלי — ממולא אוטומטית מהקישור)</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => {
              titleTouchedRef.current = true;
              setForm((f) => ({ ...f, title: e.target.value }));
            }}
            placeholder={fetchingMeta ? 'מזהה את שם השיר...' : 'ימולא אוטומטית'}
          />
        </label>
        <label className="song-field">
          <span>הערה (אופציונלי)</span>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="אופציונלי"
          />
        </label>
        {categories && categories.length > 0 && (
          <fieldset className="space-goal-fieldset song-cat-fieldset">
            <legend>קטגוריה אישית</legend>
            <div className="space-goal-chips song-cat-picker">
              <button
                type="button"
                className={`space-goal-chip${categoryId === null ? ' space-goal-chip-active' : ''}`}
                onClick={() => setCategoryId(null)}
                aria-pressed={categoryId === null}
              >
                ללא קטגוריה
              </button>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`space-goal-chip${categoryId === c.id ? ' space-goal-chip-active' : ''}`}
                  onClick={() => setCategoryId(c.id)}
                  aria-pressed={categoryId === c.id}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {shownError && <div className="song-form-error">{shownError}</div>}
        <div className="song-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'שומר...' : isEdit ? 'שמירת שינויים' : 'הוספה לרשימה'}
          </button>
        </div>
      </div>
    </div>
  );
}
