'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Smile, ShieldCheck, Copy, Check, Share2, Loader2, Ban, CheckCircle2 } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';

export interface InsightViewData {
  title: string;
  content: string;
  mood: string;
  intensity: number;
}

// Same default titles the portal journal hides in the mobile cards
const DEFAULT_INSIGHT_TITLES = ['תובנה אישית', 'תובנה שבועית'];

/**
 * Standalone styled view of a single journal insight, shared by the private
 * view page (/insight-view/[id], owner-only) and the public share page
 * (/insight/[id]/[token], link-token protected). Shows the insight itself —
 * no dates, no names — so a forwarded link never exposes identity.
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

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    setShareUrl(window.location.href);
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

  // ---- Missing insight: broken share link / deleted entry ----
  if (!insight) {
    return (
      <div style={shellStyle} dir="rtl">
        <div style={cardStyle}>
          <div style={{ ...iconTileStyle, background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>🔗</div>
          <h2 style={h2Style}>
            {variant === 'view' ? 'התובנה אינה זמינה' : 'הקישור אינו תקין או שפג תוקפו'}
          </h2>
          <p style={pStyle}>
            {variant === 'view'
              ? 'ייתכן שהתובנה נמחקה מהיומן או שהקישור אינו תקין. ניתן לחזור ליומן התובנות במרחב האישי.'
              : 'ייתכן שהשיתוף הופסק, שהתובנה נמחקה, או שהקישור הוקלד בחלקו. ניתן לבקש קישור מעודכן ממי ששיתף/ה אותו איתך.'}
          </p>
        </div>
      </div>
    );
  }

  // ---- Owner just stopped sharing ----
  if (revoked) {
    return (
      <div style={shellStyle} dir="rtl">
        <div style={cardStyle}>
          <div style={iconTileStyle}><CheckCircle2 size={30} color="#fff" /></div>
          <h2 style={h2Style}>השיתוף הופסק 🛑</h2>
          <p style={pStyle}>
            הקישור כבר לא פעיל ואינו נגיש לאף אחד.
            ניתן לשתף את התובנה מחדש בכל עת מיומן התובנות במרחב האישי.
          </p>
        </div>
      </div>
    );
  }

  const showTitle = insight.title && !DEFAULT_INSIGHT_TITLES.includes(insight.title);
  const intensityColor = insight.intensity > 7 ? '#ef4444' : insight.intensity > 4 ? 'var(--primary)' : '#3b82f6';

  return (
    <div style={shellStyle} dir="rtl">
      <div style={{ ...cardStyle, maxWidth: '640px' }}>

        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={iconTileStyle}>
            <BookOpen size={30} color="#fff" />
          </div>
          <h2 style={{ ...h2Style, marginBottom: '4px' }}>תובנה אישית</h2>
          <p style={{ ...pStyle, margin: 0 }}>
            {variant === 'view'
              ? 'תצוגה מתוך יומן התובנות והמחשבות האישי שלך'
              : 'תובנה אישית ששותפה איתך מתוך יומן פרטי'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span className="badge badge-info" style={{ fontWeight: 700, fontSize: '0.85rem', padding: '6px 14px' }}>
            <Smile size={14} /> {insight.mood}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>עוצמת רגש:</span>
            <div style={{ width: '72px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${insight.intensity * 10}%`, height: '100%', background: intensityColor }} />
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>{insight.intensity}/10</span>
          </div>
        </div>

        {showTitle && (
          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', lineHeight: 1.4, marginTop: '16px' }}>
            {insight.title}
          </div>
        )}

        <div className="insight-card-body" style={{ fontSize: '1.02rem', lineHeight: 1.8, marginTop: '12px', textAlign: 'right' }}>
          {insight.content}
        </div>

        {variant === 'public' && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleCopy} style={primaryButtonStyle}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'הקישור הועתק!' : 'העתקת קישור'}
            </button>
            {canNativeShare && (
              <button type="button" onClick={handleNativeShare} style={secondaryButtonStyle}>
                <Share2 size={18} /> שיתוף
              </button>
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={whatsappButtonStyle}
            >
              <WhatsAppIcon size={18} color="#ffffff" /> שליחה ב-WhatsApp
            </a>
          </div>
        )}

        {variant === 'public' && isOwner && (
          <div style={ownerBarStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              <ShieldCheck size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span>זהו קישור שיתוף פעיל — כל מי שמחזיק בו יכול לצפות בתובנה זו. הפסקת השיתוף תבטל אותו מיד.</span>
            </div>
            <button type="button" onClick={handleRevoke} disabled={revoking} style={revokeButtonStyle}>
              {revoking ? <Loader2 size={15} className="spin" /> : <Ban size={15} />}
              הפסקת שיתוף
            </button>
            {revokeError && (
              <div style={{ fontSize: '0.8rem', color: '#dc2626', textAlign: 'right' }}>
                שגיאה בהפסקת השיתוף — נסה/י שוב בעוד רגע
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
          <ShieldCheck size={14} />
          <span>
            {variant === 'view' ? 'תצוגה פרטית מתוך המרחב האישי' : 'קישור אישי ומאובטח'} · WiseCare
          </span>
        </div>
      </div>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px 16px',
  background: 'linear-gradient(145deg, var(--primary-faint) 0%, #f4f9f8 100%)',
  fontFamily: 'inherit'
};

const cardStyle: React.CSSProperties = {
  maxWidth: '460px',
  width: '100%',
  padding: '36px 28px',
  borderRadius: '24px',
  border: '1px solid #dbe7e6',
  background: '#ffffff',
  boxShadow: '0 20px 50px color-mix(in srgb, var(--primary-hover) 8%, transparent)',
  textAlign: 'center'
};

const iconTileStyle: React.CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black)) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
  boxShadow: '0 8px 20px color-mix(in srgb, var(--primary) 25%, transparent)'
};

const h2Style: React.CSSProperties = {
  fontSize: '1.3rem',
  fontWeight: 800,
  color: '#101c24',
  margin: '0 0 8px'
};

const pStyle: React.CSSProperties = {
  fontSize: '0.92rem',
  color: '#51636b',
  lineHeight: 1.6,
  margin: '0 0 8px'
};

const primaryButtonStyle: React.CSSProperties = {
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '13px 22px',
  borderRadius: '14px',
  border: 'none',
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black)) 100%)',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '0.95rem',
  cursor: 'pointer',
  minWidth: '150px',
  boxShadow: '0 8px 20px color-mix(in srgb, var(--primary) 25%, transparent)'
};

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '13px 20px',
  borderRadius: '14px',
  border: '1.5px solid #dbe7e6',
  background: '#f4f9f8',
  color: '#101c24',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer'
};

const whatsappButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '13px 20px',
  borderRadius: '14px',
  border: 'none',
  background: 'linear-gradient(135deg, #25D366 0%, #1DA851 100%)',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '0.95rem',
  cursor: 'pointer',
  textDecoration: 'none',
  boxShadow: '0 8px 20px rgba(37, 211, 102, 0.25)'
};

const ownerBarStyle: React.CSSProperties = {
  marginTop: '18px',
  padding: '12px 16px',
  background: 'var(--primary-faint)',
  border: '1px solid var(--primary-glow, color-mix(in srgb, var(--primary) 30%, white))',
  borderRadius: '14px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px'
};

const revokeButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  padding: '9px 18px',
  borderRadius: '12px',
  border: '1.5px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer'
};
