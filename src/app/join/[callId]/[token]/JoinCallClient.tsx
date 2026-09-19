"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Leaf, LinkIcon } from 'lucide-react';
import LiveKitCallView, { ActiveCallSession } from '@/components/livekit/LiveKitCallView';

/**
 * Standalone secure join page for a single video call: /join/{callId}/{token}.
 * The one-time link (sent via WhatsApp or copied by the therapist) is the
 * credential — no portal or login required, and it dies when the call ends.
 */
export default function JoinCallClient({ callId, token }: { callId: string; token: string }) {
  const [phase, setPhase] = useState<'checking' | 'in-call' | 'invalid' | 'ended' | 'unavailable'>('checking');
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

  useEffect(() => {
    tryJoin();
  }, [tryJoin]);

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
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
        padding: '16px 24px',
        borderBottom: '1px solid rgba(13, 148, 136, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, letterSpacing: '0.02em' }}>
          <span style={{
            width: 34, height: 34, borderRadius: '10px', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)'
          }}>
            <Leaf size={18} color="#2dd4bf" />
          </span>
          WiseCare · שיחת וידאו
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '18px' }}>
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
            alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center', padding: '30px'
          }}>
            {phase === 'checking' && (
              <>
                <Loader2 size={36} className="animate-spin" color="#2dd4bf" />
                <div style={{ fontSize: '1.1rem' }}>מתחבר/ת לשיחה…</div>
              </>
            )}
            {phase === 'invalid' && (
              <>
                <span style={{
                  width: 74, height: 74, borderRadius: '50%', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(13, 148, 136, 0.12)', border: '1.5px dashed rgba(45, 212, 191, 0.5)'
                }}>
                  <LinkIcon size={30} color="#2dd4bf" />
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
                  background: 'rgba(13, 148, 136, 0.25)', color: '#e8f5f3',
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
