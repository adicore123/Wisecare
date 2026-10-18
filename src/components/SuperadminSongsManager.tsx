'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Music, Plus, Pencil, Trash2, ExternalLink, FolderPlus, Folder, FolderInput, Check, X, Info
} from 'lucide-react';
import { api } from '@/lib/api';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import SongEditModal from './SongEditModal';
import WhatsAppIcon from './WhatsAppIcon';
import { isDirectAudioUrl, isStreamingUrl } from './MusicPlayerProvider';

/** שיתוף ידני בוואטספ — פותח את וואטספ עם טקסט מוכן; השולח שולח בעצמו */
const waShareHref = (title: string, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

interface RecommendedSong {
  id: string;
  categoryId: string;
  title: string;
  url: string;
  note?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

/**
 * "המלצות שירים" — מודול הסופראדמין: ניהול קטגוריות ושירים מומלצים
 * שיופיעו לכל המטופלים תחת "המלצות הצוות" במרחב האישי.
 */
export default function SuperadminSongsManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [songs, setSongs] = useState<RecommendedSong[]>([]);
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

  // song editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [deleteSongId, setDeleteSongId] = useState<string | null>(null);
  const [deletingSong, setDeletingSong] = useState(false);
  const [moveSongId, setMoveSongId] = useState<string | null>(null);
  const [movingSong, setMovingSong] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, list] = await Promise.all([api.getSongCategories(), api.getRecommendedSongs()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSongs(Array.isArray(list) ? list : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בטעינה', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = categories.find((c) => c.id === selectedCat) || null;
  const selectedSongs = songs.filter((s) => s.categoryId === selectedCat);

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name || catBusy) return;
    try {
      setCatBusy(true);
      const cat = await api.createSongCategory(name);
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
      await api.updateSongCategory(renamingId, name);
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
      await api.deleteSongCategory(deleteCatId);
      if (selectedCat === deleteCatId) setSelectedCat(null);
      setDeleteCatId(null);
      showToast('הקטגוריה וכל שיריה נמחקו 🗑️');
      await load();
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeletingCat(false);
    }
  };

  const openAddSong = () => {
    if (!selectedCat) return;
    setEditingId(null);
    setEditorError('');
    setEditorOpen(true);
  };

  const openEditSong = (song: RecommendedSong) => {
    setEditingId(song.id);
    setEditorError('');
    setEditorOpen(true);
  };

  const saveSong = async (payload: { title: string; url: string; note: string; thumbnailUrl: string; categoryId?: string | null }) => {
    if (saving) return;
    try {
      setSaving(true);
      setEditorError('');
      // הקטגוריה נבחרת במודל; אם לא נבחרה — הקטגוריה הפתוחה
      const targetCat = payload.categoryId || selectedCat;
      if (!targetCat) {
        setEditorError('נא לבחור קטגוריה');
        return;
      }
      const withCat = { ...payload, categoryId: targetCat };
      if (editingId) {
        await api.updateRecommendedSong(editingId, withCat);
        showToast('השיר עודכן ✏️');
      } else {
        await api.createRecommendedSong(withCat);
        showToast('השיר נוסף להמלצות 🎵');
      }
      setEditorOpen(false);
      await load();
    } catch (err: any) {
      setEditorError(err.message || 'שגירה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  /** העברת שיר לקטגוריה אחרת — מהכרטיס עצמו */
  const moveSong = async (songId: string, categoryId: string) => {
    if (movingSong) return;
    try {
      setMovingSong(true);
      await api.updateRecommendedSong(songId, { categoryId });
      setMoveSongId(null);
      showToast('השיר הועבר לקטגוריה החדשה 📂');
      await load();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בהעברת השיר', 'error');
    } finally {
      setMovingSong(false);
    }
  };

  const confirmDeleteSong = async () => {
    if (!deleteSongId) return;
    try {
      setDeletingSong(true);
      await api.deleteRecommendedSong(deleteSongId);
      setDeleteSongId(null);
      showToast('השיר נמחק 🗑️');
      await load();
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeletingSong(false);
    }
  };

  return (
    <div className="superadmin-songs">
      <div className="song-cat-toolbar">
        <div className="song-cat-add">
          <FolderPlus size={17} />
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
            placeholder="שם קטגוריה חדשה (לדוגמה: שירים מרגיעים)"
            disabled={catBusy}
          />
          <button type="button" className="btn btn-primary" onClick={addCategory} disabled={catBusy || !newCatName.trim()}>
            <Plus size={15} /> יצירה
          </button>
        </div>
      </div>

      {loading ? (
        <div className="song-empty">טוען...</div>
      ) : (
        <div className="song-cat-chips">
          {categories.length === 0 && (
            <div className="song-cat-empty">
              <Info size={15} />
              <span>אין קטגוריות עדיין — צור/י קטגוריה ראשונה, ואז הוסף/י אליה שירים שיופיעו למטופלים תחת "המלצות הצוות".</span>
            </div>
          )}
          {categories.map((cat) => {
            const count = songs.filter((s) => s.categoryId === cat.id).length;
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
                      <span className="song-cat-count">{count}</span>
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
                      title="מחיקת קטגוריה וכל שיריה"
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
              📂 {selected.name} <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>({selectedSongs.length} שירים)</span>
            </h3>
            <button type="button" className="btn btn-primary" onClick={openAddSong}>
              <Plus size={15} style={{ display: 'inline', verticalAlign: '-3px', marginLeft: '5px' }} />
              הוספת שיר מומלץ
            </button>
          </div>

          {selectedSongs.length === 0 ? (
            <div className="song-empty">
              <Music size={30} />
              <p>אין שירים בקטגוריה זו עדיין</p>
            </div>
          ) : (
            <div className="song-grid">
              {selectedSongs.map((song) => {
                const direct = isDirectAudioUrl(song.url);
                const streaming = isStreamingUrl(song.url);
                return (
                  <div key={song.id} className="song-card">
                    <a
                      className="song-thumb-link"
                      href={song.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`פתיחת "${song.title}"`}
                    >
                      {song.thumbnailUrl ? (
                        <div className="song-card-thumb">
                          <img src={song.thumbnailUrl} alt={song.title} loading="lazy" />
                        </div>
                      ) : (
                        <div className="song-card-icon"><Music size={19} /></div>
                      )}
                    </a>
                    <div className="song-card-body">
                      <div className="song-card-title" title={song.title}>{song.title}</div>
                      {song.note && <div className="song-card-note" title={song.note}>{song.note}</div>}
                      <div className={`song-card-type${direct ? ' song-card-type-direct' : streaming ? ' song-card-type-stream' : ''}`}>
                        {direct ? '🔊 ניגון ברקע' : streaming ? '▶ פתיחה באפליקציה' : '🔗 קישור'}
                      </div>
                    </div>
                    <div className="song-card-actions">
                      <button
                        type="button"
                        className="song-icon-btn content-move-btn"
                        onClick={() => setMoveSongId(song.id)}
                        title="העברה לקטגוריה אחרת"
                        aria-label={`העברת ${song.title} לקטגוריה אחרת`}
                      >
                        <FolderInput size={15} />
                      </button>
                      <a
                        className="song-play-btn song-play-btn-ext"
                        href={song.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="פתיחה בטאב חדש"
                        aria-label={`פתיחת ${song.title}`}
                      >
                        <ExternalLink size={16} />
                      </a>
                      <a
                        className="song-icon-btn song-share-btn"
                        href={waShareHref(song.title, song.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="שיתוף בוואטספ"
                        aria-label={`שיתוף "${song.title}" בוואטספ`}
                      >
                        <WhatsAppIcon size={15} />
                      </a>
                      <button type="button" className="song-icon-btn" onClick={() => openEditSong(song)} title="עריכה" aria-label={`עריכת ${song.title}`}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="song-icon-btn song-icon-btn-danger" onClick={() => setDeleteSongId(song.id)} title="מחיקה" aria-label={`מחיקת ${song.title}`}>
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

      <SongEditModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={saveSong}
        metaEndpoint="/api/recommended-songs/meta"
        categories={categories}
        categoryLabel="קטגוריה"
        initial={
          editingId
            ? {
                title: songs.find((s) => s.id === editingId)?.title,
                url: songs.find((s) => s.id === editingId)?.url,
                note: songs.find((s) => s.id === editingId)?.note,
                thumbnailUrl: songs.find((s) => s.id === editingId)?.thumbnailUrl,
                categoryId: songs.find((s) => s.id === editingId)?.categoryId
              }
            : { categoryId: selectedCat }
        }
        isEdit={Boolean(editingId)}
        saving={saving}
        error={editorError}
      />

      {/* העברת שיר לקטגוריה אחרת */}
      {moveSongId && (
        <div className="song-modal-overlay" style={{ zIndex: 1250 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setMoveSongId(null); }}>
          <div className="song-modal" style={{ maxWidth: '400px' }}>
            <h3>העברה לקטגוריה 📂</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 14px 0' }}>
              לאיזו קטגוריה להעביר את "{(songs.find((s) => s.id === moveSongId)?.title || 'השיר').slice(0, 50)}"?
            </p>
            <div className="space-goal-chips song-cat-picker" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              {categories.map((cat) => {
                const current = songs.find((s) => s.id === moveSongId)?.categoryId === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    className={`space-goal-chip${current ? ' space-goal-chip-active' : ''}`}
                    onClick={() => moveSong(moveSongId, cat.id)}
                    disabled={movingSong}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <Folder size={14} /> {cat.name} {current && '✓ (נוכחית)'}
                  </button>
                );
              })}
            </div>
            <div className="song-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setMoveSongId(null)} disabled={movingSong}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteCatId)}
        onClose={() => setDeleteCatId(null)}
        onConfirm={confirmDeleteCategory}
        title="מחיקת קטגוריה"
        message={`למחוק את "${categories.find((c) => c.id === deleteCatId)?.name || 'הקטגוריה'}"? כל השירים בתוכה יימחקו גם כן.`}
        confirmLabel="מחיקה"
        isDanger
        loading={deletingCat}
      />

      <ConfirmModal
        isOpen={Boolean(deleteSongId)}
        onClose={() => setDeleteSongId(null)}
        onConfirm={confirmDeleteSong}
        title="מחיקת שיר מומלץ"
        message={`למחוק את "${songs.find((s) => s.id === deleteSongId)?.title || 'השיר'}" מההמלצות?`}
        confirmLabel="מחיקה"
        isDanger
        loading={deletingSong}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
