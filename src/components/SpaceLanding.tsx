'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  HeartHandshake, Wind, Music, BookHeart, Clapperboard, CheckSquare, ShieldCheck,
  Loader2, Eye, EyeOff, User, Phone, Mail, Lock, LogIn, CheckCircle2,
  ChevronDown, ChevronLeft, X, Sparkles, Home, ListTodo, LockKeyhole, ArrowLeft
} from 'lucide-react';
import spaceHeroImage from '../../public/images/space-hero-2026.png';
import IntroSplash from './IntroSplash';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import WhatsAppIcon from './WhatsAppIcon';

const SPACE_INTRO_KEY = 'wisecare-space-intro-seen';

const NAV_LINKS = [
  { href: '#features', label: 'המרחב שלך' },
  { href: '#how-it-works', label: 'איך זה עובד' },
  { href: '#faq', label: 'שאלות נפוצות' }
];

const STATS = [
  { icon: Wind, n: '14', label: 'טכניקות נשימה מונחות' },
  { icon: Music, n: 'רציף', label: 'נגן מוזיקה שממשיך ברקע' },
  { icon: BookHeart, n: 'יומי', label: 'יומן מצב-רוח אישי' },
  { icon: ShieldCheck, n: '100%', label: 'פרטי ומאובטח' }
];

const CAPABILITIES = [
  { icon: Music, title: 'המוזיקה שלי', text: 'רשימה אישית עם השירים שעושים לך טוב — ונגן שממשיך להתנגן גם כשעוברים אפליקציה.' },
  { icon: BookHeart, title: 'יומן ומצב-רוח', text: "צ'ק-אין קצר שמאפשר לראות תהליך לאורך זמן — ולהבין מה עוזר לך באמת." },
  { icon: Clapperboard, title: 'תוכן שנבחר עבורך', text: 'מאמרים, סרטונים ותרגולים שמתאימים לדרך שלך, כולל ההמלצות של הצוות.' },
  { icon: CheckSquare, title: 'משימות אישיות', text: 'צעדים קטנים וברורים שבונים תחושת התקדמות אמיתית.' },
  { icon: ShieldCheck, title: 'פרטיות כברירת מחדל', text: 'פרטי כניסה אישיים, נעילת PIN מהירה ומרחב ששייך רק לך.' }
];

const STEPS = [
  { n: '01', title: 'נרשמים בדקה', text: 'ממלאים כמה פרטים — והמרחב האישי נפתח מיד, עם כל הכלים בפנים.' },
  { n: '02', title: 'מקבלים גישה אישית', text: 'הקישור הפרטי ופרטי הכניסה מגיעים ישר לוואטספ — זמין מכל מכשיר.' },
  { n: '03', title: 'מתחילים בדרך שלך', text: 'שתי דקות ביום: נשימה, שיר, כתיבה קצרה — בקצב שנכון לך.' }
];

const FAQS = [
  { q: 'האם פתיחת המרחב עולה כסף?', a: 'לא. פתיחת המרחב והשימוש בכלים הם ללא תשלום וללא התחייבות. לא מבקשים כרטיס אשראי.' },
  { q: 'אפשר להשתמש במרחב גם מהטלפון?', a: 'כן. המרחב מותאם לטלפון, לטאבלט ולמחשב — נכנסים אליו מכל מכשיר בלי להתקין כלום.' },
  { q: 'מה קורה עם המידע האישי שלי?', a: 'הגישה למרחב אישית. פרטי הכניסה והמידע נשמרים בהתאם למדיניות הפרטיות ולמנגנוני האבטחה של המערכת.' },
  { q: 'כמה זמן צריך להקדיש בכל יום?', a: 'אין זמן חובה. אפשר להתחיל גם בשתי דקות של נשימה, כתיבה קצרה או שיר אחד שעושה טוב.' },
  { q: 'האם זה מחליף טיפול?', a: 'לא. המרחב הוא כלי להעצמה אישית ולשיפור מצב הרוח ביום-יום — אינו טיפול פסיכולוגי ואינו תחליף לייעוץ מקצועי.' }
];

