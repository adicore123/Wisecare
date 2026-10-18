'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Music, Video, Share2, Plus, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { isDirectAudioUrl } from './MusicPlayerProvider';

type Destination = 'songs' | 'content';

interface QuickShareCategory {
  id: string;
  name: string;
}

interface QuickShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** אחרי שמירה מוצלחת — כדי שהטאבים ירעננו את הרשימות */
  onSaved?: (destination: Destination) => void;
}

/**
 * "שיתוף מהיר" — חלון אחד לשיתוף סרטון/שיר שראיתי:
 * מדביקים קישור → מזהה אוטומטית מה זה → בוחרים לאן יגיע
 * (המלצות שירים או המלצות תוכן) ולאיזו קטגוריה.
 */
export default function QuickShareModal({ isOpen, onClose, onSaved }: QuickShareModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('video');
  const [destination, setDestination] = useState<Destination>('content');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [shared, setShared] = useState(true);

  const [songCategories, setSongCategories] = useState<QuickShareCategory[]>([]);
  const [contentCategories, setContentCategories] = useState<QuickShareCategory[]>([]);
  const [metaThumb, setMetaThumb] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const titleTouchedRef = useRef(false);
  const destTouchedRef = useRef(false);

  // טעינת שתי רשימות הקטגוריות בפתיחה (שקטה — הכישלון מוצג רק בשמירה)
  useEffect(() => {
    if (!isOpen) return;
    api.getSongCategories().then((res) => setSongCategories(Array.isArray(res) ? res : [])).catch(() => {});
    api.getContentCategories().then((res) => setContentCategories(Array.isArray(res) ? res : [])).catch(() => {});
  }, [isOpen]);

  // איפוס בפתיחה
  useEffect(() => {
    if (isOpen) {
      setUrl(''); setTitle(''); setNote(''); setDescription('');
      setType('video'); setDestination('content'); setCategoryId(null);
      setNewCatName(''); setMetaThumb(''); setError(''); setSuccess('');
      setShared(true);
      titleTouchedRef.current = false;
      destTouchedRef.current = false;
    }
  }, [isOpen]);

  // מילוי אוטומטי מהקישור (debounce) + הצעת יעד לפי סוג הקישור
  useEffect(() => {
    const clean = url.trim();
    if (!isOpen || !/^https?:\/\/.+/i.test(clean)) {
      setMetaThumb((prev) => prev);
      setFetchingMeta(false);
      return;
    }

    // קישור אודיו אמיתי (קובץ / ספוטיפיי / סאונדקלאוד / אפל מיוזיק) → הצע שירים;
    // יוטיוב ושאר הרשתות → הצע תוכן (המשתמש תמיד יכול להחליף)
    const suggestsSong =
      isDirectAudioUrl(clean) ||
      /(?:spotify\.com|soundcloud\.com|music\.apple\.com)/i.test(clean);
    if (!destTouchedRef.current) {
      setDestination(suggestsSong ? 'songs' : 'content');
    }

    setFetchingMeta(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recommended-content/meta?url=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const meta = await res.json();
          if (meta.thumbnailUrl) setMetaThumb(meta.thumbnailUrl);
          if (meta.title && !titleTouchedRef.current && !title.trim()) {
            setTitle(meta.title);
          }
          if (meta.type && ['video', 'post', 'article'].includes(meta.type)) {
            setType(meta.type);
          }
          if (meta.description) {
            setDescription((prev) => prev || String(meta.description).slice(0, 400));
          }
        }
      } catch {}
      setFetchingMeta(false);
    }, 600);
    return () => { clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, isOpen]);

  if (!isOpen) return null;

  const categories = destination === 'songs' ? songCategories : contentCategories;

  const createCategory = async () => {
    const name = newCatName.trim();
    if (!name || creatingCat) return;
    try {
      setCreatingCat(true);
      const cat = destination === 'songs'
        ? await api.createSongCategory(name)
        : await api.createContentCategory(name);
      if (destination === 'songs') {
        setSongCategories((prev) => [...prev, cat]);
      } else {
        setContentCategories((prev) => [...prev, cat]);
      }
      setCategoryId(cat.id);
      setNewCatName('');
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת הקטגוריה');
    } finally {
      setCreatingCat(false);
    }
  };

  const submit = async () => {
    const clean = url.trim();
    if (!/^https?:\/\/.+/i.test(clean)) {
      setError('נא להזין קישור תקין (http/https)');
      return;
    }
    if (!categoryId) {
      setError('נא לבחור קטגוריה (או ליצור חדשה)');
      return;
    }
    try {
      setSaving(true);
      setError('');
      if (destination === 'songs') {
        const song = await api.createRecommendedSong({
          categoryId, title: title.trim(), url: clean, note: note.trim(), thumbnailUrl: metaThumb
        });
        setSuccess(`השיר "${song.title}" שותף להמלצות השירים 🎵`);
      } else {
        const item = await api.createRecommendedContent({
          categoryId, url: clean, type, title: title.trim(),
          description: description.trim(), thumbnailUrl: metaThumb, shared
        });
        setSuccess(`התוכן "${item.title}" שותף${shared ? ' לכל המטופלים' : ' (מוסתר)'} 🎬`);
      }
      onSaved?.(destination);
      // מוכן לשיתוף הבא — מנקה את השדות אבל שומר יעד וקטגוריה לרצף מהיר
      setUrl(''); setTitle(''); setNote(''); setDescription('');
      setMetaThumb(''); titleTouchedRef.current = false;
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="song-modal-overlay" style={{ zIndex: 1300 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="song-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h3><Share2 size={18} style={{ verticalAlign: '-3px', marginLeft: '6px' }} /> שיתוף מהיר למטופלים</h3>

        {success ? (
          <div className="quickshare-success">
            <CheckCircle2 size={34} />
            <p>{success}</p>
            <div className="song-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>סגירה</button>
              <button type="button" className="btn btn-primary" onClick={() => setSuccess('')}>שיתוף נוסף ➕</button>
            </div>
          </div>
        ) : (
          <>
            <label className="song-field">
              <span>קישור לסרטון / שיר *</span>
              <input
                type="url"
                dir="ltr"
                value={url}
                autoFocus
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://... (יוטיוב, ספוטיפיי, פייסבוק, טיקטוק...)"
              />
              {(metaThumb || fetchingMeta) && url && (
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
              <legend>לאן לשתף?</legend>
              <div className="space-goal-chips song-cat-picker quickshare-dest">
                <button
                  type="button"
                  className={`space-goal-chip${destination === 'songs' ? ' space-goal-chip-active' : ''}`}
                  onClick={() => { destTouchedRef.current = true; setDestination('songs'); setCategoryId(null); }}
                  aria-pressed={destination === 'songs'}
                >
                  <Music size={15} /> המלצות שירים 🎵
                </button>
                <button
                  type="button"
                  className={`space-goal-chip${destination === 'content' ? ' space-goal-chip-active' : ''}`}
                  onClick={() => { destTouchedRef.current = true; setDestination('content'); setCategoryId(null); }}
                  aria-pressed={destination === 'content'}
                >
                  <Video size={15} /> המלצות תוכן 🎬
                </button>
              </div>
            </fieldset>

            <fieldset className="space-goal-fieldset song-cat-fieldset">
              <legend>קטגוריה</legend>
              <div className="space-goal-chips song-cat-picker">
                {categories.length === 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>אין קטגוריות עדיין — צור/י אחת למטה</span>
                )}
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    className={`space-goal-chip${categoryId === cat.id ? ' space-goal-chip-active' : ''}`}
                    onClick={() => setCategoryId(cat.id)}
                    aria-pressed={categoryId === cat.id}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="song-cat-add" style={{ marginTop: '10px' }}>
                <Plus size={15} />
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }}
                  placeholder="קטגוריה חדשה..."
                  disabled={creatingCat}
                />
                <button type="button" className="btn btn-secondary" onClick={createCategory} disabled={creatingCat || !newCatName.trim()}>
                  יצירה
                </button>
              </div>
            </fieldset>

            <label className="song-field">
              <span>שם (אופציונלי — ממולא אוטומטית מהקישור)</span>
              <input
                type="text"
                value={title}
                onChange={(e) => { titleTouchedRef.current = true; setTitle(e.target.value); }}
                placeholder={fetchingMeta ? 'מזהה...' : 'ימולא אוטומטית'}
              />
            </label>

            {destination === 'songs' ? (
              <label className="song-field">
                <span>הערה (אופציונלי)</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="אופציונלי"
                />
              </label>
            ) : (
              <>
                <fieldset className="space-goal-fieldset song-cat-fieldset">
                  <legend>סוג התוכן</legend>
                  <div className="space-goal-chips song-cat-picker">
                    {[
                      { value: 'video', label: '🎬 סרטון' },
                      { value: 'post', label: '💬 פוסט' },
                      { value: 'article', label: '📖 מאמר' }
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        className={`space-goal-chip${type === opt.value ? ' space-goal-chip-active' : ''}`}
                        onClick={() => setType(opt.value)}
                        aria-pressed={type === opt.value}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="song-field">
                  <span>תיאור קצר (אופציונלי — ממולא אוטומטית)</span>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="מה יש לצפות/לקרוא"
                  />
                </label>
                <label className="content-share-field" title="פריטים מוסתרים נשארים בספרייה ולא מוצגים למטופלים">
                  <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
                  <span>שיתוף לכל המטופלים 👁️</span>
                </label>
              </>
            )}

            {error && <div className="song-form-error">{error}</div>}
            <div className="song-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>ביטול</button>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !url.trim()}>
                {saving ? 'שומר...' : 'שיתוף 🚀'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
