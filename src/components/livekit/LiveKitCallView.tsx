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
  useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Loader2, ShieldCheck, User } from 'lucide-react';

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
  const remoteTiles = remoteVideo.length + remoteNoVideo.length;

  const displayName = (p: { name?: string; identity: string }) => p.name || '';

  return (
    <div className={`lk-stage${remoteTiles > 1 ? ' lk-stage-2' : ''}`}>
      {remoteVideo.map((trackRef) => (
        <ParticipantTile key={trackRef.participant.identity} trackRef={trackRef} className="lk-tile" />
      ))}
      {remoteNoVideo.map((p) => (
        <NoVideoTile key={`novideo-${p.identity}`} name={displayName(p)} />
      ))}
      {/* Always render the local tile so the caller sees themselves even before the peer joins */}
      {localVideoTracks.map((trackRef) => (
        <ParticipantTile key={`local-${trackRef.participant.identity}`} trackRef={trackRef} className="lk-tile lk-tile-local" />
      ))}
      {localVideoTracks.length === 0 && (
        <NoVideoTile isLocal name={displayName(localParticipant)} />
      )}
      {remoteTiles === 0 && (
        <div className="lk-waiting" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          color: 'rgba(244, 249, 248, 0.75)',
          fontSize: '1.05rem',
          border: '1.5px dashed rgba(13, 148, 136, 0.45)',
          borderRadius: '14px',
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
            <DisconnectButton className="lk-ctrl lk-ctrl-end">
              <PhoneOff size={19} />
              <span>{role === 'host' ? 'סיום שיחה' : 'יציאה מהשיחה'}</span>
            </DisconnectButton>
          </div>
        )}
      </LiveKitRoom>

      <style>{`
        .lk-call-view .lk-tile { background: #0a2e2a; border-radius: 10px; overflow: hidden; border: 1px solid rgba(13,148,136,0.2); }
        .lk-call-view .lk-tile-local { max-height: 100%; }
        /* Stage layout lives in CSS (not inline) so mobile media queries can override it */
        .lk-call-view .lk-stage {
          flex: 1; min-height: 0;
          display: grid; grid-template-columns: 1fr;
          gap: 10px; padding: 14px;
        }
        .lk-call-view .lk-stage-2 { grid-template-columns: 1fr 1fr; }
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
        @media (max-width: 760px) {
          .lk-call-view .lk-novideo-avatar { width: 56px; height: 56px; font-size: 1.3rem; }
          .lk-call-view .lk-novideo-name { font-size: 0.9rem; }
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
        .lk-call-view .lk-ctrl-end { background: #dc2626; border-color: #ef4444; color: #ffffff; }
        .lk-call-view .lk-ctrl-end:hover { background: #b91c1c; }

        /* ===== Mobile: familiar video-call layout (fill + floating self-view) ===== */
        @media (max-width: 760px) {
          .lk-call-view .lk-header { padding: 10px 14px; gap: 8px; }
          .lk-call-view .lk-title { font-size: 0.92rem; }
          .lk-call-view .lk-subtitle { display: none; }

          .lk-call-view .lk-stage { position: relative; display: block; padding: 10px; }
          /* !important: ParticipantTile applies its own INLINE position:relative,
             which would otherwise beat these stylesheet rules */
          .lk-call-view .lk-tile:not(.lk-tile-local) {
            position: absolute !important; inset: 10px !important;
            width: calc(100% - 20px) !important; height: calc(100% - 20px) !important; z-index: 1;
          }
          /* Waiting notice becomes a centered overlay instead of a row below */
          .lk-call-view .lk-waiting {
            position: absolute; inset: 0; z-index: 2; border: none; background: rgba(5, 48, 44, 0.25);
          }
          /* Self-view fills the stage while alone… */
          .lk-call-view .lk-tile-local {
            position: absolute !important; inset: 10px !important;
            width: calc(100% - 20px) !important; height: calc(100% - 20px) !important; z-index: 2;
          }
          /* …and shrinks to a floating PiP once the peer's video arrives */
          .lk-call-view .lk-stage:has(.lk-tile:not(.lk-tile-local)) .lk-tile-local {
            top: auto !important; right: auto !important;
            bottom: 20px !important; left: 20px !important;
            width: 104px !important; height: 148px !important; z-index: 3;
            border: 2px solid rgba(45, 212, 191, 0.65); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
          }
        }

        /* ===== Small phones: thumb-sized round controls, safe-area aware ===== */
        @media (max-width: 520px) {
          .lk-call-view .lk-controls {
            gap: 14px; padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
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
