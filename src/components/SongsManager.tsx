'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Music, Plus, Play, Pause, Pencil, Trash2, ExternalLink, Search, Info, ListMusic, Gift, PlusCircle,
  ChevronLeft, FolderPlus, Folder, Check, X
} from 'lucide-react';
import { api } from '@/lib/api';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import SongEditModal from './SongEditModal';
import WhatsAppIcon from './WhatsAppIcon';
import { useMusicPlayer, isDirectAudioUrl, isStreamingUrl, type PlayerSong } from './MusicPlayerProvider';

/** כותרת מעוצבת של הקטגוריה הנבחרת — מעל גריד השירים */
function CategoryHeading({ name, count, onPlayAll, playAllDisabled }: {
  name: string;
  count: number;
  onPlayAll?: () => void;
  playAllDisabled?: boolean;
}) {
  return (
    <div className="song-cat-heading">
      <span className="song-cat-heading-icon" aria-hidden="true">
        {onPlayAll ? <Gift size={19} /> : <Folder size={19} />}
      </span>
      <div style={{ minWidth: 0 }}>
        <h3>{name}</h3>
        <div className="song-cat-heading-meta">
          <span className="song-cat-heading-count">
            {count === 1 ? 'שיר אחד' : `${count} שירים`}
          </span>
          {onPlayAll && (
            <button
              type="button"
              className="song-cat-heading-play"
              onClick={onPlayAll}
              disabled={playAllDisabled}
            >
              <Play size={12} aria-hidden="true" />
              נגן את הקטגוריה
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** שיתוף ידני בוואטספ — פותח את וואטספ עם טקסט מוכן; המשתמש שולח בעצמו */
const waShareHref = (title: string, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

interface Song {
  id: string;
  title: string;
  url: string;
  note?: string;
  thumbnailUrl?: string;
  categoryId?: string | null;
  createdAt: string;
}

interface MyCategory {
  id: string;
  name: string;
  createdAt: string;
}

interface RecommendedCategory {
  id: string;
  name: string;
  songs: Array<{ id: string; title: string; url: string; note?: string; thumbnailUrl?: string }>;
}

/**
 * "השירים שלי" — מודול אישי למטופל במרחב: רשימת שירים שעושים טוב
 * + "המלצות הצוות" (קטגוריות שירים שהסופראדמין המליץ).
 * הנגן ממשיך ברקע בכל טאבי המרחב (ובנייד — גם במעבר לווייז).
 */
export default function SongsManager({ portalCode }: { portalCode: string }) {
  const [view, setView] = useState<'mine' | 'recommended'>('mine');

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');

  // my categories (patient-owned) — chip navigation + management
  const [myCategories, setMyCategories] = useState<MyCategory[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null); // null = הכול
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameCatValue, setRenameCatValue] = useState('');
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  // staff recommendations — chip navigation too
  const [categories, setCategories] = useState<RecommendedCategory[]>([]);
  const [recSelectedCat, setRecSelectedCat] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  // add / edit modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addingRecId, setAddingRecId] = useState<string | null>(null);

  const player = useMusicPlayer();
  const playerSong = (s: { id: string; title: string; url: string; note?: string }): PlayerSong =>
    ({ id: s.id, title: s.title, url: s.url, note: s.note });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadSongs = useCallback(async () => {
    try {
      setLoading(true);
      const list = await api.getPortalSongs(portalCode);
      setSongs(Array.isArray(list) ? list : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בטעינת השירים', 'error');
    } finally {
      setLoading(false);
    }
  }, [portalCode]);

  const loadCategories = useCallback(async () => {
    try {
      const list = await api.getPortalSongCategories(portalCode);
      setMyCategories(Array.isArray(list) ? list : []);
    } catch {} // כישלון שקט — הקטגוריות הן שיפור חוויה
  }, [portalCode]);

  const loadRecommendations = useCallback(async () => {
    try {
      setRecLoading(true);
      const res = await fetch(`/api/portal/${encodeURIComponent(portalCode)}/song-recommendations`);
      if (!res.ok) return;
      const list = await res.json();
      setCategories(Array.isArray(list) ? list : []);
    } catch {} finally {
      setRecLoading(false);
    }
  }, [portalCode]);

  useEffect(() => { loadSongs(); }, [loadSongs]);
  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { if (view === 'recommended') loadRecommendations(); }, [view, loadRecommendations]);

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name || addingCat) return;
    try {
      setAddingCat(true);
      const cat = await api.createPortalSongCategory(portalCode, name);
      setNewCatName('');
      setSelectedCat(cat.id);
      showToast(`הקטגוריה "${name}" נוצרה 📂`);
      await loadCategories();
    } catch (err: any) {
      showToast(err.message || 'שגיאה ביצירת הקטגוריה', 'error');
    } finally {
      setAddingCat(false);
    }
  };

  const saveRenameCategory = async () => {
    if (!renamingCatId) return;
    const name = renameCatValue.trim();
    if (!name) return;
    try {
      await api.updatePortalSongCategory(portalCode, renamingCatId, name);
      setRenamingCatId(null);
      showToast('שם הקטגוריה עודכן ✏️');
      await loadCategories();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בעדכון', 'error');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCatId) return;
    try {
      setDeletingCat(true);
      await api.deletePortalSongCategory(portalCode, deleteCatId);
      if (selectedCat === deleteCatId) setSelectedCat(null);
      setDeleteCatId(null);
      showToast('הקטגוריה נמחקה — השירים שבתוכה נשארו אצלך 🗑️');
      await Promise.all([loadCategories(), loadSongs()]);
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeletingCat(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setEditorError('');
    setEditorOpen(true);
  };

  const openEdit = (song: Song) => {
    setEditingId(song.id);
    setEditorError('');
    setEditorOpen(true);
  };

  const saveSong = async (payload: { title: string; url: string; note: string; thumbnailUrl: string; categoryId?: string | null }) => {
    if (saving) return;
    try {
      setSaving(true);
      setEditorError('');
      if (editingId) {
        await api.updatePortalSong(portalCode, editingId, payload);
        showToast('השיר עודכן בהצלחה ✏️');
      } else {
        await api.createPortalSong(portalCode, payload);
        showToast('השיר נוסף לרשימה שלך 🎵');
      }
      setEditorOpen(false);
      await loadSongs();
    } catch (err: any) {
      setEditorError(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await api.deletePortalSong(portalCode, deleteId);
      if (player.current?.id === deleteId) player.stop();
      setDeleteId(null);
      showToast('השיר נמחק 🗑️');
      await loadSongs();
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const addRecommendedToMine = async (song: RecommendedCategory['songs'][number]) => {
    if (addingRecId) return;
    try {
      setAddingRecId(song.id);
      await api.createPortalSong(portalCode, {
        title: song.title,
        url: song.url,
        note: song.note || '',
        thumbnailUrl: song.thumbnailUrl || ''
      });
      showToast(`"${song.title}" נוסף לשירים שלך 🎵`);
      await loadSongs();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בהוספה', 'error');
    } finally {
      setAddingRecId(null);
    }
  };

  const playable = songs.filter((s) => isDirectAudioUrl(s.url));
  const filtered = songs
    .filter((s) => (selectedCat ? (s.categoryId || null) === selectedCat : true))
    .filter((s) => !search.trim()
      ? true
      : s.title.toLowerCase().includes(search.trim().toLowerCase()) ||
        (s.note || '').toLowerCase().includes(search.trim().toLowerCase()));

  const isCurrent = (id: string) => player.current?.id === id;

  /** תמונה/אייקון — לחיצה פותחת את קישור השיר בטאב חדש */
  const SongThumb = ({ song, active }: { song: { url: string; thumbnailUrl?: string; title: string }; active?: boolean }) => (
    <a
      className="song-thumb-link"
      href={song.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`פתיחת "${song.title}" בטאב חדש`}
      title={`פתיחת "${song.title}"`}
      onClick={(e) => e.stopPropagation()}
    >
      {song.thumbnailUrl ? (
        <div className="song-card-thumb">
          <img src={song.thumbnailUrl} alt={`תמונת השיר ${song.title}`} loading="lazy" />
        </div>
      ) : (
        <div className="song-card-icon">
          <Music size={19} className={active && player.isPlaying ? 'song-mini-spin' : ''} />
        </div>
      )}
    </a>
  );

  /** כפתור שיתוף וואטספ — ידני, ללא שליחה אוטומטית */
  const ShareButton = ({ song }: { song: { title: string; url: string } }) => (
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
  );

  return (
    <div className="songs-page">
      <div className="page-header" style={{ justifyContent: 'center', textAlign: 'center', display: 'block' }}>
        <div className="page-title-group">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            השירים שלי 🎵
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px' }}>
            שירים שעושים לך טוב — הנגן ממשיך להתנגן ברקע בכל המרחב
          </p>
        </div>
      </div>

      {view === 'mine' ? (
        /* כפתור-ענק: המלצות הצוות — בולט, בצבע הפלטה האישית */
        <button type="button" className="song-rec-hero" onClick={() => setView('recommended')}>
          <span className="song-rec-hero-icon" aria-hidden="true"><Gift size={24} /></span>
          <span className="song-rec-hero-texts">
            <span className="song-rec-hero-title">ההמלצות של הצוות 🎁</span>
            <span className="song-rec-hero-sub">שירים שהצוות שלנו בחר במיוחד בשבילך — להאזנה ולהוספה לרשימה שלך</span>
          </span>
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className="song-back-btn" onClick={() => setView('mine')}>
          <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          חזרה לשירים שלי
        </button>
      )}

      {view === 'mine' && (
        <>
          <div className="page-actions" style={{ justifyContent: 'center', display: 'flex', marginBottom: '14px' }}>
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} style={{ display: 'inline', verticalAlign: '-3px', marginLeft: '5px' }} />
              הוספת שיר
            </button>
          </div>

          {/* ניווט קטגוריות אישיות — כפתורים ייעודיים, לא בלוקים פרוסים */}
          <div className="song-cat-bar" role="tablist" aria-label="קטגוריות השירים שלי">
            <button
              type="button"
              className={`song-cat-tab${selectedCat === null ? ' song-cat-tab-active' : ''}`}
              onClick={() => setSelectedCat(null)}
              role="tab"
              aria-selected={selectedCat === null}
            >
              <Music size={14} /> הכול <span className="song-cat-count">{songs.length}</span>
            </button>
            {myCategories.map((cat) => {
              const count = songs.filter((s) => (s.categoryId || null) === cat.id).length;
              return (
                <div key={cat.id} className={`song-cat-tab-wrap${selectedCat === cat.id ? ' song-cat-tab-active' : ''}`}>
                  {renamingCatId === cat.id ? (
                    <>
                      <input
                        type="text"
                        className="song-cat-rename"
                        value={renameCatValue}
                        autoFocus
                        onChange={(e) => setRenameCatValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveRenameCategory(); if (e.key === 'Escape') setRenamingCatId(null); }}
                        aria-label="שינוי שם קטגוריה"
                      />
                      <button type="button" className="song-icon-btn" onClick={saveRenameCategory} title="שמירה" aria-label="שמירת שם הקטגוריה"><Check size={13} /></button>
                      <button type="button" className="song-icon-btn" onClick={() => setRenamingCatId(null)} title="ביטול" aria-label="ביטול שינוי שם"><X size={13} /></button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="song-cat-tab"
                        onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                        role="tab"
                        aria-selected={selectedCat === cat.id}
                      >
                        <Folder size={14} /> {cat.name} <span className="song-cat-count">{count}</span>
                      </button>
                      <button type="button" className="song-icon-btn" onClick={() => { setRenamingCatId(cat.id); setRenameCatValue(cat.name); }} title="שינוי שם" aria-label={`שינוי שם הקטגוריה ${cat.name}`}><Pencil size={12} /></button>
                      <button type="button" className="song-icon-btn song-icon-btn-danger" onClick={() => setDeleteCatId(cat.id)} title="מחיקת קטגוריה" aria-label={`מחיקת הקטגוריה ${cat.name}`}><Trash2 size={12} /></button>
                    </>
                  )}
                </div>
              );
            })}
            <div className="song-cat-add-inline">
              <FolderPlus size={15} />
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                placeholder="קטגוריה חדשה שלי..."
                aria-label="שם קטגוריה חדשה"
                disabled={addingCat}
              />
              <button type="button" className="song-icon-btn" onClick={addCategory} disabled={addingCat || !newCatName.trim()} title="הוספת קטגוריה" aria-label="הוספת קטגוריה"><Plus size={14} /></button>
            </div>
          </div>

          <div className="song-tip">
            <Info size={15} />
            <span>
              <strong>טיפ לניגון ברקע (גם בזמן נהיגה עם ווייז):</strong> קישור ישיר לקובץ אודיו (MP3/M4A וכדומה) יתנגן
              בנגן שלנו ויישאר ברקע עם פקדים במסך הנעילה. קישורי יוטיוב/ספוטיפיי ייפתחו באפליקציה שלהם — שם ניגון
              ברקע דורש את המנוי שלהם.
            </span>
          </div>

          {songs.length > 3 && (
            <div className="song-toolbar">
              <div className="song-search">
                <Search size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש שיר..."
                />
              </div>
              {playable.length > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => player.playSong(playerSong(playable[0]), playable.map(playerSong))}
                >
                  <ListMusic size={15} style={{ display: 'inline', verticalAlign: '-3px', marginLeft: '5px' }} />
                  נגן הכל ({playable.length})
                </button>
              )}
            </div>
          )}

          {/* כותרת הקטגוריה הנבחרת */}
          {!loading && selectedCat && (() => {
            const cat = myCategories.find((c) => c.id === selectedCat);
            if (!cat) return null;
            const catSongs = songs.filter((s) => (s.categoryId || null) === selectedCat);
            const catPlayable = catSongs.filter((s) => isDirectAudioUrl(s.url));
            return (
              <CategoryHeading
                name={cat.name}
                count={catSongs.length}
                onPlayAll={catPlayable.length ? () => player.playSong(playerSong(catPlayable[0]), catPlayable.map(playerSong)) : undefined}
              />
            );
          })()}

          {loading ? (
            <div className="song-empty">טוען שירים...</div>
          ) : filtered.length === 0 ? (
            <div className="song-empty">
              <Music size={36} />
              <p>{songs.length === 0 ? 'עדיין לא הוספת שירים — אילו שירים עושים לך טוב?' : 'אין שירים בקטגוריה זו.'}</p>
              {songs.length === 0 && (
                <button type="button" className="btn btn-primary" onClick={openAdd}>
                  <Plus size={15} style={{ display: 'inline', verticalAlign: '-3px', marginLeft: '5px' }} />
                  הוספת השיר הראשון
                </button>
              )}
            </div>
          ) : (
            <div className="song-grid">
              {filtered.map((song) => {
                const direct = isDirectAudioUrl(song.url);
                const streaming = isStreamingUrl(song.url);
                const active = isCurrent(song.id);
                return (
                  <div key={song.id} className={`song-card${active ? ' song-card-active' : ''}`}>
                    <SongThumb song={song} active={active} />
                    <div className="song-card-body">
                      <div className="song-card-title" title={song.title}>{song.title}</div>
                      {song.note && <div className="song-card-note" title={song.note}>{song.note}</div>}
                      <div className={`song-card-type${direct ? ' song-card-type-direct' : streaming ? ' song-card-type-stream' : ''}`}>
                        {direct ? '🔊 ניגון ברקע' : streaming ? '▶ פתיחה באפליקציה' : '🔗 קישור'}
                      </div>
                    </div>
                    <div className="song-card-actions">
                      {direct ? (
                        <button
                          type="button"
                          className={active ? 'song-play-btn song-play-btn-active' : 'song-play-btn'}
                          onClick={() =>
                            active
                              ? player.togglePlay()
                              : player.playSong(playerSong(song), playable.map(playerSong))
                          }
                          title={active && player.isPlaying ? 'השהיה' : 'נגן'}
                          aria-label={active && player.isPlaying ? `השהיית ${song.title}` : `נגינת ${song.title}`}
                        >
                          {active && player.isPlaying ? <Pause size={17} /> : <Play size={17} />}
                        </button>
                      ) : (
                        <a
                          className="song-play-btn song-play-btn-ext"
                          href={song.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="פתיחה באפליקציה/בטאב חדש"
                          aria-label={`פתיחת ${song.title}`}
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <ShareButton song={song} />
                      <button type="button" className="song-icon-btn" onClick={() => openEdit(song)} title="עריכה" aria-label={`עריכת ${song.title}`}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="song-icon-btn song-icon-btn-danger" onClick={() => setDeleteId(song.id)} title="מחיקה" aria-label={`מחיקת ${song.title}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'recommended' && (
        <>
          {recLoading ? (
            <div className="song-empty">טוען המלצות...</div>
          ) : categories.filter((c) => c.songs.length > 0).length === 0 ? (
            <div className="song-empty">
              <Gift size={36} />
              <p>עדיין אין המלצות צוות — המלצות שירים שהצוות יבחר יופיעו כאן 🎁</p>
            </div>
          ) : (() => {
            const available = categories.filter((c) => c.songs.length > 0);
            const active = available.find((c) => c.id === recSelectedCat) || available[0];
            return (
              <>
                {/* ניווט קטגוריות המלצות — כפתורים ייעודיים */}
                <div className="song-cat-bar" role="tablist" aria-label="קטגוריות ההמלצות">
                  {available.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      className={`song-cat-tab${active.id === cat.id ? ' song-cat-tab-active' : ''}`}
                      onClick={() => setRecSelectedCat(cat.id)}
                      role="tab"
                      aria-selected={active.id === cat.id}
                    >
                      <Gift size={14} /> {cat.name} <span className="song-cat-count">{cat.songs.length}</span>
                    </button>
                  ))}
                </div>

                <CategoryHeading
                  name={active.name}
                  count={active.songs.length}
                  onPlayAll={
                    active.songs.some((s) => isDirectAudioUrl(s.url))
                      ? () => {
                          const playableRecs = active.songs.filter((s) => isDirectAudioUrl(s.url));
                          player.playSong(playerSong(playableRecs[0]), playableRecs.map(playerSong));
                        }
                      : undefined
                  }
                />

                <div className="song-grid">
                  {active.songs.map((song) => {
                    const direct = isDirectAudioUrl(song.url);
                    const streaming = isStreamingUrl(song.url);
                    const isActive = isCurrent(song.id);
                    const inMyList = songs.some((s) => s.url === song.url);
                    return (
                      <div key={song.id} className={`song-card${isActive ? ' song-card-active' : ''}`}>
                        <SongThumb song={song} active={isActive} />
                        <div className="song-card-body">
                          <div className="song-card-title" title={song.title}>{song.title}</div>
                          {song.note && <div className="song-card-note" title={song.note}>{song.note}</div>}
                          <div className={`song-card-type${direct ? ' song-card-type-direct' : streaming ? ' song-card-type-stream' : ''}`}>
                            {direct ? '🔊 ניגון ברקע' : streaming ? '▶ פתיחה באפליקציה' : '🔗 קישור'}
                          </div>
                        </div>
                        <div className="song-card-actions">
                          {direct ? (
                            <button
                              type="button"
                              className={isActive ? 'song-play-btn song-play-btn-active' : 'song-play-btn'}
                              onClick={() =>
                                isActive
                                  ? player.togglePlay()
                                  : player.playSong(playerSong(song), active.songs.filter((s) => isDirectAudioUrl(s.url)).map(playerSong))
                              }
                              title={isActive && player.isPlaying ? 'השהיה' : 'נגן'}
                              aria-label={isActive && player.isPlaying ? `השהיית ${song.title}` : `נגינת ${song.title}`}
                            >
                              {isActive && player.isPlaying ? <Pause size={17} /> : <Play size={17} />}
                            </button>
                          ) : (
                            <a
                              className="song-play-btn song-play-btn-ext"
                              href={song.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="פתיחה באפליקציה/בטאב חדש"
                              aria-label={`פתיחת ${song.title}`}
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <ShareButton song={song} />
                          <button
                            type="button"
                            className="song-icon-btn song-add-btn"
                            onClick={() => addRecommendedToMine(song)}
                            disabled={Boolean(addingRecId)}
                            title={inMyList ? 'כבר ברשימה שלך' : 'הוסף לשירים שלי'}
                            aria-label={inMyList ? `${song.title} כבר ברשימה` : `הוספת ${song.title} לשירים שלי`}
                          >
                            <PlusCircle size={15} className={inMyList ? 'song-added-check' : ''} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </>
      )}

      <SongEditModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={saveSong}
        metaEndpoint={`/api/portal/${encodeURIComponent(portalCode)}/songs/meta`}
        categories={myCategories}
        initial={
          editingId
            ? {
                title: songs.find((s) => s.id === editingId)?.title,
                url: songs.find((s) => s.id === editingId)?.url,
                note: songs.find((s) => s.id === editingId)?.note,
                thumbnailUrl: songs.find((s) => s.id === editingId)?.thumbnailUrl,
                categoryId: songs.find((s) => s.id === editingId)?.categoryId || null
              }
            : selectedCat
              ? { categoryId: selectedCat }
              : undefined
        }
        isEdit={Boolean(editingId)}
        saving={saving}
        error={editorError}
      />

      <ConfirmModal
        isOpen={Boolean(deleteCatId)}
        onClose={() => setDeleteCatId(null)}
        onConfirm={confirmDeleteCategory}
        title="מחיקת קטגוריה"
        message={`למחוק את "${myCategories.find((c) => c.id === deleteCatId)?.name || 'הקטגוריה'}"? השירים שבתוכה לא יימחקו — הם יישארו ב״הכול״.`}
        confirmLabel="מחיקה"
        isDanger
        loading={deletingCat}
      />

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="מחיקת שיר"
        message={`למחוק את "${songs.find((s) => s.id === deleteId)?.title || 'השיר'}" מהרשימה?`}
        confirmLabel="מחיקה"
        isDanger
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
