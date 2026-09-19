"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  ParticipantTile,
  TrackToggle,
  DisconnectButton,
  useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Loader2, ShieldCheck } from 'lucide-react';

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

/** The video stage — must live INSIDE <LiveKitRoom> for the hooks to resolve. */
function CallStage({ clientName }: { clientName?: string }) {
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false },
  );

  const visible = tracks.filter((t) => t.participant && !t.participant.isLocal);

  return (
    <div className="lk-stage" style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: visible.length > 1 ? '1fr 1fr' : '1fr',
      gap: '10px',
      padding: '14px',
      minHeight: 0
    }}>
      {visible.map((trackRef) => (
        <ParticipantTile key={trackRef.participant.identity} trackRef={trackRef} className="lk-tile" />
      ))}
      {/* Always render the local tile so the caller sees themselves even before the peer joins */}
      {tracks
        .filter((t) => t.participant?.isLocal)
        .map((trackRef) => (
          <ParticipantTile key={`local-${trackRef.participant.identity}`} trackRef={trackRef} className="lk-tile lk-tile-local" />
        ))}
      {visible.length === 0 && (
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
            <div style={{ color: '#e8f5f3', fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {subtitle && <div style={{ color: 'rgba(244,249,248,0.65)', fontSize: '0.82rem' }}>{subtitle}</div>}
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
      `}</style>
    </div>
  );
}
