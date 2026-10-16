'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Music, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

/**
 * נגן מוזיקה אישי למטפל — רקע חי בכל עמודי ה-CRM.
 * ה-Provider מותקן ב-CRMWorkspaceLayout (מעל {children}) כך שה-audio element
 * שורד ניווט בין עמודים, והמיני-נגן הצף נשאר על המסך.
 *
 * רקע במובייל (כולל מעבר לווייז): Media Session API הופך את העמוד להפעלת
 * מדיה פעילה — פקדים במסך הנעילה, ומערכת ההפעלה מנמיכה את המוזיקה כשווייז
 * מדברת ומחזירה אותה אחר-כך. החייאת play בחזרה מרקע לפי התבנית של
 * LiveKitCallView (BackgroundAudioKeeper).
 */

export interface PlayerSong {
  id: string;
  title: string;
  url: string;
  note?: string;
}

/** קישור לקובץ אודיו ישיר → ניתן לניגון בנגן שלנו (כולל רקע) */
export function isDirectAudioUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(mp3|m4a|aac|ogg|oga|wav|flac|opus|webm)$/.test(path);
  } catch {
    return false;
  }
}

/** קישור לשירות סטרימינג → פתיחה חיצונית בלבד */
export function isStreamingUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be|spotify\.com|music\.apple\.com|soundcloud\.com)/i.test(url);
}

interface MusicPlayerContextValue {
  current: PlayerSong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  playSong: (song: PlayerSong, queue?: PlayerSong[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
}

export default function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PlayerSong[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const current = index >= 0 && index < queue.length ? queue[index] : null;

  const loadAndPlay = useCallback((song: PlayerSong) => {
    const el = audioRef.current;
    if (!el) return;
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    el.src = song.url;
    el.play().then(() => setIsPlaying(true)).catch(() => {
      // Autoplay block / unreachable file — surfaced in the mini-player
      setIsPlaying(false);
      setError('לא ניתן להתחיל ניגון — בדוק/י את הקישור');
    });
  }, []);

  const playSong = useCallback((song: PlayerSong, list?: PlayerSong[]) => {
    const nextQueue = list && list.length ? list : [song];
    const nextIndex = Math.max(0, nextQueue.findIndex((s) => s.id === song.id));
    setQueue(nextQueue);
    setIndex(nextIndex);
    setCollapsed(false);
    loadAndPlay(nextQueue[nextIndex] ?? song);
  }, [loadAndPlay]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.paused) {
      el.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [current]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i < 0 || queue.length === 0) return i;
      const n = (i + 1) % queue.length;
      loadAndPlay(queue[n]);
      return n;
    });
  }, [queue, loadAndPlay]);

  const prev = useCallback(() => {
    setIndex((i) => {
      if (i < 0 || queue.length === 0) return i;
      const p = (i - 1 + queue.length) % queue.length;
      loadAndPlay(queue[p]);
      return p;
    });
  }, [queue, loadAndPlay]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
    }
    setQueue([]);
    setIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  // audio element events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => next();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [next]);

  // Media Session: lock-screen controls + background audio entitlement.
  // Updated whenever the current song or playing state changes.
  useEffect(() => {
    const ms = (navigator as any).mediaSession;
    if (!ms) return;
    if (!current) {
      try { ms.metadata = null; ms.playbackState = 'none'; } catch {}
      return;
    }
    try {
      if (typeof MediaMetadata !== 'undefined') {
        ms.metadata = new MediaMetadata({
          title: current.title,
          artist: 'השירים שלי — WiseCare',
          album: 'WiseCare'
        });
      }
      ms.playbackState = isPlaying ? 'playing' : 'paused';
      const safe = (action: string, handler: () => void) => {
        try { ms.setActionHandler(action, handler); } catch {}
      };
      safe('play', () => audioRef.current?.play().catch(() => {}));
      safe('pause', () => audioRef.current?.pause());
      safe('nexttrack', next);
      safe('previoustrack', prev);
    } catch {}
  }, [current, isPlaying, next, prev]);

  // Re-assert playback when returning to the page (mobile browsers may
  // suspend the element on backgrounding — same recovery as the call view).
  useEffect(() => {
    const onVisible = () => {
      const el = audioRef.current;
      if (document.visibilityState === 'visible' && el && el.src && el.paused && isPlaying) {
        el.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isPlaying]);

  const value = useMemo<MusicPlayerContextValue>(() => ({
    current, isPlaying, currentTime, duration, error,
    playSong, togglePlay, next, prev, stop
  }), [current, isPlaying, currentTime, duration, error, playSong, togglePlay, next, prev, stop]);

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />

      {current && (
        <div className={`song-mini${collapsed ? ' song-mini-collapsed' : ''}`} dir="rtl">
          {collapsed ? (
            <button type="button" className="song-mini-disc" onClick={() => setCollapsed(false)} title="פתיחת הנגן">
              <Music size={20} className={isPlaying ? 'song-mini-spin' : ''} />
            </button>
          ) : (
            <>
              <div className="song-mini-head">
                <Music size={15} />
                <span className="song-mini-title" title={current.title}>{current.title}</span>
                <button type="button" className="song-mini-icon-btn" onClick={() => setCollapsed(true)} title="מזעור">
                  <ChevronDown size={15} />
                </button>
                <button type="button" className="song-mini-icon-btn" onClick={stop} title="סגירה">
                  <X size={15} />
                </button>
              </div>

              <div className="song-mini-progress">
                <span className="song-mini-time">{fmt(currentTime)}</span>
                <div className="song-mini-bar">
                  <div
                    className="song-mini-bar-fill"
                    style={{ width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
                  />
                </div>
                <span className="song-mini-time">{fmt(duration)}</span>
              </div>

              <div className="song-mini-controls">
                <button type="button" className="song-mini-icon-btn" onClick={prev} title="הקודם">
                  <SkipForward size={16} />
                </button>
                <button type="button" className="song-mini-play" onClick={togglePlay} title={isPlaying ? 'השהיה' : 'נגן'}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button type="button" className="song-mini-icon-btn" onClick={next} title="הבא">
                  <SkipBack size={16} />
                </button>
                {isStreamingUrl(current.url) ? null : (
                  <a
                    className="song-mini-icon-btn song-mini-ext"
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="פתיחת מקור השיר"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {error && <div className="song-mini-error">{error}</div>}
            </>
          )}
        </div>
      )}
    </MusicPlayerContext.Provider>
  );
}