const GOALS = [
  { id: 'calm', label: 'להרגיש רגוע/ה יותר', icon: Wind },
  { id: 'mood', label: 'לשפר את מצב הרוח', icon: HeartHandshake },
  { id: 'habits', label: 'לבנות הרגלים בריאים', icon: CheckSquare },
  { id: 'growth', label: 'התפתחות אישית', icon: Sparkles }
];

interface RegisterForm {
  fullName: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

/** Reveal-on-scroll — מופעל על ילדים עם data-reveal */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function SpaceLanding() {
  const [regOpen, setRegOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState<RegisterForm>({
    fullName: '', phone: '', email: '', username: '', password: '', confirmPassword: ''
  });
  const [goal, setGoal] = useState('calm');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const rootRef = useReveal();

  const set = (key: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const openRegister = () => {
    setError('');
    setMenuOpen(false);
    setRegOpen(true);
    if (typeof window !== 'undefined' && window.location.hash !== '#register') {
      window.history.replaceState(null, '', '#register');
    }
  };

  const closeRegister = () => {
    if (success) return;
    setRegOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#register') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#register') setRegOpen(true);
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!regOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRegister(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regOpen, success]);

  const validate = (): string | null => {
    if (!form.fullName.trim()) return 'נא להזין שם מלא';
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 9) return 'נא להזין מספר וואטספ תקין';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return 'נא להזין כתובת אימייל תקינה';
    if (form.username.trim().length < 3) return 'שם משתמש קצר מדי — לפחות 3 תווים';
    if (form.password.length < 8) return 'הסיסמה קצרה מדי — לפחות 8 תווים';
    if (form.password !== form.confirmPassword) return 'הסיסמאות אינן תואמות';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;
    const v = validate();
    if (v) { setError(v); return; }
    try {
      setSubmitting(true);
      setError('');
      const res = await fetch('/api/portal/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
          goal
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בהרשמה');
      if (data.portalCode) {
        try {
          localStorage.setItem('wisecare_last_portal', data.portalCode);
          localStorage.setItem(`wisecare_portal_auth_${data.portalCode}`, 'true');
          if (data.token) {
            localStorage.setItem(`wisecare_portal_token_${data.portalCode}`, data.token);
            localStorage.setItem('wisecare_portal_token', data.token);
          }
        } catch {}
      }
      setSuccess(data);
      setTimeout(() => {
        if (data.portalCode) window.location.replace(`/portal/${encodeURIComponent(data.portalCode)}`);
      }, 4200);
    } catch (err: any) {
      setError(err.message || 'שגיאה בהרשמה');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-page" ref={rootRef}>
      <IntroSplash
        storageKey={SPACE_INTRO_KEY}
        tagline="המרחב האישי החכם שלך — להתפתחות ולשיפור מצב הרוח"
        onDone={() => {}}
      />

      <a className="space-skip-link" href="#main">דלג לתוכן</a>

      {/* ═══ HEADER ═══ */}
      <header className="space-header">
        <div className="space-container space-header-inner">
          <a className="space-brand" href="#top" aria-label="WiseCare — חזרה לראש העמוד">
            <span className="space-brand-mark" aria-hidden="true"><HeartHandshake size={26} /></span>
            <span>Wise<em>Care</em></span>
          </a>

          <nav className={`space-nav${menuOpen ? ' is-open' : ''}`} aria-label="ניווט ראשי">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
            <a className="space-login-link" href="/join?view=login" onClick={() => setMenuOpen(false)}>
              <LogIn size={14} /> יש לי מרחב
            </a>
            <button type="button" className="space-btn space-btn-primary space-nav-cta" onClick={openRegister}>
              פתיחת מרחב
            </button>
          </nav>

          <button
            type="button"
            className={`space-menu-toggle${menuOpen ? ' is-open' : ''}`}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'סגירת התפריט' : 'פתיחת התפריט'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      <main id="main">
        {/* ═══ HERO ═══ */}
        <section className="space-hero" id="top">
          <div className="space-hero-media" aria-hidden="true">
            <Image
              className="space-hero-image"
              src={spaceHeroImage}
              alt=""
              fill
              sizes="100vw"
              placeholder="blur"
              preload
            />
          </div>
          <div className="space-container space-hero-grid">
            <div className="space-hero-copy" data-reveal>
              <div className="space-hero-eyebrow">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>WISECARE SPACE</span>
                <i aria-hidden="true" />
                מרחב דיגיטלי פרטי
              </div>
              <h1>מרחב אישי חכם. <span>להרגיש טוב יותר, בכל יום.</span></h1>
              <p className="space-hero-lead">
                נשימות מונחות, מוזיקה, יומן ומשימות אישיות — מעטפת דיגיטלית רגועה, פרטית ונגישה שנבנתה סביבך.
              </p>
              <div className="space-hero-actions">
                <button type="button" className="space-btn space-btn-primary space-btn-lg space-btn-premium" onClick={openRegister}>
                  <span>פתיחת המרחב שלי</span>
                  <strong>בחינם</strong>
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <a className="space-text-link space-hero-secondary" href="#features">לצפייה במה שיש בפנים<ChevronDown size={15} aria-hidden="true" /></a>
              </div>
              <div className="space-trust-line" aria-label="יתרונות ההרשמה">
                <span><ShieldCheck size={15} aria-hidden="true" /> פרטי ומאובטח</span>
                <span><CheckCircle2 size={15} aria-hidden="true" /> נפתח מיד</span>
                <span><CheckCircle2 size={15} aria-hidden="true" /> בלי כרטיס אשראי</span>
              </div>
            </div>

            {/* חלון-מוצר: תצוגה מקדימה של המרחב האמיתי */}
            <div className="space-product-window" data-reveal aria-label="תצוגה מקדימה של המרחב האישי">
              <span className="space-product-proof"><ShieldCheck size={14} aria-hidden="true" /> סביבת רווחה אישית, פרטית ומאובטחת</span>
              <div className="space-product-screen">
                <div className="space-product-topbar">
                  <span className="space-mini-brand">
                    <span className="space-mini-brand-dot" aria-hidden="true" />
                    WiseCare
                  </span>
                  <span className="space-user-chip">
                    <span className="space-user-avatar" aria-hidden="true"><HeartHandshake size={14} /></span>
                    המרחב שלי
                  </span>
                </div>
                <div className="space-product-body">
                  <div className="space-product-rail" aria-hidden="true">
                    <span className="space-rail-item active"><Home size={17} /></span>
                    <span className="space-rail-item"><Wind size={17} /></span>
                    <span className="space-rail-item"><Music size={17} /></span>
                    <span className="space-rail-item"><BookHeart size={17} /></span>
                    <span className="space-rail-item"><ListTodo size={17} /></span>
                    <span className="space-rail-item"><LockKeyhole size={17} /></span>
                  </div>
                  <div className="space-dashboard">
                    <div className="space-dashboard-head">
                      <div>
                        <h2>טוב לראות אותך שוב</h2>
                        <p>איך את/ה מרגיש/ה היום?</p>
                      </div>
                      <span className="space-dashboard-date">היום</span>
                    </div>
                    <div className="space-tool-grid">
                      <div className="space-tool-card t-teal">
                        <Wind size={19} aria-hidden="true" />
                        <h3>נשימה</h3>
                        <p>תרגול מונחה להרגעה מיידית</p>
                        <span className="space-tool-arrow" aria-hidden="true"><ChevronLeft size={13} /></span>
                      </div>
                      <div className="space-tool-card t-blue">
                        <Music size={19} aria-hidden="true" />
                        <h3>המוזיקה שלי</h3>
                        <p>השירים שעושים לי טוב</p>
                        <span className="space-tool-arrow" aria-hidden="true"><ChevronLeft size={13} /></span>
                      </div>
                      <div className="space-tool-card t-rose">
                        <BookHeart size={19} aria-hidden="true" />
                        <h3>יומן אישי</h3>
                        <p>מצב-רוח ותובנות</p>
                        <span className="space-tool-arrow" aria-hidden="true"><ChevronLeft size={13} /></span>
                      </div>
                      <div className="space-tool-card t-sand">
                        <ListTodo size={19} aria-hidden="true" />
                        <h3>המשימות שלי</h3>
                        <p>צעדים קטנים קדימה</p>
                        <span className="space-tool-arrow" aria-hidden="true"><ChevronLeft size={13} /></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ STATS ═══ */}
        <section className="space-stats-band" aria-label="המרחב במספרים">
          <div className="space-container space-stats">
            {STATS.map((s) => (
              <div className="space-stat" key={s.label} data-reveal>
                <span className="space-stat-icon" aria-hidden="true"><s.icon size={18} /></span>
                <span className="space-stat-n">{s.n}</span>
                <span className="space-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section className="space-section space-features" id="features">
          <div className="space-container">
            <header className="space-section-head center" data-reveal>
              <span className="space-kicker">המרחב שלך</span>
              <h2 className="space-title">כל מה שצריך כדי להתקדם, <span>בקצב שלך</span></h2>
              <p className="space-subtitle">כלים שימושיים שבאמת משתלבים ביום-יום.</p>
            </header>

            <div className="space-features-layout">
              <article className="space-breathing-panel" data-reveal>
                <div className="space-breathing-copy">
                  <span className="space-feature-icon"><Wind size={22} aria-hidden="true" /></span>
                  <h3>נשימות מונחות</h3>
                  <p>14 טכניקות מהעולם המבוסס-מחקר של המיינדפולנס, עם נגן מונחה מעוצב — להרגעה מיידית, מיקוד ושינה.</p>
                </div>
                <div className="space-breathing-visual" aria-hidden="true">
                  <div className="space-breathing-ring">
                    <div>
                      <strong>4-7-8</strong>
                      <small>שאיפה · החזקה · נשיפה</small>
                    </div>
                  </div>
                </div>
              </article>

              <div className="space-capability-list" data-reveal>
                {CAPABILITIES.map((c) => (
                  <div className="space-capability" key={c.title}>
                    <span className="space-capability-icon"><c.icon size={20} aria-hidden="true" /></span>
                    <div>
                      <h3>{c.title}</h3>
                      <p>{c.text}</p>
                    </div>
                    <ChevronLeft size={16} aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>

            <p className="space-privacy-note" data-reveal>
              <ShieldCheck size={17} aria-hidden="true" />
              המרחב שלך פרטי. שום דבר שכתוב בו לא משותף עם אף אחד.
              <button type="button" className="space-text-link" onClick={() => setIsPrivacyOpen(true)}>איך שומרים על הפרטיות</button>
            </p>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section className="space-section" id="how-it-works">
          <div className="space-container">
            <header className="space-section-head center" data-reveal>
              <span className="space-kicker">איך זה עובד</span>
              <h2 className="space-title">שלוש דקות להתחלה. <span>כמה דקות ביום לעצמך.</span></h2>
            </header>
            <div className="space-steps">
              {STEPS.map((s) => (
                <article className="space-step" key={s.n} data-reveal>
                  <span className="space-step-n" aria-hidden="true">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ REGISTER CTA ═══ */}
        <section className="space-section space-register-section" id="register">
          <div className="space-container space-register-grid">
            <div className="space-register-copy" data-reveal>
              <span className="space-kicker">מוכנ/ה?</span>
              <h2 className="space-title">המרחב האישי שלך <span>מחכה.</span></h2>
              <p className="space-subtitle">
                דקה אחת של הקלדה — ונפתח לך מרחב שלם עם נשימות, מוזיקה, יומן ומשימות.
                בלי תשלום, בלי התחייבות, עם ההמלצות של הצוות שלנו בפנים.
              </p>
            </div>
            <div className="space-cta-card" data-reveal>
              <span className="space-cta-card-icon" aria-hidden="true"><Sparkles size={24} /></span>
              <h3>פתיחת מרחב אישי</h3>
              <p>הפרטים נשמרים באופן פרטי ומאובטח, ופרטי הכניסה מגיעים ישר לוואטספ שלך.</p>
              <ul>
                <li><CheckCircle2 size={15} aria-hidden="true" /> דקה אחת, בלי כרטיס אשראי</li>
                <li><CheckCircle2 size={15} aria-hidden="true" /> המרחב נפתח מיד לאחר ההרשמה</li>
                <li><CheckCircle2 size={15} aria-hidden="true" /> ניתן לצאת ולמחוק בכל רגע</li>
              </ul>
              <button type="button" className="space-btn space-btn-primary space-btn-lg space-btn-block" onClick={openRegister}>
                פתיחת המרחב שלי
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="space-section space-faq-section" id="faq">
          <div className="space-container space-faq-layout">
            <header className="space-faq-intro" data-reveal>
              <span className="space-kicker">שאלות</span>
              <h2 className="space-title">שאלות נפוצות</h2>
              <p>כל מה שכדאי לדעת לפני שפותחים מרחב אישי.</p>
            </header>
            <div className="space-faq-list" data-reveal>
              {FAQS.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}<ChevronDown size={17} className="space-faq-chevron" aria-hidden="true" /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="space-footer">
        <div className="space-container space-footer-inner">
          <a className="space-brand" href="#top" aria-label="WiseCare — חזרה לראש העמוד">
            <span className="space-brand-mark" aria-hidden="true"><HeartHandshake size={24} /></span>
            <span>Wise<em>Care</em></span>
          </a>
          <div className="space-footer-links">
            <button type="button" className="space-text-link" onClick={() => setIsPrivacyOpen(true)}>מדיניות פרטיות</button>
            <span className="space-sep" aria-hidden="true">•</span>
            <span>© 2026 WiseCare. כל הזכויות שמורות.</span>
          </div>
        </div>
      </footer>

      {/* ═══ REGISTRATION MODAL ═══ */}
      {regOpen && (
        <div
          className="space-reg-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="פתיחת מרחב אישי"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeRegister(); }}
        >
          <div className="space-reg-modal">
            {!success ? (
              <>
                <button type="button" className="space-reg-close" onClick={closeRegister} aria-label="סגירה">
                  <X size={18} />
                </button>
                <div className="space-reg-head">
                  <h2>פתיחת מרחב אישי</h2>
                  <p>דקה אחת — והמרחב שלך נפתח</p>
                </div>

                <div className="space-reg-trust" aria-hidden="true">
                  <span><ShieldCheck size={13} /> פרטיות מלאה</span>
                  <span><WhatsAppIcon size={13} /> הפרטים מגיעים בוואטספ</span>
                  <span><CheckCircle2 size={13} /> דקה אחת</span>
                </div>

                <form className="space-form" onSubmit={submit} noValidate>
                  <div className="space-form-grid">
                    <label className="space-field">
                      <span>שם מלא *</span>
                      <div className="space-input-wrap">
                        <User size={16} aria-hidden="true" />
                        <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="איך לקרוא לך?" autoComplete="name" autoFocus />
                      </div>
                    </label>

                    <label className="space-field">
                      <span>מספר וואטספ *</span>
                      <div className="space-input-wrap">
                        <Phone size={16} aria-hidden="true" />
                        <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} placeholder="050-0000000" autoComplete="tel" />
                      </div>
                    </label>

                    <label className="space-field">
                      <span>אימייל *</span>
                      <div className="space-input-wrap">
                        <Mail size={16} aria-hidden="true" />
                        <input type="email" dir="ltr" value={form.email} onChange={set('email')} placeholder="you@email.com" autoComplete="email" />
                      </div>
                    </label>

                    <label className="space-field">
                      <span>שם משתמש *</span>
                      <div className="space-input-wrap">
                        <User size={16} aria-hidden="true" />
                        <input type="text" dir="ltr" value={form.username} onChange={set('username')} placeholder="לפחות 3 תווים" autoComplete="username" />
                      </div>
                    </label>

                    <label className="space-field">
                      <span>סיסמה *</span>
                      <div className="space-input-wrap">
                        <Lock size={16} aria-hidden="true" />
                        <input type={showPassword ? 'text' : 'password'} dir="ltr" value={form.password} onChange={set('password')} placeholder="לפחות 8 תווים" autoComplete="new-password" />
                        <button type="button" className="space-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'הסתרת סיסמה' : 'הצגת סיסמה'}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>

                    <label className="space-field">
                      <span>אימות סיסמה *</span>
                      <div className="space-input-wrap">
                        <Lock size={16} aria-hidden="true" />
                        <input type={showPassword ? 'text' : 'password'} dir="ltr" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="שוב אותה סיסמה" autoComplete="new-password" />
                      </div>
                    </label>
                  </div>

                  <fieldset className="space-goal-fieldset">
                    <legend>מה היית רוצה להעצים?</legend>
                    <div className="space-goal-chips">
                      {GOALS.map((g) => (
                        <button
                          type="button"
                          key={g.id}
                          className={`space-goal-chip${goal === g.id ? ' space-goal-chip-active' : ''}`}
                          onClick={() => setGoal(g.id)}
                          aria-pressed={goal === g.id}
                        >
                          <g.icon size={14} aria-hidden="true" /> {g.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {error && <div className="space-form-error" role="alert">{error}</div>}

                  <button type="submit" className="space-btn space-btn-primary space-btn-lg space-btn-block" disabled={submitting}>
                    {submitting ? <Loader2 size={17} className="space-spin" /> : null}
                    {submitting ? 'פותחים את המרחב שלך...' : 'פתיחת המרחב שלי'}
                    {!submitting && <ChevronLeft size={17} aria-hidden="true" />}
                  </button>

                  <p className="space-consent">
                    בלחיצה על הכפתור אני מאשר/ת את{' '}
                    <button type="button" className="space-text-link" onClick={() => setIsPrivacyOpen(true)}>מדיניות הפרטיות</button>.
                  </p>
                </form>
              </>
            ) : (
              <div className="space-success">
                <CheckCircle2 size={52} aria-hidden="true" />
                <h2>{form.fullName.trim().split(' ')[0]} — המרחב שלך מוכן!</h2>
                <p>
                  שלחנו את הקישור האישי ואת פרטי הכניסה לוואטספ
                  {success.whatsappSent ? ' בהצלחה' : ' (יישלח ברגע)'}.
                  <br />
                  שם המשתמש שלך: <strong dir="ltr">{success.client?.username || form.username}</strong>
                </p>
                <div className="space-success-wa">
                  <WhatsAppIcon size={16} />
                  שמור/י את ההודעה — היא הדרך שלך חזרה למרחב
                </div>
                <button
                  type="button"
                  className="space-btn space-btn-primary space-btn-lg"
                  onClick={() => success.portalCode && window.location.replace(`/portal/${encodeURIComponent(success.portalCode)}`)}
                >
                  כניסה למרחב שלי עכשיו
                  <ArrowLeft size={17} aria-hidden="true" />
                </button>
                <small className="space-success-auto">מעבירים אותך אוטומטית בעוד רגע...</small>
              </div>
            )}
          </div>
        </div>
      )}

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}
