"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  TrackToggle,
  DisconnectButton,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  useTracks
} from '@livekit/components-react';
import { Room, Track } from 'livekit-client';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Loader2, ShieldCheck, SwitchCamera } from 'lucide-react';

export interface ActiveCallSession {
  callId: string;
  token: string;
  serverUrl: string;
}

export interface LiveKitCallViewProps {
  session: ActiveCallSession;
  /** 'host' = therapist side (ends the call record), 'participant' = client side */
  role: 'host' | 'participant';
  title: string;
  subtitle?: string;
  /** Called after the room is left and (for host) the end record was updated */
  onExited?: () => void;
}

const formatDuration = (totalSec: number): string => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * A 1-second truly-silent WAV, generated at runtime.
 * iOS Safari keeps a WebRTC page alive in the background only while it is
 * "playing audio" — a looping silent element + MediaSession metadata is the
 * documented workaround (same trick Google Meet / Jitsi use on iOS web).
 */
function makeSilentWavDataUrl(): string {
  try {
    const sampleRate = 8000;
    const numSamples = sampleRate; // 1s
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    // samples default to zero = silence
    const bytes = new Uint8Array(buffer);
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as unknown as number[]);
    }
    return 'data:audio/wav;base64,' + btoa(bin);
  } catch {
    return '';
  }
}

/**
 * Keeps the call alive when the tab/app goes to the background on mobile:
 * 1. Registers MediaSession metadata → iOS/Android treat the page as an
 *    active audio session (lock-screen controls, background playback).
 * 2. Plays a looping silent audio (started from a user gesture whenever
 *    possible) → Safari does not suspend the page.
 * 3. Calls room.startAudio() on first interaction → unlocks remote audio
 *    on iOS and re-asserts playback after backgrounding.
 */
function BackgroundAudioKeeper() {
  const room = useRoomContext();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!el.src) {
      el.src = makeSilentWavDataUrl();
      el.loop = true;
    }

    const tryKeepAlive = () => {
      el.play().catch(() => {});
      room.startAudio().catch(() => {});
    };
    tryKeepAlive();

    // Re-assert on any interaction (idempotent) — covers autoplay blocks
    // and iOS suspending playback when it decides no gesture was recent.
    window.addEventListener('pointerdown', tryKeepAlive);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryKeepAlive();
    };
    document.addEventListener('visibilitychange', onVisible);

    // MediaSession: makes mobile OSes treat this page as an ongoing call.
    const mediaSession = (navigator as any).mediaSession;
    if (mediaSession && typeof MediaMetadata !== 'undefined') {
      try {
        mediaSession.metadata = new MediaMetadata({
          title: 'שיחת וידאו פעילה',
          artist: 'WiseCare',
          album: 'WiseCare'
        });
        mediaSession.playbackState = 'playing';
        // Neutral handlers so stray lock-screen taps can't kill the page
        const noop = () => {};
        ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'].forEach((action) => {
          try { mediaSession.setActionHandler(action, noop); } catch {}
        });
      } catch {}
    }

    return () => {
      window.removeEventListener('pointerdown', tryKeepAlive);
      document.removeEventListener('visibilitychange', onVisible);
      try {
        el.pause();
        el.removeAttribute('src');
      } catch {}
      const ms = (navigator as any).mediaSession;
      if (ms) {
        try {
          ms.metadata = null;
          ms.playbackState = 'none';
        } catch {}
      }
    };
  }, [room]);

  return <audio ref={audioRef} playsInline style={{ display: 'none' }} />;
}

/** Prevents the screen from sleeping mid-call (released when the call ends). */
function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let lock: any = null;
    let disposed = false;
    const acquire = async () => {
      if (disposed || lock) return;
      try { lock = await (navigator as any).wakeLock.request('screen'); } catch {}
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        lock = null; // wake locks are released automatically when hidden
        void acquire();
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisible);
      try { lock?.release(); } catch {}
    };
  }, [active]);
}

