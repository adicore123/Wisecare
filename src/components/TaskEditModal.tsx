'use client';

import React, { useEffect, useState } from 'react';

export interface TaskEditPayload {
  title: string;
  description: string;
  category: string;
  dueDate: string;
}

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: TaskEditPayload) => void;
  initial?: { title?: string; description?: string; category?: string; dueDate?: string | null };
  categories: Array<{ id: string; name: string }>;
  saving: boolean;
  error: string | null;
}

/**
 * עריכת משימה קיימת — כותרת, תיאור, קטגוריה ותאריך יעד.
 * הקטגוריה נשמרת על המשימה כטקסט; בחירה מהרשימה או הזנה חופשית.
 */
export default function TaskEditModal({
  isOpen, onClose, onSave, initial, categories, saving, error
}: TaskEditModalProps) {
  const [form, setForm] = useState<TaskEditPayload>({ title: '', description: '', category: '', dueDate: '' });
  const [titleTouched, setTitleTouched] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: initial?.title || '',
        description: initial?.description || '',
        category: initial?.category || '',
        dueDate: initial?.dueDate || ''
      });
      setLocalError('');
      setTitleTouched(Boolean(initial?.title));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = () => {
    if (!form.title.trim()) {
      setLocalError('נא לתת כותרת למשימה');
      return;
    }
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      dueDate: form.dueDate || ''
    });
  };

  const shownError = localError || error;

  return (
    <div className="song-modal-overlay" style={{ zIndex: 1300 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="song-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>עריכת משימה ✏️</h3>

        <fieldset className="space-goal-fieldset song-cat-fieldset">
          <legend>קטגוריה</legend>
          <div className="space-goal-chips song-cat-picker">
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`space-goal-chip${form.category === c.name ? ' space-goal-chip-active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, category: f.category === c.name ? '' : c.name }))}
                aria-pressed={form.category === c.name}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="song-field">
          <span>כותרת המשימה *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => { setTitleTouched(true); setForm((f) => ({ ...f, title: e.target.value })); }}
            autoFocus={!titleTouched}
            placeholder="כותרת..."
          />
        </label>

        <label className="song-field">
          <span>תיאור / הוראות</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </label>

        <label className="song-field">
          <span>תאריך יעד</span>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            style={{ width: '100%' }}
          />
        </label>

        {shownError && <div className="song-form-error">{shownError}</div>}
        <div className="song-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>ביטול</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'שומר...' : 'שמירת שינויים'}
          </button>
        </div>
      </div>
    </div>
  );
}
