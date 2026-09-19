"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, MonitorPlay, ExternalLink, ArrowRight } from 'lucide-react';

declare global {
  interface Window {
    ZoomMtg?: any;
  }
}

const SDK_SCRIPT = 'https://source.zoom.us/3.13.0/ZoomMtg.min.js';

export default function JoinMeetingPage() {
  const params = useParams();
  const appointmentId = String(params?.appointmentId || '');
  const [state, setState] = useState<'loading' | 'ready' | 'joining' | 'in-meeting' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [externalJoinUrl, setExternalJoinUrl] = useState('');
  const [backHref, setBackHref] = useState('/login');

  const loadSdk = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.ZoomMtg) return resolve();
      const script = document.createElement('script');
      script.src = SDK_SCRIPT;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('טעינת רכיב הזום נכשלה — בדוק חיבור לאינטרנט'));
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    if (!appointmentId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('wisecare_token') : null;
    const portalToken = typeof window !== 'undefined' ? localStorage.getItem('wisecare_portal_token') : null;
    if (!token && !portalToken) {
      setState('error');
      setErrorMsg('נדרשת התחברות למערכת כדי להצטרף לפגישה');
      return;
    }
    setBackHref(portalToken && !token ? '/' : '/crm');

    let cancelled = false;

    (async () => {
      try {
        await loadSdk();
        if (cancelled) return;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        else if (portalToken) headers.Authorization = `Bearer ${portalToken}`;

        const res = await fetch('/api/zoom/signature', {
          method: 'POST',
          headers,
          body: JSON.stringify({ appointmentId })
        });
        const sig = await res.json();
        if (!res.ok) throw new Error(sig.error || 'שגיאה בהצטרפות לפגישה');

        // fetch join url for the external fallback
        if (token) {
          fetch(`/api/appointments/${appointmentId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(apt => { if (apt?.joinUrl) setExternalJoinUrl(apt.joinUrl); })
            .catch(() => {});
        }

        if (cancelled) return;
        setState('joining');

        const Z = window.ZoomMtg;
        Z.setZoomJSLib('https://source.zoom.us/3.13.0/lib', '/av');
        Z.preLoadWasm();
        Z.prepareJssdk();

        Z.init({
          leaveUrl: portalToken && !token ? '/' : (typeof window !== 'undefined' ? document.referrer || '/' : '/'),
          success: () => {
            Z.join({
              sdkKey: sig.sdkKey,
              signature: sig.signature,
              meetingNumber: sig.meetingNumber,
              passWord: sig.passcode || '',
              userName: sig.userName || (sig.role === 1 ? 'מטפל/ת' : 'מטופל/ת'),
              success: () => {
                if (!cancelled) setState('in-meeting');
              },
              error: (err: any) => {
                console.error('[ZoomSDK] join error:', err);
                if (cancelled) return;
                setState('error');
                setErrorMsg(
                  err?.errorCode === 3718
                    ? 'טרם ניתן להצטרף — המארח/ת עדיין לא פתח/ה את הפגישה. נסה שוב בקרוב.'
                    : `הצטרפות לפגישה נכשלה (קוד ${err?.errorCode || '?'}). נסה את הקישור החיצוני למטה.`
                );
              }
            });
          },
          error: (err: any) => {
            console.error('[ZoomSDK] init error:', err);
            if (!cancelled) {
              setState('error');
              setErrorMsg('אתחול רכיב הזום נכשל. נסה את הקישור החיצוני למטה.');
            }
          }
        });
      } catch (err: any) {
        if (!cancelled) {
          setState('error');
          setErrorMsg(err.message || 'שגיאה בהצטרפות');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [appointmentId, loadSdk]);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', direction: 'rtl' }}>
      {/* Required mount point for the Zoom Meeting SDK */}
      <div id="zmmtg-root" style={state === 'in-meeting' ? { position: 'fixed', inset: 0, zIndex: 9999 } : { display: 'none' }} />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '26px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <MonitorPlay size={26} color="#818cf8" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>חדר הפגישה</h1>
        </div>

        {(state === 'loading' || state === 'joining') && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1e293b', borderRadius: '16px' }}>
            <Loader2 size={44} className="animate-spin" color="#818cf8" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              {state === 'loading' ? 'מכין את חדר הפגישה...' : 'מתחבר לפגישת הזום...'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px' }}>
              ייתכן שהדפדפן יבקש הרשאה למצלמה ולמיקרופון — אשר/י כדי להיכנס.
            </div>
          </div>
        )}

        {state === 'in-meeting' && (
          <div id="zmmtg-root-wrap" style={{ background: '#1e293b', borderRadius: '16px', padding: '6px', minHeight: '480px' }}>
            {/* The Zoom SDK renders its UI into #zmmtg-root (auto-appended to body) */}
            <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
              הפגישה פעילה בחלון זה 🎥 — בסיום לחץ/י "עזוב" כדי לחזור למערכת
            </div>
          </div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center', padding: '46px 20px', background: '#1e293b', borderRadius: '16px' }}>
            <AlertCircleIcon />
            <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '12px', color: '#fca5a5' }}>{errorMsg}</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '18px', flexWrap: 'wrap' }}>
              {externalJoinUrl && (
                <a href={externalJoinUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ExternalLink size={15} />
                  <span>פתח באפליקציית זום</span>
                </a>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
                נסה שוב
              </button>
              <a href={backHref} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowRight size={15} />
                <span>חזרה</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCircleIcon() {
  return <div style={{ fontSize: '2.4rem' }}>⚠️</div>;
}