/** Cycles between front/back cameras (mobile). Hidden when only one camera exists. */
function FlipCameraButton() {
  const room = useRoomContext();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [flipping, setFlipping] = useState(false);

  const refreshDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      const list = await Room.getLocalDevices('videoinput', false);
      setDevices(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    // Re-enumerate when returning to the tab (covers plugging/unplugging a camera)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshDevices();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshDevices]);

  if (devices.length < 2) return null;

  const flip = async () => {
    if (flipping) return;
    setFlipping(true);
    try {
      const list = (await refreshDevices()).filter((d) => d.deviceId);
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const currentDeviceId = (pub?.track as any)?.mediaStreamTrack?.getSettings?.().deviceId;
      const idx = list.findIndex((d) => d.deviceId === currentDeviceId);
      const next = list[(idx + 1) % list.length];
      if (next) await room.switchActiveDevice('videoinput', next.deviceId, true);
    } catch {
    } finally {
      setFlipping(false);
    }
  };

  return (
    <button
      type="button"
      className="lk-ctrl"
      onClick={flip}
      disabled={flipping}
      title="הפוך מצלמה (קדמית/אחורית)"
      aria-label="הפוך מצלמה"
    >
      {flipping ? <Loader2 size={19} className="animate-spin" /> : <SwitchCamera size={19} />}
      <span>הפוך מצלמה</span>
    </button>
  );
}

/** Compact tile for a connected participant whose camera is off (audio-only). */
function NoVideoTile({ name, isLocal }: { name: string; isLocal?: boolean }) {
  const initial = (name || '?').trim().charAt(0) || '?';
  return (
    <div className={`lk-tile lk-tile-novideo${isLocal ? ' lk-tile-local' : ''}`}>
      <span className="lk-novideo-avatar">{initial}</span>
      {name && <span className="lk-novideo-name">{name}</span>}
      <span className="lk-novideo-hint">
        <VideoOff size={14} />
        {isLocal ? 'המצלמה שלך כבויה' : 'המצלמה כבויה — ניתן לשמוע'}
      </span>
    </div>
  );
}

/** The video stage — must live INSIDE <LiveKitRoom> for the hooks to resolve. */
function CallStage({ clientName }: { clientName?: string }) {
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false },
  );
  // "Joined" is a connected participant, NOT a published video track —
  // someone who turned their camera off must not look like a no-show.
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();

  const remoteVideo = tracks.filter((t) => t.participant && !t.participant.isLocal);
  const remoteNoVideo = remoteParticipants.filter(
    (p) => !remoteVideo.some((t) => t.participant.identity === p.identity)
  );
  const localVideoTracks = tracks.filter((t) => t.participant?.isLocal);

  const displayName = (p: { name?: string; identity: string }) => p.name || '';

  // WhatsApp-style layout: one MAIN tile + small floating tiles (PiP).
  // `mainKey` is user-pinned; default = first remote (you see the other person big).
  const [mainKey, setMainKey] = useState<string | null>(null);
  const [showSwapHint, setShowSwapHint] = useState(false);

  const localKey = `local-${localParticipant.identity}`;
  const localEntry = localVideoTracks.length > 0
    ? {
        key: localKey,
        node: (
          <ParticipantTile
            trackRef={localVideoTracks[0]}
            className="lk-tile lk-tile-local"
          />
        )
      }
    : {
        key: localKey,
        node: <NoVideoTile isLocal name={displayName(localParticipant)} />
      };

  const tileEntries = [
    ...remoteVideo.map((trackRef) => ({
      key: `r-${trackRef.participant.identity}`,
      node: <ParticipantTile trackRef={trackRef} className="lk-tile" />
    })),
    ...remoteNoVideo.map((p) => ({
      key: `rn-${p.identity}`,
      node: <NoVideoTile name={displayName(p)} />
    })),
    localEntry
  ];

  const autoMainKey = tileEntries.length > 1 && tileEntries[0].key !== localKey
    ? tileEntries[0].key
    : localKey;
  const effectiveMainKey = tileEntries.some((t) => t.key === mainKey)
    ? (mainKey as string)
    : autoMainKey;
  const pipEntries = tileEntries.filter((t) => t.key !== effectiveMainKey);
  const hasPeer = pipEntries.length > 0;

  // Brief onboarding hint once a peer is on stage
  useEffect(() => {
    if (!hasPeer) return;
    setShowSwapHint(true);
    const t = setTimeout(() => setShowSwapHint(false), 5000);
    return () => clearTimeout(t);
  }, [hasPeer]);

  // Tap any tile: if it's the main one → the OTHER side becomes main;
  // if it's a small one → IT becomes main. Feels exactly like WhatsApp.
  const handleTileClick = (key: string) => {
    if (key === effectiveMainKey) {
      setMainKey(pipEntries[0]?.key ?? effectiveMainKey);
    } else {
      setMainKey(key);
    }
  };

  const mainEntry = tileEntries.find((t) => t.key === effectiveMainKey) ?? localEntry;
  const remoteTiles = remoteVideo.length + remoteNoVideo.length;

  return (
    <div className="lk-stage">
      <div
        className="lk-cell lk-cell-main"
        onClick={() => handleTileClick(effectiveMainKey)}
        title="הקש/י כדי להחליף תצוגה"
        role="button"
        aria-label="החלפת תצוגה ראשית"
      >
        {mainEntry.node}
        {showSwapHint && (
          <span className="lk-swap-hint">👆 הקש/י על מסך כדי להחליף תצוגה</span>
        )}
      </div>
      {pipEntries.map((entry, idx) => (
        <div
          key={entry.key}
          className="lk-cell lk-cell-pip"
          style={{ insetInlineEnd: 18 + idx * 124 }}
          onClick={() => handleTileClick(entry.key)}
          title="הקש/י כדי להגדיל"
          role="button"
          aria-label="הצגה במסך המלא"
        >
          {entry.node}
        </div>
      ))}
      {remoteTiles === 0 && (
        <div className="lk-waiting" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          color: 'rgba(244, 249, 248, 0.75)',
          fontSize: '1.05rem',
          background: 'rgba(13, 148, 136, 0.06)'
        }}>
          <Loader2 size={26} className="animate-spin" color="#2dd4bf" />
          <span>{clientName ? `${clientName} עוד לא הצטרף/ה לשיחה…` : 'ממתין לצד השני…'}</span>
        </div>
      )}
    </div>
  );
}

