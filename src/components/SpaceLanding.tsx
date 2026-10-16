'use client';

import React, { useState } from 'react';
import {
  HeartHandshake, Wind, Music, BookHeart, Clapperboard, CheckSquare, ShieldCheck,
  ChevronDown, Loader2, Eye, EyeOff, User, Phone, Mail, Lock, Sparkles, LogIn, CheckCircle2
} from 'lucide-react';
import IntroSplash from './IntroSplash';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import WhatsAppIcon from './WhatsAppIcon';

const SPACE_INTRO_KEY = 'wisecare-space-intro-seen';

const FEATURES = [
  {
    icon: Wind,
    title: 'ספריית נשימות מונחית',
    text: '14 טכניקות נשימה מהעולם המבוסס-מחקר של המיינדפולנס — להרגעה מיידית, מיקוד ושינה, עם נגן מונחה מעוצב.'
  },
  {
    icon: Music,
    title: 'השירים שלי 🎵',
    text: 'רשימת השירים שעושים לך טוב, עם נגן שממשיך להתנגן ברקע — גם בזמן נהיגה, כולל ההמלצות של הצוות שלנו.'
  },
  {
    icon: BookHeart,
    title: 'יומן תובנות ומצב-רוח',
    text: "צ׳ק-אין יומי קצר עם מצבי-רוח, יומן אישי פרטי ומעקב חזותי אחרי ההתקדמות שלך."
  },
  {
    icon: Clapperboard,
    title: 'תוכן נבחר בשבילך',
    text: 'סרטונים, מאמרים ותרגולים שנאספו בקפידה — כל מה שנכנס למרחב שלך נבחר בשביל המסע האישי שלך.'
  },
  {
    icon: CheckSquare,
    title: 'משימות אישיות לתרגול',
    text: 'התקדמות בקצב שלך: משימות קטנות ומדידות שמלוות אותך בין השימושים ובונות מומנטום.'
  },
  {
    icon: ShieldCheck,
    title: 'פרטיות ברמה הגבוהה',
    text: 'המרחב שלך שלך בלבד — נעילת PIN מהירה, הצפנה וגישה אישית עם קישור ייחודי ופרטי כניסה משלך.'
  }
];

const STEPS = [
  { n: '1', title: 'נרשמים בדקה', text: 'מלא/י את הפרטים — והמרחב האישי שלך נפתח מיד, עם כל הכלים בפנים.' },
  { n: '2', title: 'מקבלים את הקישור שלך', text: 'שולחים לך לוואטספ את הקישור האישי ופרטי הכניסה — המרחב זמין לך מכל מכשיר.' },
  { n: '3', title: 'מתחילים לתרגל', text: 'נשימה, שירים, יומן ומשימות — שתי דקות ביום שמורגשות טוב יותר.' }
];

const GOALS = [
  { id: 'calm', label: 'להרגיש רגוע/ה יותר', emoji: '🌿' },
  { id: 'habits', label: 'לבנות הרגלים בריאים', emoji: '✨' },
  { id: 'mood', label: 'לשפר את מצב הרוח', emoji: '☀️' },
  { id: 'growth', label: 'התפתחות אישית', emoji: '🌱' }
];

