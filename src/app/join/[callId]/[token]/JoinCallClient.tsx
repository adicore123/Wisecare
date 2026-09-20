"use client";

import React, { useCallback, useState } from 'react';
import { Loader2, Leaf, LinkIcon, Video, ShieldCheck } from 'lucide-react';
import LiveKitCallView, { ActiveCallSession } from '@/components/livekit/LiveKitCallView';

/**
 * Standalone secure join page for a single video call: /join/{callId}/{token}.
 * The one-time link (sent via WhatsApp or copied by the therapist) is the
 * credential — no portal or login required, and it dies when the call ends.
 * Joining is button-gated (never automatic): iOS/Safari require a user gesture
 * before granting camera/mic and starting audio playback.
 */
export default function JoinCallClient({ callId, token }: { callId: string; token: string }) {
  const [phase, setPhase] = useState<'idle' | 'checking' | 'in-call' | 'invalid' | 'ended' | 'unavailable'>('idle');
  const [session, setSession] = useState<(ActiveCallSession & { therapistName?: string }) | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const tryJoin = useCallback(async () => {
    setPhase('checking');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/livekit/join/${encodeURIComponent(callId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (res.ok) {
        setSession({ callId: data.callId, token: data.token, serverUrl: data.url, therapistName: data.therapistName });
        setPhase('in-call');
      } else if (res.status === 410) {
        setPhase('ended');
      } else if (res.status === 403 || res.status === 404) {
        setPhase('invalid');
      } else {
        setErrorMsg(data.error || 'שגיאה בהצטרפות לשיחה');
        setPhase('unavailable');
      }
    } catch {
      setErrorMsg('שגיאת רשת — נסו לרענן את הדף');
      setPhase('unavailable');
    }
  }, [callId, token]);

  return (
    <div dir="rtl" style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #04302c 0%, #053f3b 55%, #064a44 100%)',
      color: '#e8f5f3',
      fontFamily: 'var(--font-body, Assistant, system-ui, sans-serif)'
    }}>
      {/* Minimal branded header — deliberately no portal link: this page is
          portal-independent by design */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        padding: 'clamp(10px, 2vw, 16px) clamp(14px, 3vw, 24px)',
        borderBottom: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, letterSpacing: '0.02em' }}>
          <span style={{
            width: 34, height: 34, borderRadius: '10px', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'color-mix(in srgb, var(--primary) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)'
          }}>
            <Leaf size={18} color="color-mix(in srgb, var(--primary) 65%, white)" />
          </span>
          WiseCare · שיחת וידאו
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 'clamp(8px, 2vw, 18px)' }}>
        {phase === 'in-call' && session ? (
          <LiveKitCallView
            session={session}
            role="participant"
            title={`שיחת וידאו${session.therapistName ? ` עם ${session.therapistName}` : ''}`}
            subtitle={session.therapistName}
            onExited={() => setPhase('ended')}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center', padding: '24px 16px'
          }}>
            {phase === 'idle' && (
              <>
                <span style={{
                  width: 88, height: 88, borderRadius: '50%', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)', border: '1.5px solid rgba(45, 212, 191, 0.5)'
                }}>
                  <Video size={36} color="color-mix(in srgb, var(--primary) 65%, white)" />
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>מוזמנ/ת להצטרף לשיחת וידאו</div>
                <div style={{ color: 'rgba(232,245,243,0.7)', maxWidth: '420px', lineHeight: 1.7 }}>
                  כשתהיו מוכנים/ות — לחצו על הכפתור ותועברו ישר לשיחה.
                  בכניסה הדפדפן יבקש לאפשר מצלמה ומיקרופון (מומלץ לאשר את שניהם).
                </div>
                <button type="button" onClick={tryJoin} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  minHeight: 56, padding: '14px 40px', borderRadius: '100px', cursor: 'pointer',
                  background: 'var(--primary)', color: '#ffffff', border: 'none',
                  fontSize: '1.08rem', fontWeight: 700,
                  boxShadow: '0 10px 28px color-mix(in srgb, var(--primary) 35%, transparent)'
                }}>
                  <Video size={22} />
                  הצטרפ/י לשיחה
                </button>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(232,245,243,0.5)', fontSize: '0.8rem' }}>
                  <ShieldCheck size={14} /> שיחה מוצפנת ופרטית
                </div>
              </>
            )}
            {phase === 'checking' && (
              <>
                <Loader2 size={36} className="animate-spin" color="color-mix(in srgb, var(--primary) 65%, white)" />
                <div style={{ fontSize: '1.1rem' }}>מתחבר/ת לשיחה…</div>
              </>
            )}
            {phase === 'invalid' && (
              <>
                <span style={{
                  width: 74, height: 74, borderRadius: '50%', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)', border: '1.5px dashed rgba(45, 212, 191, 0.5)'
                }}>
                  <LinkIcon size={30} color="color-mix(in srgb, var(--primary) 65%, white)" />
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>הקישור אינו תקף או שפג תוקפו</div>
                <div style={{ color: 'rgba(232,245,243,0.7)', maxWidth: '440px', lineHeight: 1.7 }}>
                  ייתכן שהשיחה נפתחה מחדש ונשלח קישור חדש, או שהקישור הוקלד בחלקו.
                  בקשו/י מהמטפל/ת קישור הצטרפות עדכני.
                </div>
              </>
            )}
            {phase === 'ended' && (
              <>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>השיחה הסתיימה. תודה!</div>
                <div style={{ color: 'rgba(232,245,243,0.7)', maxWidth: '440px', lineHeight: 1.7 }}>
                  אפשר לסגור את הדף.
                </div>
              </>
            )}
            {phase === 'unavailable' && (
              <>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>לא ניתן להצטרף כרגע</div>
                <div style={{ color: 'rgba(232,245,243,0.7)', maxWidth: '440px', lineHeight: 1.7 }}>{errorMsg}</div>
                <button type="button" onClick={tryJoin} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 22px', borderRadius: '100px', cursor: 'pointer',
                  background: 'color-mix(in srgb, var(--primary) 25%, transparent)', color: '#e8f5f3',
                  border: '1px solid rgba(45, 212, 191, 0.5)'
                }}>
                  נסו שוב
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
