'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Music, Plus, Play, Pause, Pencil, Trash2, ExternalLink, Search, Info, ListMusic, Gift, PlusCircle, ChevronLeft
} from 'lucide-react';
import { api } from '@/lib/api';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import SongEditModal from './SongEditModal';
import WhatsAppIcon from './WhatsAppIcon';
import { useMusicPlayer, isDirectAudioUrl, isStreamingUrl, type PlayerSong } from './MusicPlayerProvider';

/** שיתוף ידני בוואטספ — פותח את וואטספ עם טקסט מוכן; המשתמש שולח בעצמו */
const waShareHref = (title: string, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

interface Song {
  id: string;
  title: string;
  url: string;
  note?: string;
  thumbnailUrl?: string;
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

  // staff recommendations
  const [categories, setCategories] = useState<RecommendedCategory[]>([]);
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
  useEffect(() => { if (view === 'recommended') loadRecommendations(); }, [view, loadRecommendations]);

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

  const saveSong = async (payload: { title: string; url: string; note: string; thumbnailUrl: string }) => {
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
  const filtered = search.trim()
    ? songs.filter((s) =>
        s.title.toLowerCase().includes(search.trim().toLowerCase()) ||
        (s.note || '').toLowerCase().includes(search.trim().toLowerCase()))
    : songs;

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

          {loading ? (
            <div className="song-empty">טוען שירים...</div>
          ) : filtered.length === 0 ? (
            <div className="song-empty">
              <Music size={36} />
              <p>{songs.length === 0 ? 'עדיין לא הוספת שירים — אילו שירים עושים לך טוב?' : 'אין תוצאות לחיפוש.'}</p>
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
          ) : (
            categories.filter((c) => c.songs.length > 0).map((cat) => (
              <div key={cat.id} className="song-cat-block">
                <div className="song-cat-title">{cat.name}</div>
                <div className="song-grid">
                  {cat.songs.map((song) => {
                    const direct = isDirectAudioUrl(song.url);
                    const streaming = isStreamingUrl(song.url);
                    const active = isCurrent(song.id);
                    const inMyList = songs.some((s) => s.url === song.url);
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
                                  : player.playSong(playerSong(song), cat.songs.filter((s) => isDirectAudioUrl(s.url)).map(playerSong))
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
              </div>
            ))
          )}
        </>
      )}

      <SongEditModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={saveSong}
        metaEndpoint={`/api/portal/${encodeURIComponent(portalCode)}/songs/meta`}
        initial={
          editingId
            ? {
                title: songs.find((s) => s.id === editingId)?.title,
                url: songs.find((s) => s.id === editingId)?.url,
                note: songs.find((s) => s.id === editingId)?.note,
                thumbnailUrl: songs.find((s) => s.id === editingId)?.thumbnailUrl
              }
            : undefined
        }
        isEdit={Boolean(editingId)}
        saving={saving}
        error={editorError}
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