export default function LiveKitCallView({ session, role, title, subtitle, onExited }: LiveKitCallViewProps) {
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const endPosted = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useScreenWakeLock(connected);

  /**
   * The call record is closed by the HOST side (per the module's data contract):
   * onDisconnected fires for the local participant only.
   */
  const postEndRecord = useCallback(async () => {
    if (endPosted.current || role !== 'host') return;
    endPosted.current = true;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('wisecare_token') || '' : '';
      await fetch(`/api/livekit/calls/${session.callId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ durationSec: elapsed })
      });
    } catch {
      // The record also self-heals: a stale 'active' call is closed when a new one starts
    }
  }, [role, session.callId, elapsed]);

  const handleDisconnected = useCallback(() => {
    setConnected(false);
    setEnded(true);
    void postEndRecord();
    onExited?.();
  }, [postEndRecord, onExited]);

  if (ended) {
    return (
      <div className="lk-ended" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: '#e8f5f3',
        padding: '40px',
        textAlign: 'center'
      }}>
        <PhoneOff size={40} color="#f87171" />
        <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>השיחה הסתיימה</div>
        <div style={{ color: 'rgba(244,249,248,0.7)', fontSize: '0.95rem' }}>
          משך השיחה: {formatDuration(elapsed)}
        </div>
      </div>
    );
  }

  return (
    <div className="lk-call-view" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: '#05302c',
      borderRadius: '14px',
      overflow: 'hidden',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div className="lk-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '12px 18px',
        background: 'rgba(4, 38, 35, 0.85)',
        borderBottom: '1px solid rgba(13, 148, 136, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span className="lk-live-dot" style={{
            width: 9, height: 9, borderRadius: '50%',
            background: connected ? '#f87171' : 'rgba(255,255,255,0.3)',
            boxShadow: connected ? '0 0 8px rgba(248,113,113,0.8)' : 'none',
            flexShrink: 0
          }} />
          <div style={{ minWidth: 0 }}>
            <div className="lk-title" style={{ color: '#e8f5f3', fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {subtitle && <div className="lk-subtitle" style={{ color: 'rgba(244,249,248,0.65)', fontSize: '0.82rem' }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span style={{ color: '#2dd4bf', fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.05em' }}>
            {formatDuration(elapsed)}
          </span>
          <span title="שיחה מוצפנת ופרטית" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'rgba(244,249,248,0.55)', fontSize: '0.78rem' }}>
            <ShieldCheck size={14} />
          </span>
        </div>
      </div>

      {/* Room */}
      <LiveKitRoom
        token={session.token}
        serverUrl={session.serverUrl}
        connect={true}
        audio={true}
        video={true}
        onConnected={() => setConnected(true)}
        onDisconnected={handleDisconnected}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        {/* Plays every REMOTE participant's mic/screen-share audio.
            ParticipantTile renders video only — without this, calls are silent. */}
        <RoomAudioRenderer />
        {/* Keeps audio alive when the user minimizes the call / switches apps */}
        <BackgroundAudioKeeper />
        {!connected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'rgba(244,249,248,0.8)' }}>
            <Loader2 size={30} className="animate-spin" color="#2dd4bf" />
            <span>מתחבר לשיחה…</span>
          </div>
        ) : (
          <CallStage clientName={subtitle} />
        )}

        {/* Control bar */}
        {connected && (
          <div className="lk-controls" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            padding: '14px',
            background: 'rgba(4, 38, 35, 0.85)',
            borderTop: '1px solid rgba(13, 148, 136, 0.25)'
          }}>
            <TrackToggle source={Track.Source.Microphone} showIcon={false} className="lk-ctrl">
              <Mic size={19} className="lk-icon-on" />
              <MicOff size={19} className="lk-icon-off" />
              <span>השתק</span>
            </TrackToggle>
            <TrackToggle source={Track.Source.Camera} showIcon={false} className="lk-ctrl">
              <VideoIcon size={19} className="lk-icon-on" />
              <VideoOff size={19} className="lk-icon-off" />
              <span>מצלמה</span>
            </TrackToggle>
            <FlipCameraButton />
            <DisconnectButton className="lk-ctrl lk-ctrl-end">
              <PhoneOff size={19} />
              <span>{role === 'host' ? 'סיום שיחה' : 'יציאה מהשיחה'}</span>
            </DisconnectButton>
          </div>
        )}
      </LiveKitRoom>

      <style>{`
        .lk-call-view .lk-tile { background: #0a2e2a; border-radius: 10px; overflow: hidden; border: 1px solid rgba(13,148,136,0.2); }
        /* Stage layout lives in CSS (not inline) so mobile media queries can override it */
        .lk-call-view .lk-stage {
          position: relative; flex: 1; min-height: 0;
          display: block; padding: 12px;
        }
        .lk-call-view .lk-tile-novideo {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; padding: 16px; text-align: center;
          color: rgba(244, 249, 248, 0.85);
        }
        .lk-call-view .lk-novideo-avatar {
          width: 64px; height: 64px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(13, 148, 136, 0.18); border: 1.5px solid rgba(45, 212, 191, 0.5);
          color: #2dd4bf; font-size: 1.5rem; font-weight: 700;
        }
        .lk-call-view .lk-novideo-name { font-weight: 600; font-size: 1rem; }
        .lk-call-view .lk-novideo-hint {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(244, 249, 248, 0.55); font-size: 0.82rem;
        }

        /* ===== WhatsApp-style stage: one MAIN tile + floating PiP tiles ===== */
        .lk-call-view .lk-cell {
          position: absolute; border-radius: 12px; overflow: hidden;
          background: #0a2e2a; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
          transition: inset 0.25s ease, width 0.25s ease, height 0.25s ease, top 0.25s ease;
        }
        .lk-call-view .lk-cell-main {
          inset: 12px; width: auto; height: auto; z-index: 1;
          border: 1px solid rgba(13,148,136,0.2);
        }
        .lk-call-view .lk-cell-pip {
          top: 18px; width: 112px; height: 152px; z-index: 3;
          border: 2px solid rgba(45, 212, 191, 0.65);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
        }
        .lk-call-view .lk-cell .lk-tile,
        .lk-call-view .lk-cell .lk-tile-novideo {
          width: 100%; height: 100%; border: none; border-radius: 0;
        }
        /* Compact rendering for a camera-off participant shown as PiP */
        .lk-call-view .lk-cell-pip .lk-novideo-avatar { width: 40px; height: 40px; font-size: 1.05rem; }
        .lk-call-view .lk-cell-pip .lk-novideo-name,
        .lk-call-view .lk-cell-pip .lk-novideo-hint { display: none; }
        .lk-call-view .lk-swap-hint {
          position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
          background: rgba(4, 38, 35, 0.85); color: #e8f5f3;
          padding: 7px 14px; border-radius: 999px; font-size: 0.82rem; font-weight: 500;
          border: 1px solid rgba(13,148,136,0.4); white-space: nowrap;
          pointer-events: none; animation: lkHintIn 0.3s ease;
        }
        @keyframes lkHintIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        /* Waiting notice: centered overlay above the (self-view) main tile */
        .lk-call-view .lk-waiting {
          position: absolute; inset: 12px; z-index: 2; border: 1.5px dashed rgba(13,148,136,0.45);
        }

        .lk-call-view .lk-ctrl {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 100px; border: 1px solid rgba(13,148,136,0.4);
          background: rgba(13,148,136,0.12); color: #e8f5f3; font-size: 0.92rem; font-weight: 500;
          cursor: pointer; transition: background 0.15s ease;
        }
        .lk-call-view .lk-ctrl:hover { background: rgba(13,148,136,0.25); }
        .lk-call-view .lk-ctrl[aria-pressed="false"] .lk-icon-on { display: none; }
        .lk-call-view .lk-ctrl[aria-pressed="true"] .lk-icon-off { display: none; }
        .lk-call-view .lk-ctrl[aria-pressed="false"] { background: rgba(255,255,255,0.92); color: #053f3b; }
        .lk-call-view .lk-ctrl[aria-pressed="false"]:hover { background: #ffffff; }
        .lk-call-view .lk-ctrl:disabled { opacity: 0.6; cursor: wait; }
        .lk-call-view .lk-ctrl-end { background: #dc2626; border-color: #ef4444; color: #ffffff; }
        .lk-call-view .lk-ctrl-end:hover { background: #b91c1c; }

        /* ===== Mobile: tighter chrome, smaller PiP ===== */
        @media (max-width: 760px) {
          .lk-call-view .lk-header { padding: 10px 14px; gap: 8px; }
          .lk-call-view .lk-title { font-size: 0.92rem; }
          .lk-call-view .lk-subtitle { display: none; }
          .lk-call-view .lk-stage { padding: 10px; }
          .lk-call-view .lk-cell-main { inset: 10px; }
          .lk-call-view .lk-cell-pip { top: 14px; width: 100px; height: 138px; }
          .lk-call-view .lk-waiting { inset: 10px; border-radius: 10px; }
          .lk-call-view .lk-novideo-avatar { width: 56px; height: 56px; font-size: 1.3rem; }
          .lk-call-view .lk-novideo-name { font-size: 0.9rem; }
          .lk-call-view .lk-swap-hint { font-size: 0.76rem; bottom: 10px; padding: 6px 12px; }
        }

        /* ===== Small phones: thumb-sized round controls, safe-area aware ===== */
        @media (max-width: 520px) {
          .lk-call-view .lk-controls {
            gap: 12px; padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
          }
          .lk-call-view .lk-ctrl {
            width: 52px; height: 52px; padding: 0; gap: 0;
            justify-content: center; border-radius: 50%;
          }
          .lk-call-view .lk-ctrl span { display: none; }
          .lk-call-view .lk-ctrl svg { width: 22px; height: 22px; }
          .lk-call-view .lk-header .lk-title { font-size: 0.88rem; }
        }
      `}</style>
    </div>
  );
}
