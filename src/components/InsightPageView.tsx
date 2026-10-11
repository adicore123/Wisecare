'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Smile,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  Loader2,
  Ban,
  CheckCircle2,
  Sparkles,
  Flame,
  Lock,
  Link2,
  HeartHandshake
} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';

export interface InsightViewData {
  title: string;
  content: string;
  mood: string;
  intensity: number;
}

// Same default titles the portal journal hides in the mobile cards
const DEFAULT_INSIGHT_TITLES = ['תובנה אישית', 'תובנה שבועית'];

function intensityVisual(intensity: number) {
  if (intensity > 7) return { gradient: 'linear-gradient(135deg, #fb923c 0%, #ef4444 100%)' };
  if (intensity > 4) return { gradient: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' };
  return { gradient: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)' };
}

/**
 * Standalone landing-style view of a single journal insight, shared by the
 * private view page (/insight-view/[id], owner-only) and the public share page
 * (/insight/[id]/[token], link-token protected). Shows the insight itself —
 * no dates, no names — so a forwarded link never exposes identity.
 * Visuals: aurora background tinted by the client's personal palette, glass
 * cards (ipv-* styles in globals.css), staggered entrance motion.
 */
export default function InsightPageView({
  insight,
  variant,
  isOwner = false,
  insightId
}: {
  insight: InsightViewData | null;
  variant: 'view' | 'public';
  isOwner?: boolean;
  insightId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [revokeError, setRevokeError] = useState(false);
  const [meterOn, setMeterOn] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    setShareUrl(window.location.href);
    const t = setTimeout(() => setMeterOn(true), 350);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: 'תובנה אישית', text: 'שיתוף תובנה אישית', url: window.location.href });
    } catch {
      // user dismissed the share sheet
    }
  };

  const handleRevoke = async () => {
    if (!insightId || revoking) return;
    setRevoking(true);
    setRevokeError(false);
    try {
      const res = await fetch(`/api/insight/${encodeURIComponent(insightId)}/revoke`, { method: 'POST' });
      if (!res.ok) throw new Error();
      setRevoked(true);
    } catch {
      setRevokeError(true);
    } finally {
      setRevoking(false);
    }
  };

  // Shared chrome: aurora background, brand pill, footer — every state gets
  // the same landing-page frame so the flow feels like one continuous space.
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="ipv-shell" dir="rtl">
      <div className="ipv-bg" aria-hidden="true">
        <div className="ipv-orb ipv-orb-a" />
        <div className="ipv-orb ipv-orb-b" />
        <div className="ipv-orb ipv-orb-c" />
        <div className="ipv-noise" />
      </div>
      <div className="ipv-main">
        <header className="ipv-topbar ipv-rise">
          <div className="ipv-brand">
            <span className="ipv-brand-mark">
              <HeartHandshake size={19} />
            </span>
            <span className="ipv-brand-name">WiseCare</span>
          </div>
          <span className="ipv-top-tag">
            <Lock size={13} />
            {variant === 'view' ? 'תצוגה פרטית' : 'קישור מאובטח'}
          </span>
        </header>
        {children}
        <footer className="ipv-footer ipv-rise" style={{ animationDelay: '0.4s' }}>
          <ShieldCheck size={13} />
          <span>
            {variant === 'view' ? 'תצוגה פרטית מתוך המרחב האישי' : 'קישור אישי ומאובטח'} · WiseCare
          </span>
        </footer>
      </div>
    </div>
  );

  // ---- Missing insight: broken share link / deleted entry ----
  if (!insight) {
    return (
      <Shell>
        <section className="ipv-card ipv-state-card ipv-rise" style={{ animationDelay: '0.08s' }}>
          <div className="ipv-state-icon is-muted">
            <Link2 size={30} />
          </div>
          <h1 className="ipv-state-title">
            {variant === 'view' ? 'התובנה אינה זמינה' : 'הקישור אינו תקין או שפג תוקפו'}
          </h1>
          <p className="ipv-state-text">
            {variant === 'view'
              ? 'ייתכן שהתובנה נמחקה מהיומן או שהקישור אינו תקין. ניתן לחזור ליומן התובנות במרחב האישי.'
              : 'ייתכן שהשיתוף הופסק, שהתובנה נמחקה, או שהקישור הוקלד בחלקו. ניתן לבקש קישור מעודכן ממי ששיתף/ה אותו איתך.'}
          </p>
        </section>
      </Shell>
    );
  }

  // ---- Owner just stopped sharing ----
  if (revoked) {
    return (
      <Shell>
        <section className="ipv-card ipv-state-card ipv-rise" style={{ animationDelay: '0.08s' }}>
          <div className="ipv-state-icon">
            <CheckCircle2 size={30} />
          </div>
          <h1 className="ipv-state-title">השיתוף הופסק</h1>
          <p className="ipv-state-text">
            הקישור כבר לא פעיל ואינו נגיש לאף אחד.
            ניתן לשתף את התובנה מחדש בכל עת מיומן התובנות במרחב האישי.
          </p>
        </section>
      </Shell>
    );
  }

  const showTitle = insight.title && !DEFAULT_INSIGHT_TITLES.includes(insight.title);
  const intensity = intensityVisual(insight.intensity);

  return (
    <Shell>
      <section className="ipv-card ipv-rise" style={{ animationDelay: '0.08s' }}>
        <span className="ipv-eyebrow">
          <Sparkles size={14} />
          יומן תובנות
        </span>
        <h1 className="ipv-title">
          {showTitle ? (
            insight.title
          ) : (
            <>
              <BookOpen size={26} style={{ verticalAlign: '-4px', marginInlineEnd: '8px', color: 'var(--primary)' }} />
              תובנה אישית
            </>
          )}
        </h1>
        <div className="ipv-accent-bar" aria-hidden="true" />
        <p className="ipv-subtitle">
          {variant === 'view'
            ? 'תצוגה מתוך יומן התובנות והמחשבות האישי שלך'
            : 'תובנה אישית ששותפה איתך מתוך יומן פרטי'}
        </p>

        <div className="ipv-stats">
          <div className="ipv-stat">
            <span className="ipv-stat-icon">
              <Smile size={20} />
            </span>
            <div className="ipv-stat-body">
              <div className="ipv-stat-label">מצב רוח</div>
              <div className="ipv-stat-value">{insight.mood}</div>
            </div>
          </div>
          <div className="ipv-stat">
            <span className="ipv-stat-icon" style={{ background: intensity.gradient }}>
              <Flame size={20} />
            </span>
            <div className="ipv-stat-body">
              <div className="ipv-stat-label">
                עוצמה רגשית <span style={{ color: 'var(--text-strong)' }}>· {insight.intensity}/10</span>
              </div>
              <div className="ipv-stat-value" style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                <div className="ipv-meter">
                  <div
                    className="ipv-meter-fill"
                    style={{ width: meterOn ? `${insight.intensity * 10}%` : '0%', background: intensity.gradient }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ipv-paper">
          <div className="ipv-content">{insight.content}</div>
        </div>
      </section>

      {variant === 'public' && (
        <div className="ipv-actions ipv-rise" style={{ animationDelay: '0.18s' }}>
          <button type="button" onClick={handleCopy} className="ipv-btn ipv-btn-primary">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'הקישור הועתק!' : 'העתקת קישור'}
          </button>
          {canNativeShare && (
            <button type="button" onClick={handleNativeShare} className="ipv-btn ipv-btn-glass">
              <Share2 size={18} /> שיתוף
            </button>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ipv-btn ipv-btn-wa"
          >
            <WhatsAppIcon size={18} color="#ffffff" /> שליחה ב-WhatsApp
          </a>
        </div>
      )}

      {variant === 'public' && isOwner && (
        <div className="ipv-owner ipv-rise" style={{ animationDelay: '0.26s' }}>
          <div className="ipv-owner-note">
            <ShieldCheck size={15} color="#d97706" style={{ flexShrink: 0 }} />
            <span>זהו קישור שיתוף פעיל — כל מי שמחזיק בו יכול לצפות בתובנה זו. הפסקת השיתוף תבטל אותו מיד.</span>
          </div>
          <button type="button" onClick={handleRevoke} disabled={revoking} className="ipv-btn-revoke">
            {revoking ? <Loader2 size={15} className="spin" /> : <Ban size={15} />}
            הפסקת שיתוף
          </button>
          {revokeError && <div className="ipv-error">שגיאה בהפסקת השיתוף — נסה/י שוב בעוד רגע</div>}
        </div>
      )}
    </Shell>
  );
}
