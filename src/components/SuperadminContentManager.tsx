'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Video, Plus, Pencil, Trash2, ExternalLink, FolderPlus, Folder, Check, X, Info,
  Eye, EyeOff, FileText, Newspaper, Download
} from 'lucide-react';
import { api } from '@/lib/api';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import ContentEditModal from './ContentEditModal';
import WhatsAppIcon from './WhatsAppIcon';

/** שיתוף ידני בוואטספ — פותח את וואטספ עם טקסט מוכן; השולח שולח בעצמו */
const waShareHref = (title: string, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

const TYPE_META: Record<string, { label: string; icon: typeof Video; badge: string }> = {
  video: { label: '🎬 סרטון', icon: Video, badge: 'song-card-type-direct' },
  post: { label: '💬 פוסט', icon: FileText, badge: 'song-card-type-stream' },
  article: { label: '📖 מאמר', icon: Newspaper, badge: '' }
};

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

interface RecommendedContentItem {
  id: string;
  categoryId: string;
  type: string;
  title: string;
  url: string;
  description?: string;
  sourceName?: string;
  thumbnailUrl?: string;
  sourceContentId?: string;
  shared: boolean;
  createdAt: string;
}

/**
 * "המלצות תוכן" — מודול הסופראדמין: ניהול קטגוריות ותוכן מומלץ
 * שיופיע למטופלים תחת "המלצות הצוות" בכרטיסיית התוכן.
 * כל פריט נושא מתג שיתוף — רק פריטים מסומנים נראים למטופלים.
 */
export default function SuperadminContentManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<RecommendedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // category add / rename
  const [newCatName, setNewCatName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [catBusy, setCatBusy] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  // item editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // share toggle + import
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importPortalCode, setImportPortalCode] = useState('my-230961');
  const [importing, setImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, list] = await Promise.all([api.getContentCategories(), api.getRecommendedContent()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setItems(Array.isArray(list) ? list : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בטעינה', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = categories.find((c) => c.id === selectedCat) || null;
  const selectedItems = items.filter((s) => s.categoryId === selectedCat);

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name || catBusy) return;
    try {
      setCatBusy(true);
      const cat = await api.createContentCategory(name);
      setNewCatName('');
      setSelectedCat(cat.id);
      showToast(`הקטגוריה "${name}" נוצרה 📂`);
      await load();
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
      await api.updateContentCategory(renamingId, name);
      setRenamingId(null);
      showToast('שם הקטגוריה עודכן ✏️');
      await load();
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
      await api.deleteContentCategory(deleteCatId);
      if (selectedCat === deleteCatId) setSelectedCat(null);
      setDeleteCatId(null);
      showToast('הקטגוריה וכל פריטיה נמחקו 🗑️');
      await load();
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeletingCat(false);
    }
  };

  const openAddItem = () => {
    if (!selectedCat) return;
    setEditingId(null);
    setEditorError('');
    setEditorOpen(true);
  };

  const openEditItem = (item: RecommendedContentItem) => {
    setEditingId(item.id);
    setEditorError('');
    setEditorOpen(true);
  };

  const saveItem = async (payload: {
    type: string; title: string; url: string; description: string; sourceName: string; thumbnailUrl: string; shared: boolean;
  }) => {
    if (saving || !selectedCat) return;
    try {
      setSaving(true);
      setEditorError('');
      const withCat = { ...payload, categoryId: selectedCat };
      if (editingId) {
        await api.updateRecommendedContent(editingId, withCat);
        showToast('הפריט עודכן ✏️');
      } else {
        await api.createRecommendedContent(withCat);
        showToast('התוכן נוסף להמלצות 🎬');
      }
      setEditorOpen(false);
      await load();
    } catch (err: any) {
      setEditorError(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteItemId) return;
    try {
      setDeletingItem(true);
      await api.deleteRecommendedContent(deleteItemId);
      setDeleteItemId(null);
      showToast('הפריט נמחק 🗑️');
      await load();
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeletingItem(false);
    }
  };

  const toggleShare = async (item: RecommendedContentItem) => {
    if (togglingId) return;
    try {
      setTogglingId(item.id);
      await api.updateRecommendedContent(item.id, { shared: !item.shared });
      setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, shared: !s.shared } : s)));
      showToast(item.shared ? `"${item.title}" הוסתר — לא יוצג למטופלים` : `"${item.title}" משותף לכל המטופלים 👁️`);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בעדכון השיתוף', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const bulkShare = async (shared: boolean) => {
    if (!selectedCat || bulkBusy) return;
    const targets = selectedItems.filter((s) => s.shared !== shared);
    if (targets.length === 0) return;
    try {
      setBulkBusy(true);
      await Promise.all(targets.map((s) => api.updateRecommendedContent(s.id, { shared })));
      setItems((prev) => prev.map((s) => (s.categoryId === selectedCat ? { ...s, shared } : s)));
      showToast(shared ? `${targets.length} פריטים שותפו לכולם 👁️` : `${targets.length} פריטים הוסתרו`);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בעדכון השיתוף', 'error');
      await load();
    } finally {
      setBulkBusy(false);
    }
  };

  const runImport = async () => {
    const portalCode = importPortalCode.trim();
    if (!portalCode || importing) return;
    try {
      setImporting(true);
      const res = await api.importPortalContentToRecommendations(portalCode);
      setImportOpen(false);
      await load();
      showToast(`יובאו ${res.imported} פריטים מהפורטל${res.skipped ? ` (${res.skipped} דולגו — כבר קיימים)` : ''} 📥`);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בייבוא', 'error');
    } finally {
      setImporting(false);
    }
  };

  const editingItem = editingId ? items.find((s) => s.id === editingId) : undefined;

  return (
    <div className="superadmin-songs superadmin-content">
      <div className="song-cat-toolbar">
        <div className="song-cat-add">
          <FolderPlus size={17} />
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
            placeholder="שם קטגוריה חדשה (לדוגמה: נשימות ומדיטציה)"
            disabled={catBusy}
          />
          <button type="button" className="btn btn-primary" onClick={addCategory} disabled={catBusy || !newCatName.trim()}>
            <Plus size={15} /> יצירה
          </button>
        </div>
        <button type="button" className="btn btn-secondary content-import-btn" onClick={() => setImportOpen(true)}>
          <Download size={15} /> ייבוא תוכן מפורטל
        </button>
      </div>

      {loading ? (
        <div className="song-empty">טוען...</div>
      ) : (
        <div className="song-cat-chips">
          {categories.length === 0 && (
            <div className="song-cat-empty">
              <Info size={15} />
              <span>אין קטגוריות עדיין — צור/י קטגוריה ראשונה, או ייבא/י ספריית תוכן מפורטל קיים, ואז בחר/י מה לשתף למטופלים.</span>
            </div>
          )}
          {categories.map((cat) => {
            const catItems = items.filter((s) => s.categoryId === cat.id);
            const sharedCount = catItems.filter((s) => s.shared).length;
            const active = selectedCat === cat.id;
            return (
              <div key={cat.id} className={`song-cat-chip${active ? ' song-cat-chip-active' : ''}`}>
                {renamingId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenamingId(null); }}
                      className="song-cat-rename"
                    />
                    <button type="button" className="song-icon-btn" onClick={saveRename} title="שמירה"><Check size={14} /></button>
                    <button type="button" className="song-icon-btn" onClick={() => setRenamingId(null)} title="ביטול"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <button type="button" className="song-cat-select" onClick={() => setSelectedCat(cat.id)}>
                      <Folder size={15} />
                      <span>{cat.name}</span>
                      <span className="song-cat-count" title={`${sharedCount} משותפים מתוך ${catItems.length}`}>{sharedCount}/{catItems.length}</span>
                    </button>
                    <button
                      type="button"
                      className="song-icon-btn"
                      title="שינוי שם"
                      onClick={() => { setRenamingId(cat.id); setRenameValue(cat.name); }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="song-icon-btn song-icon-btn-danger"
                      title="מחיקת קטגוריה וכל פריטיה"
                      onClick={() => setDeleteCatId(cat.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="song-cat-content">
          <div className="song-cat-content-head">
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              📂 {selected.name}{' '}
              <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>
                ({selectedItems.filter((s) => s.shared).length} משותפים מתוך {selectedItems.length})
              </span>
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedItems.some((s) => !s.shared) && (
                <button type="button" className="btn btn-secondary" onClick={() => bulkShare(true)} disabled={bulkBusy}>
                  <Eye size={15} /> שיתוף הכול
                </button>
              )}
              {selectedItems.some((s) => s.shared) && (
                <button type="button" className="btn btn-secondary" onClick={() => bulkShare(false)} disabled={bulkBusy}>
                  <EyeOff size={15} /> הסתרת הכול
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={openAddItem}>
                <Plus size={15} style={{ display: 'inline', verticalAlign: '-3px', marginLeft: '5px' }} />
                הוספת תוכן מומלץ
              </button>
            </div>
          </div>

          {selectedItems.length === 0 ? (
            <div className="song-empty">
              <Video size={30} />
              <p>אין פריטים בקטגוריה זו עדיין</p>
            </div>
          ) : (
            <div className="song-grid">
              {selectedItems.map((item) => {
                const typeMeta = TYPE_META[item.type] || TYPE_META.video;
                const thumbSrc = item.thumbnailUrl ||
                  (item.sourceContentId ? `/api/content/${item.sourceContentId}/image` : '');
                return (
                  <div key={item.id} className={`song-card${item.shared ? '' : ' content-card-hidden'}`}>
                    <a
                      className="song-thumb-link"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`פתיחת "${item.title}"`}
                    >
                      {thumbSrc ? (
                        <div className="song-card-thumb">
                          <img src={thumbSrc} alt={item.title} loading="lazy" />
                        </div>
                      ) : (
                        <div className="song-card-icon"><Video size={19} /></div>
                      )}
                    </a>
                    <div className="song-card-body">
                      <div className="song-card-title" title={item.title}>{item.title}</div>
                      {item.description && <div className="song-card-note" title={item.description}>{item.description}</div>}
                      <div className="song-card-meta-row">
                        <div className={`song-card-type${typeMeta.badge ? ` ${typeMeta.badge}` : ''}`}>
                          {typeMeta.label}
                        </div>
                        <span className={`content-share-badge${item.shared ? ' content-share-badge-on' : ''}`}>
                          {item.shared ? '👁️ משותף' : '🚫 מוסתר'}
                        </span>
                      </div>
                    </div>
                    <div className="song-card-actions">
                      <button
                        type="button"
                        className={`song-icon-btn content-share-toggle${item.shared ? ' content-share-toggle-on' : ''}`}
                        onClick={() => toggleShare(item)}
                        disabled={togglingId === item.id}
                        title={item.shared ? 'הסתרה — לא יוצג למטופלים' : 'שיתוף לכל המטופלים'}
                        aria-label={item.shared ? `הסתרת ${item.title}` : `שיתוף ${item.title}`}
                      >
                        {item.shared ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <a
                        className="song-play-btn song-play-btn-ext"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="פתיחה בטאב חדש"
                        aria-label={`פתיחת ${item.title}`}
                      >
                        <ExternalLink size={16} />
                      </a>
                      <a
                        className="song-icon-btn song-share-btn"
                        href={waShareHref(item.title, item.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="שיתוף בוואטספ"
                        aria-label={`שיתוף "${item.title}" בוואטספ`}
                      >
                        <WhatsAppIcon size={15} />
                      </a>
                      <button type="button" className="song-icon-btn" onClick={() => openEditItem(item)} title="עריכה" aria-label={`עריכת ${item.title}`}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="song-icon-btn song-icon-btn-danger" onClick={() => setDeleteItemId(item.id)} title="מחיקה" aria-label={`מחיקת ${item.title}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ContentEditModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={saveItem}
        initial={
          editingItem
            ? {
                type: editingItem.type,
                title: editingItem.title,
                url: editingItem.url,
                description: editingItem.description,
                sourceName: editingItem.sourceName,
                thumbnailUrl: editingItem.thumbnailUrl,
                shared: editingItem.shared
              }
            : undefined
        }
        isEdit={Boolean(editingId)}
        saving={saving}
        error={editorError}
      />

      {importOpen && (
        <div className="song-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setImportOpen(false); }}>
          <div className="song-modal">
            <h3>ייבוא תוכן מפורטל 📥</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 14px 0', lineHeight: 1.5 }}>
              כל הסרטונים, הפוסטים והמאמרים של המרחב יועתקו לכאן, ממוינים לקטגוריות לפי סוג.
              הפריטים ייבאו <b>במצב מוסתר</b> — תוכל/י להדליק שיתוף לכל פריט שתבחר/י.
            </p>
            <label className="song-field">
              <span>קוד פורטל</span>
              <input
                type="text"
                dir="ltr"
                value={importPortalCode}
                autoFocus
                onChange={(e) => setImportPortalCode(e.target.value)}
                placeholder="my-230961"
              />
            </label>
            <div className="song-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(false)} disabled={importing}>
                ביטול
              </button>
              <button type="button" className="btn btn-primary" onClick={runImport} disabled={importing || !importPortalCode.trim()}>
                {importing ? 'מייבא...' : 'התחלת ייבוא'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteCatId)}
        onClose={() => setDeleteCatId(null)}
        onConfirm={confirmDeleteCategory}
        title="מחיקת קטגוריה"
        message={`למחוק את "${categories.find((c) => c.id === deleteCatId)?.name || 'הקטגוריה'}"? כל הפריטים בתוכה יימחקו גם כן.`}
        confirmLabel="מחיקה"
        isDanger
        loading={deletingCat}
      />

      <ConfirmModal
        isOpen={Boolean(deleteItemId)}
        onClose={() => setDeleteItemId(null)}
        onConfirm={confirmDeleteItem}
        title="מחיקת תוכן מומלץ"
        message={`למחוק את "${items.find((s) => s.id === deleteItemId)?.title || 'הפריט'}" מההמלצות?`}
        confirmLabel="מחיקה"
        isDanger
        loading={deletingItem}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
