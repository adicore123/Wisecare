"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Video, RefreshCw, ArrowRight, Leaf } from 'lucide-react';
import LiveKitCallView, { ActiveCallSession } from '@/components/livekit/LiveKitCallView';

/**
 * Standalone client-side join page (mirrors the personal-space pattern):
 * the unguessable portalCode is the credential. The page only issues a
 * participant token while the therapist has an ACTIVE call open.
 */
export default function VideoCallJoinPage() {
  const params = useParams<{ portalCode: string }>();
  const portalCode = params?.portalCode || '';

  const [phase, setPhase] = useState<'checking' | 'waiting' | 'unavailable' | 'in-call' | 'ended'>('checking');
  const [session, setSession] = useState<(ActiveCallSession & { therapistName?: string }) | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const tryJoin = useCallback(async () => {
    if (!portalCode) return;
    setPhase('checking');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/livekit/portal/${portalCode}/token`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSession({ callId: data.callId, token: data.token, serverUrl: data.url, therapistName: data.therapistName });
        setPhase('in-call');
      } else if (res.status === 404) {
        setPhase('waiting');
      } else {
        setErrorMsg(data.error || 'שגיאה בהצטרפות לשיחה');
        setPhase('unavailable');
      }
    } catch {
      setErrorMsg('שגיאת רשת — נסו לרענן את הדף');
      setPhase('unavailable');
    }
  }, [portalCode]);

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
      {/* Minimal branded header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        <a href={`/portal/${portalCode}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'rgba(232, 245, 243, 0.8)', fontSize: '0.9rem', textDecoration: 'none'
        }}>
          חזרה למרחב האישי <ArrowRight size={15} />
        </a>
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
                <div style={{ fontSize: '1.1rem' }}>בודק אם קיימת שיחה פעילה…</div>
              </>
            )}
            {phase === 'waiting' && (
              <>
                <span style={{
                  width: 74, height: 74, borderRadius: '50%', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(13, 148, 136, 0.12)', border: '1.5px dashed rgba(45, 212, 191, 0.5)'
                }}>
                  <Video size={30} color="#2dd4bf" />
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>אין שיחת וידאו פעילה כרגע</div>
                <div style={{ color: 'rgba(232,245,243,0.7)', maxWidth: '440px', lineHeight: 1.7 }}>
                  כאשר המטפל/ת שלך יתחיל/ה שיחה — היא תופיע כאן אוטומטית.
                  אפשר גם ללחוץ על כפתור הרענון, או לחכות לקישור בוואטסאפ.
                </div>
                <button type="button" onClick={tryJoin} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '11px 24px', borderRadius: '100px', cursor: 'pointer',
                  background: 'rgba(13, 148, 136, 0.25)', color: '#e8f5f3',
                  border: '1px solid rgba(45, 212, 191, 0.5)', fontSize: '0.95rem', fontWeight: 500
                }}>
                  <RefreshCw size={16} /> בדיקה מחדש
                </button>
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
                  <RefreshCw size={15} /> נסו שוב
                </button>
              </>
            )}
            {phase === 'ended' && (
              <>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>השיחה הסתיימה. תודה!</div>
                <a href={`/portal/${portalCode}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '11px 24px', borderRadius: '100px', textDecoration: 'none',
                  background: 'rgba(13, 148, 136, 0.25)', color: '#e8f5f3',
                  border: '1px solid rgba(45, 212, 191, 0.5)'
                }}>
                  חזרה למרחב האישי <ArrowRight size={15} />
                </a>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