interface RegisterForm {
  fullName: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function SpaceLanding() {
  const [form, setForm] = useState<RegisterForm>({
    fullName: '', phone: '', email: '', username: '', password: '', confirmPassword: ''
  });
  const [goal, setGoal] = useState('calm');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const set = (key: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const scrollToRegister = () => {
    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

      // same session bootstrap as the existing /join flow
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
    <div className="space-shell">
      <IntroSplash
        storageKey={SPACE_INTRO_KEY}
        tagline="המרחב האישי החכם שלך — להתפתחות ולשיפור מצב הרוח"
        onDone={() => {}}
      />

      {/* aurora + orbs backdrop */}
      <div className="space-aurora" aria-hidden="true">
        <div className="space-orb space-orb-a" />
        <div className="space-orb space-orb-b" />
        <div className="space-orb space-orb-c" />
      </div>

      {/* topbar */}
      <header className="space-topbar">
        <div className="space-brand">
          <span className="space-brand-mark" aria-hidden="true"><HeartHandshake size={20} /></span>
          <span className="space-brand-name">Wisecare <small>מרחב אישי</small></span>
        </div>
        <a className="space-login-link" href="/join?view=login">
          <LogIn size={15} />
          יש לי כבר מרחב
        </a>
      </header>

      <main className="space-main">
        {/* HERO */}
        <section className="space-hero">
          <div className="space-hero-badge space-rise-1">
            <Sparkles size={14} />
            להתפתחות אישית • שיפור מצב רוח • בקצב שלך
          </div>
          <h1 className="space-hero-title space-rise-2">
            מרחב אישי דיגיטלי<br />
            <span className="space-hero-accent">שמרגיש רק טוב</span>
          </h1>
          <p className="space-hero-sub space-rise-3">
            נשימות מונחות, השירים שמרימים לך את היום, יומן מצב-רוח ומשימות אישיות —
            הכול במקום אחד פרטי, שנפתח בדקה ומלווה אותך בכל יום.
          </p>
          <div className="space-hero-actions space-rise-4">
            <button type="button" className="space-btn-primary" onClick={scrollToRegister}>
              פתח/י את המרחב שלך — בדקה
            </button>
            <a className="space-btn-glass" href="#features">
              מה יש בפנים
              <ChevronDown size={15} />
            </a>
          </div>
          <div className="space-hero-note space-rise-5">ללא תשלום • ללא התחייבות • הפרטים שלך נשארים שלך</div>
        </section>

        {/* FEATURES */}
        <section className="space-section" id="features">
          <h2 className="space-section-title">מה יש במרחב שלך</h2>
          <p className="space-section-sub">כלים אמיתיים, מהמוצר עצמו — לא הבטחות</p>
          <div className="space-features">
            {FEATURES.map((f) => (
              <div className="space-feature-card" key={f.title}>
                <span className="space-feature-icon" aria-hidden="true"><f.icon size={22} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="space-section">
          <h2 className="space-section-title">איך זה עובד</h2>
          <div className="space-steps">
            {STEPS.map((s) => (
              <div className="space-step" key={s.n}>
                <span className="space-step-n" aria-hidden="true">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* REGISTER */}
        <section className="space-section" id="register">
          <div className="space-register-card">
            {!success ? (
              <>
                <h2 className="space-section-title">פתח/י את המרחב האישי שלך</h2>
                <p className="space-section-sub">דקה אחת, והכול שלך</p>

                <form className="space-form" onSubmit={submit} noValidate>
                  <label className="space-field">
                    <span>שם מלא *</span>
                    <div className="space-input-wrap">
                      <User size={16} aria-hidden="true" />
                      <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="איך לקרוא לך?" autoComplete="name" />
                    </div>
                  </label>

                  <label className="space-field">
                    <span>מספר וואטספ *</span>
                    <div className="space-input-wrap">
                      <Phone size={16} aria-hidden="true" />
                      <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} placeholder="050-0000000" autoComplete="tel" />
                    </div>
                    <small>לשם נשלח לך את הקישור האישי ופרטי הכניסה</small>
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
                          <span aria-hidden="true">{g.emoji}</span> {g.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {error && <div className="space-form-error" role="alert">{error}</div>}

                  <button type="submit" className="space-btn-primary space-btn-block" disabled={submitting}>
                    {submitting ? <Loader2 size={17} className="space-spin" /> : null}
                    {submitting ? 'פותחים את המרחב שלך...' : 'קדימה — פתח/י לי מרחב 🌿'}
                  </button>

                  <p className="space-form-privacy">
                    בהרשמה אני מאשר/ת את{' '}
                    <button type="button" className="space-link" onClick={() => setIsPrivacyOpen(true)}>מדיניות הפרטיות</button>
                  </p>
                </form>
              </>
            ) : (
              <div className="space-success">
                <CheckCircle2 size={52} aria-hidden="true" />
                <h2>{form.fullName.trim().split(' ')[0]} — המרחב שלך מוכן! 🌿</h2>
                <p>
                  שלחנו את הקישור האישי ואת פרטי הכניסה לוואטספ
                  {success.whatsappSent ? ' ✅' : ' (יישלח ברגע)'}.
                  <br />
                  שם המשתמש שלך: <strong dir="ltr">{success.client?.username || form.username}</strong>
                </p>
                <div className="space-success-wa">
                  <WhatsAppIcon size={16} />
                  שמור/י את ההודעה — היא הדרך שלך חזרה למרחב
                </div>
                <button
                  type="button"
                  className="space-btn-primary"
                  onClick={() => success.portalCode && window.location.replace(`/portal/${encodeURIComponent(success.portalCode)}`)}
                >
                  כניסה למרחב שלי עכשיו
                </button>
                <small className="space-success-auto">מעבירים אותך אוטומטית בעוד רגע...</small>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="space-footer">
        <button type="button" className="space-link" onClick={() => setIsPrivacyOpen(true)}>מדיניות פרטיות</button>
        <span>•</span>
        <span>© WiseCare — המרחב האישי שלך</span>
      </footer>

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}
