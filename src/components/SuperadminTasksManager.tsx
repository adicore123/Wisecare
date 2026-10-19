'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckSquare, Square, Trash2, FolderPlus, Folder, Check, X, Info, Search, Send, Users, Pencil, Megaphone
} from 'lucide-react';
import { api } from '@/lib/api';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';

interface TaskCategory {
  id: string;
  name: string;
  createdAt: string;
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  portalCode: string;
  isSelfCare: boolean;
  tasksCount?: number;
  completedTasksCount?: number;
}

interface ClientTask {
  id: string;
  title: string;
  description: string;
  category: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}

/**
 * "משימות למרחבים" — מודול הסופראדמין: שליחת משימות לבעלי מרחב אישי.
 * המשימה מופיעה אצל המטופל בטאב "משימות ותרגולים" עם תג "📋 משימה שקיבלתי".
 */
export default function SuperadminTasksManager() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [clientTasks, setClientTasks] = useState<ClientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // category add / rename
  const [newCatName, setNewCatName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [catBusy, setCatBusy] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  // task form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, cats] = await Promise.all([
        api.getSuperadminClients(),
        api.getTaskCategories()
      ]);
      const selfCare = (Array.isArray(clientsRes) ? clientsRes : []).filter((c: any) => c.isSelfCare);
      setClients(selfCare);
      setCategories(Array.isArray(cats) ? cats : []);
      if (selfCare.length > 0 && !selfCare.some((c: ClientOption) => c.id === null)) {
        setSelectedClientId((prev) => prev || selfCare[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'שגיאה בטעינה', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ברירת מחדל: הקטגוריה הראשונה מסומנת מיד — המשימה תמיד יוצאת עם קטגוריה
  // שנראית למטופל בפורטל
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const loadClientTasks = useCallback(async (clientId: string) => {
    try {
      setTasksLoading(true);
      const tasks = await api.getTasks({ clientId });
      setClientTasks(Array.isArray(tasks) ? tasks : []);
    } catch {
      setClientTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) loadClientTasks(selectedClientId);
    else setClientTasks([]);
  }, [selectedClientId, loadClientTasks]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.portalCode || '').toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name || catBusy) return;
    try {
      setCatBusy(true);
      const cat = await api.createTaskCategory(name);
      setNewCatName('');
      setCategoryId(cat.id);
      showToast(`הקטגוריה "${name}" נוצרה 📂`);
      const cats = await api.getTaskCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה ביצירת הקטגוריה', 'error');
    } finally {
      setCatBusy(false);
    }
  };

  const saveRename = async () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      setCatBusy(true);
      await api.updateTaskCategory(renamingId, name);
      setRenamingId(null);
      showToast('שם הקטגוריה עודכן ✏️');
      const cats = await api.getTaskCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בעדכון', 'error');
    } finally {
      setCatBusy(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCatId) return;
    try {
      setDeletingCat(true);
      await api.deleteTaskCategory(deleteCatId);
      if (categoryId === deleteCatId) setCategoryId(null);
      setDeleteCatId(null);
      showToast('הקטגוריה נמחקה (משימות קיימות אינן מושפעות) 🗑️');
      const cats = await api.getTaskCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeletingCat(false);
    }
  };

  const sendTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMode && !selectedClientId) {
      setFormError('נא לבחור מרחב אישי מהרשימה');
      return;
    }
    if (!title.trim()) {
      setFormError('נא לתת כותרת למשימה');
      return;
    }
    if (!categoryId) {
      setFormError('נא לבחור קטגוריה — כך המשימה תסומן למטופל במרחב האישי');
      return;
    }
    try {
      setSending(true);
      setFormError('');
      const category = categoryId
        ? categories.find((c) => c.id === categoryId)?.name
        : undefined;

      if (broadcastMode) {
        // שידור לכל המרחבים האישיים בבת אחת — בלי בחירה אחד-אחד
        const res = await api.createTasksBulk({
          clientIds: clients.map((c) => c.id),
          title: title.trim(),
          description: description.trim(),
          category,
          dueDate: dueDate || undefined
        });
        showToast(`המשימה שודרה ל-${res.created} מרחבים אישיים 📢`);
      } else {
        await api.createTask({
          clientId: selectedClientId,
          title: title.trim(),
          description: description.trim(),
          category,
          dueDate: dueDate || undefined
        });
        showToast(`המשימה נשלחה ל${selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'המרחב'} 📋`);
        if (selectedClientId) await loadClientTasks(selectedClientId);
      }
      setTitle(''); setDescription(''); setDueDate('');
    } catch (err: any) {
      setFormError(err.message || 'שגיאה בשליחת המשימה');
    } finally {
      setSending(false);
    }
  };

  const confirmDeleteTask = async () => {
    if (!deleteTaskId) return;
    try {
      setDeletingTask(true);
      await api.deleteTask(deleteTaskId);
      setDeleteTaskId(null);
      showToast('המשימה נמחקה 🗑️');
      if (selectedClientId) await loadClientTasks(selectedClientId);
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeletingTask(false);
    }
  };

  const pending = clientTasks.filter((t) => !t.completed);
  const done = clientTasks.filter((t) => t.completed);

  if (loading) {
    return <div className="song-empty">טוען...</div>;
  }

  return (
    <div className="superadmin-songs superadmin-content superadmin-tasks">
      {/* בורר מרחב / מצב שידור */}
      <div className="song-cat-toolbar">
        <div className="song-cat-add" style={{ flex: 1, minWidth: '220px' }}>
          <Users size={17} />
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="חיפוש מרחב אישי לפי שם או קוד..."
            disabled={broadcastMode}
            style={broadcastMode ? { opacity: 0.5 } : undefined}
          />
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="song-cat-empty">
          <Info size={15} />
          <span>אין מרחבים אישיים עדיין — נרשמים דרך דף הנחיתה יופיעו כאן אוטומטית.</span>
        </div>
      ) : (
        <div className="song-cat-chips">
          {/* שידור לכולם — משימה אחת לכל המרחבים בלחיצה אחת */}
          <button
            type="button"
            className={`song-cat-tab-wrap${broadcastMode ? ' song-cat-tab-active' : ''}`}
            onClick={() => { setBroadcastMode(!broadcastMode); setSelectedClientId(null); }}
            style={{
              border: '1px solid ' + (broadcastMode ? '#059669' : '#a7f3d0'),
              background: broadcastMode ? '#059669' : '#ecfdf5',
              color: broadcastMode ? '#fff' : '#047857',
              fontWeight: 800
            }}
            title="המשימה תישלח לכל בעלי המרחבים האישיים בבת אחת"
          >
            <span className="song-cat-tab" style={{ background: 'transparent', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Megaphone size={14} /> שידור לכל המרחבים ({clients.length})
            </span>
          </button>

          {!broadcastMode && filteredClients.length === 0 && (
            <div className="song-cat-empty">
              <Search size={15} />
              <span>לא נמצאו מרחבים התואמים לחיפוש "{clientSearch}"</span>
            </div>
          )}
          {!broadcastMode && filteredClients.map((c) => {
            const active = selectedClientId === c.id;
            return (
              <button
                type="button"
                key={c.id}
                className={`song-cat-tab-wrap${active ? ' song-cat-tab-active' : ''}`}
                onClick={() => setSelectedClientId(c.id)}
                style={{ border: '1px solid #e2e8f0', background: active ? '#4f46e5' : '#fff', color: active ? '#fff' : '#334155' }}
              >
                <span className="song-cat-tab" style={{ background: 'transparent', color: 'inherit' }}>
                  {c.firstName} {c.lastName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {(selectedClient || broadcastMode) && (
        <div className="song-cat-content">
          {/* טופס שליחת משימה */}
          <div className="song-cat-content-head">
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {broadcastMode
                ? `📢 משימה לכל המרחבים (${clients.length}) — תישלח לכולם בבת אחת`
                : `📋 משימה חדשה ל${selectedClient?.firstName} ${selectedClient?.lastName}`}
            </h3>
          </div>

          <form onSubmit={sendTask} className="superadmin-tasks-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* קטגוריה — הבחירה הראשונה בפתיחת משימה חדשה */}
            <fieldset className="space-goal-fieldset song-cat-fieldset" style={{ margin: 0 }}>
              <legend>קטגוריה * (תוצג למטופל כתג על המשימה)</legend>
              <div className="space-goal-chips song-cat-picker">
                {categories.length === 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>אין קטגוריות — צור/י אחת למטה</span>
                )}
                {categories.map((cat) => {
                  const active = categoryId === cat.id;
                  return renamingId === cat.id ? (
                    <React.Fragment key={cat.id}>
                      <input
                        type="text"
                        value={renameValue}
                        autoFocus
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveRename(); } if (e.key === 'Escape') setRenamingId(null); }}
                        className="song-cat-rename"
                      />
                      <button type="button" className="song-icon-btn" onClick={saveRename} title="שמירה"><Check size={14} /></button>
                      <button type="button" className="song-icon-btn" onClick={() => setRenamingId(null)} title="ביטול"><X size={14} /></button>
                    </React.Fragment>
                  ) : (
                    <React.Fragment key={cat.id}>
                      <button
                        type="button"
                        className={`space-goal-chip${active ? ' space-goal-chip-active' : ''}`}
                        onClick={() => setCategoryId(active ? null : cat.id)}
                        aria-pressed={active}
                      >
                        <Folder size={13} /> {cat.name}
                      </button>
                      <button
                        type="button"
                        className="song-icon-btn"
                        title="שינוי שם"
                        onClick={() => { setRenamingId(cat.id); setRenameValue(cat.name); }}
                        style={{ flexShrink: 0 }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="song-icon-btn song-icon-btn-danger"
                        title="מחיקת קטגוריה"
                        onClick={() => setDeleteCatId(cat.id)}
                        style={{ flexShrink: 0 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="song-cat-add" style={{ marginTop: '10px' }}>
                <FolderPlus size={15} />
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                  placeholder="קטגוריה חדשה (לדוגמה: הרפיה)"
                  disabled={catBusy}
                />
                <button type="button" className="btn btn-secondary" onClick={addCategory} disabled={catBusy || !newCatName.trim()}>
                  יצירה
                </button>
              </div>
            </fieldset>

            <label className="song-field" style={{ margin: 0 }}>
              <span>כותרת המשימה *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="לדוגמה: תרגול נשימה 5 דקות לפני השינה"
                required
              />
            </label>

            <label className="song-field" style={{ margin: 0 }}>
              <span>תיאור / הוראות (אופציונלי)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="מה בדיוק לעשות, כמה זמן, וכו'"
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </label>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <label className="song-field" style={{ margin: 0, flex: 1, minWidth: '160px' }}>
                <span>תאריך יעד (אופציונלי)</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            {formError && <div className="song-form-error">{formError}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending}
              style={{
                alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: broadcastMode ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : undefined,
                borderColor: broadcastMode ? '#047857' : undefined
              }}
            >
              {broadcastMode ? <Megaphone size={16} /> : <Send size={16} />}
              {sending ? 'שולח...' : broadcastMode ? `שידור לכל ${clients.length} המרחבים` : 'שליחת המשימה'}
            </button>
          </form>

          {/* משימות המרחב — רק בבחירת מרחב בודד */}
          {!broadcastMode && (
          <div style={{ marginTop: '22px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              המשימות של {selectedClient.firstName} ({pending.length} ממתינות, {done.length} הושלמו)
            </h4>
            {tasksLoading ? (
              <div className="song-empty">טוען משימות...</div>
            ) : clientTasks.length === 0 ? (
              <div className="song-empty">
                <CheckSquare size={26} />
                <p>אין משימות במרחב זה עדיין</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...pending, ...done].map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                      padding: '12px 14px', opacity: t.completed ? 0.65 : 1, flexWrap: 'wrap'
                    }}
                  >
                    {t.completed ? (
                      <CheckSquare size={18} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <Square size={18} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', textDecoration: t.completed ? 'line-through' : 'none' }}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '3px', lineHeight: 1.5 }}>{t.description}</div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {t.category && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 9px', borderRadius: '20px' }}>
                            📂 {t.category}
                          </span>
                        )}
                        {t.dueDate && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fef2f2', color: '#b91c1c', padding: '2px 9px', borderRadius: '20px' }}>
                            📅 {t.dueDate}
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.completed ? '#059669' : '#94a3b8' }}>
                          {t.completed ? 'הושלמה ✓' : 'ממתינה'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="song-icon-btn song-icon-btn-danger"
                      onClick={() => setDeleteTaskId(t.id)}
                      title="מחיקת המשימה"
                      aria-label={`מחיקת ${t.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteCatId)}
        onClose={() => setDeleteCatId(null)}
        onConfirm={confirmDeleteCategory}
        title="מחיקת קטגוריה"
        message={`למחוק את "${categories.find((c) => c.id === deleteCatId)?.name || 'הקטגוריה'}"? משימות קיימות בקטגוריה זו אינן נמחקות.`}
        confirmLabel="מחיקה"
        isDanger
        loading={deletingCat}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTaskId)}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={confirmDeleteTask}
        title="מחיקת משימה"
        message={`למחוק את "${clientTasks.find((t) => t.id === deleteTaskId)?.title || 'המשימה'}"?`}
        confirmLabel="מחיקה"
        isDanger
        loading={deletingTask}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
