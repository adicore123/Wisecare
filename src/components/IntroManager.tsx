"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LogIn,
  Sparkles,
  UserCheck,
  X,
  ArrowLeft,
  Heart,
  Stethoscope,
  Eye,
  EyeOff,
  Dices,
  CheckCircle2,
  Loader2,
  Building2,
  Phone,
  Mail,
  Lock,
  User
} from 'lucide-react';

const INTRO_STORAGE_KEY = 'wisecare-intro-seen';

export default function IntroManager() {
  const [introComplete, setIntroComplete] = useState<boolean | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isClinicModalOpen, setIsClinicModalOpen] = useState(false);
  const [existingPortal, setExistingPortal] = useState<string | null>(null);

  // Clinic Registration Form State
  const [clinicForm, setClinicForm] = useState({
    name: '',
    clinicName: '',
    specialty: '',
    username: '',
    password: '',
    phone: '',
    email: ''
  });
  const [showClinicPassword, setShowClinicPassword] = useState(false);
  const [submittingClinic, setSubmittingClinic] = useState(false);
  const [clinicError, setClinicError] = useState('');
  const [clinicSuccess, setClinicSuccess] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const forceReplay = params.has('replay');
    let cancelled = false;
    let introTimer: ReturnType<typeof setTimeout> | undefined;

    const initializeEntry = async () => {
      // Keep the clean placeholder visible while checking for a remembered
      // account. This prevents the intro from flashing before the redirect.
      if (!forceReplay) {
        try {
          const lastPortal = localStorage.getItem('wisecare_last_portal');
          const portalToken = localStorage.getItem('wisecare_portal_token');
          const cachedUserStr = localStorage.getItem('wisecare_user');

          // 1. Instant client-side redirect if session tokens are locally cached
          if (lastPortal && portalToken) {
            window.location.replace(`/portal/${encodeURIComponent(lastPortal)}`);
            return;
          }

          if (cachedUserStr) {
            try {
              const cachedUser = JSON.parse(cachedUserStr);
              if (cachedUser?.loginCode) {
                window.location.replace(`/crm/${encodeURIComponent(cachedUser.loginCode)}/clients`);
                return;
              }
            } catch {}
          }

          // 2. Otherwise verify sessions concurrently in parallel
          const [therapistRes, portalRes] = await Promise.all([
            fetch('/api/auth/me').catch(() => null),
            lastPortal
              ? fetch(`/api/portal/${encodeURIComponent(lastPortal)}/verify-auth`, {
                  headers: portalToken ? { Authorization: `Bearer ${portalToken}` } : {}
                }).catch(() => null)
              : Promise.resolve(null)
          ]);

          if (therapistRes?.ok) {
            const session = await therapistRes.json();
            if (session.user?.loginCode) {
              localStorage.setItem('wisecare_user', JSON.stringify(session.user));
              if (session.token) localStorage.setItem('wisecare_token', session.token);
              window.location.replace(`/crm/${encodeURIComponent(session.user.loginCode)}/clients`);
              return;
            }
          }

          if (portalRes?.ok && lastPortal) {
            const session = await portalRes.json();
            if (session.token) localStorage.setItem('wisecare_portal_token', session.token);
            window.location.replace(`/portal/${encodeURIComponent(lastPortal)}`);
            return;
          }
        } catch {}

        if (cancelled) return;
      }

      try {
        const last = localStorage.getItem('wisecare_last_portal');
        if (last) setExistingPortal(last);
      } catch {}

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let hasSeen = false;
      try {
        hasSeen = localStorage.getItem(INTRO_STORAGE_KEY) === 'true';
      } catch {}

      if (cancelled) return;
      if (reduceMotion || (!forceReplay && hasSeen)) {
        setIntroComplete(true);
      } else {
        setIntroComplete(false);
        introTimer = setTimeout(completeIntro, 4700);
      }
    };

    void initializeEntry();
    return () => {
      cancelled = true;
      if (introTimer) clearTimeout(introTimer);
    };
  }, []);

  const completeIntro = () => {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch {}
    setIntroComplete(true);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setClinicForm(prev => ({ ...prev, password: generated }));
    setShowClinicPassword(true);
  };

  const handleOpenClinicModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setClinicError('');
    setClinicSuccess(null);
    setIsClinicModalOpen(true);
  };

  const handleSubmitClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setClinicError('');

    if (!clinicForm.name.trim() || !clinicForm.username.trim() || !clinicForm.password.trim()) {
      setClinicError('נא למלא שם מלא, שם משתמש וסיסמה');
      return;
    }

    if (clinicForm.password.length < 8) {
      setClinicError('הסיסמה קצרה מדי: נדרשים לפחות 8 תווים');
      return;
    }

    try {
      setSubmittingClinic(true);
      const res = await fetch('/api/auth/register-therapist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinicForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה ביצירת הקליניקה');
      }

      setClinicSuccess(data);

      if (data.token) {
        localStorage.setItem('wisecare_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('wisecare_user', JSON.stringify(data.user));
      }

      setTimeout(() => {
        window.location.replace(data.redirectUrl || `/crm/${data.user?.loginCode}/clients`);
      }, 1600);
    } catch (err: any) {
      setClinicError(err.message || 'שגיאה ביצירת הקליניקה');
    } finally {
      setSubmittingClinic(false);
    }
  };

  // While mounting on client, show clean placeholder to prevent flicker
  if (introComplete === null) {
    return (
      <div className="intro-landing-wrapper" style={{ minHeight: '100vh', background: '#ffffff' }} />
    );
  }

  return (
    <div className="intro-landing-wrapper">
      {/* 1. ANIMATED INTRO SPLASH OVERLAY */}
      {!introComplete && (
        <div className="intro-splash" id="intro">
          <button
            className="intro-splash__skip"
            onClick={completeIntro}
            type="button"
            aria-label="דלג על אנימציית הפתיחה"
          >
            דלג
          </button>

          <div className="intro-splash__words" aria-hidden="true">
            <span className="intro-splash__word">להקשיב.</span>
            <span className="intro-splash__word">להבין.</span>
            <span className="intro-splash__word">להתקדם.</span>
            <span className="intro-splash__word intro-splash__word--together">ביחד.</span>
          </div>

          <div className="intro-splash__brand" aria-hidden="true">
            <img src="/pwa-icon.svg" alt="Wisecare" />
            <span>Wisecare</span>
            <small>המרחב החכם לתהליך הטיפולי שלך</small>
          </div>
        </div>
      )}

      {/* 2. MAIN ENTRY & ROLE SELECTION VIEW (EXACT INTRO FOLDER DESIGN) */}
      <main className={`entry-home entry ${introComplete ? 'is-visible' : ''}`} id="mainContent">
        {/* Ambient SVG shapes */}
        <svg className="intro-ambient ambient ambient--start" viewBox="0 0 330 560" aria-hidden="true">
          <path d="M-20 20C170 40 205 218 53 331C-35 396-12 517 83 590" />
          <path d="M-22 472C67 382 63 267 185 218C190 347 95 410-22 472Z" />
        </svg>
        <svg className="intro-ambient ambient ambient--end" viewBox="0 0 330 560" aria-hidden="true">
          <path d="M350 20C160 40 125 218 277 331C365 396 342 517 247 590" />
          <path d="M352 472C263 382 267 267 145 218C140 347 235 410 352 472Z" />
        </svg>

        <section className="entry__content" aria-labelledby="entryTitle">
          {/* Centered Brand Header - Identical to intro/index.html */}
          <header className="brand" aria-label="Wisecare">
            <img className="brand__logo" src="/pwa-icon.svg" alt="הלוגו של Wisecare" />
            <span className="brand__name" lang="en">Wisecare</span>
          </header>

          {/* Centered Heading */}
          <div className="entry__heading">
            <h1 id="entryTitle">
              איך תרצו להשתמש ב־<span lang="en">Wisecare</span>?
            </h1>
            <p>בחרו את המרחב שמתאים לכם וניקח אתכם משם.</p>
          </div>

          {/* Two Paths - Exact structure from intro/index.html */}
          <div className="paths" aria-label="בחירת סוג המרחב">
            {/* Path 1: Therapist / Admin -> Opens Dedicated Clinic Creation Form */}
            <div
              className="path path--therapist"
              onClick={handleOpenClinicModal}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenClinicModal(e as any); }}
            >
              <span className="path__icon" aria-hidden="true">
                <svg viewBox="0 0 80 80" role="img">
                  <circle cx="27" cy="20" r="9" />
                  <circle cx="57" cy="29" r="7" />
                  <path d="M13 56V47c0-11 6-18 14-18s13 6 17 15c3 7 8 11 16 11h7" />
                  <path d="M49 61v-8c0-8 4-14 10-14s10 5 10 13v12" />
                </svg>
              </span>

              <span className="path__content">
                <strong>אני מטפל/ת</strong>
                <span>יש לי מטופלים ואני רוצה לנהל את העבודה הטיפולית שלי במקום אחד.</span>
              </span>

              <span className="path__action">
                <span>פתיחת קליניקה חדשה</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m14.5 5-7 7 7 7" />
                </svg>
              </span>
            </div>

            {/* Path 2: Patient / Self-Care -> Links to existing portal or /join */}
            <Link
              className="path path--patient"
              href={existingPortal ? `/portal/${encodeURIComponent(existingPortal)}` : '/join'}
              data-role="patient"
            >
              <span className="path__icon" aria-hidden="true">
                <svg viewBox="0 0 80 80" role="img">
                  <path d="M40 65S15 45 15 27c0-10 7-16 15-16 5 0 9 3 10 8 2-5 6-8 11-8 8 0 14 6 14 16 0 18-25 38-25 38Z" />
                  <path d="M40 59c0-17 6-28 18-34-1 15-7 26-18 34Z" />
                </svg>
              </span>

              <span className="path__content">
                <strong>אני מטופל/ת</strong>
                <span>
                  {existingPortal
                    ? 'יש לך מרחב אישי פעיל במכשיר זה. לחץ/י להמשך ישיר.'
                    : 'אני רוצה מרחב אישי שיעזור לי ללוות ולארגן את התהליך שלי.'}
                </span>
              </span>

              <span className="path__action">
                <span>{existingPortal ? 'המשך למרחב האישי שלי' : 'כניסה למרחב האישי'}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m14.5 5-7 7 7 7" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Returning User Access - Clean and subtle below cards */}
          <div className="entry-home-footer">
            <span>כבר רשום/ה במערכת?</span>
            <button
              type="button"
              className="entry-home-footer-btn"
              onClick={() => setIsLoginModalOpen(true)}
            >
              התחברות למשתמש קיים ←
            </button>
          </div>
        </section>
      </main>

      {/* 3. DEDICATED CLINIC REGISTRATION MODAL */}
      {isClinicModalOpen && (
        <div
          className="clinic-modal-backdrop"
          onClick={() => !submittingClinic && setIsClinicModalOpen(false)}
        >
          <div
            className="clinic-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="clinic-modal-close"
              onClick={() => !submittingClinic && setIsClinicModalOpen(false)}
              aria-label="סגור חלון"
            >
              <X size={18} />
            </button>

            {clinicSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  מזל טוב! הקליניקה שלך נוצרה בהצלחה 🎉
                </h3>
                <p style={{ margin: '8px 0 16px', color: '#64748b', fontSize: '0.95rem' }}>
                  פרטי ההתחברות והקישור הייחודי נשלחו גם לוואטסאפ שלך.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#078d9a', fontWeight: 700 }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span>מעביר אותך מיד למרחב הניהול...</span>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: '#e8f8fa',
                    color: '#078d9a',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0
                  }}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#081c30' }}>
                      פתיחת קליניקה חדשה ב-WiseCare 🌿
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                      מלא/י את הפרטים להקמה מיידית של סביבת העבודה הטיפולית שלך
                    </p>
                  </div>
                </div>

                {clinicError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.88rem',
                    marginBottom: '16px'
                  }}>
                    {clinicError}
                  </div>
                )}

                <form onSubmit={handleSubmitClinic} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Name & Title */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
                        שם מלא <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          value={clinicForm.name}
                          onChange={e => setClinicForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="לדוגמה: ד״ר מיכל כהן"
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.92rem'
                          }}
                        />
                        <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
                        שם הקליניקה / התמחות
                      </label>
                      <input
                        type="text"
                        value={clinicForm.clinicName}
                        onChange={e => setClinicForm(prev => ({ ...prev, clinicName: e.target.value }))}
                        placeholder="לדוגמה: קליניקה לפסיכותרפיה ו-CBT"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.92rem'
                        }}
                      />
                    </div>
                  </div>

                  {/* Phone & Email */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
                        מספר טלפון (לקבלת פרטי הגישה בוואטסאפ)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="tel"
                          dir="ltr"
                          value={clinicForm.phone}
                          onChange={e => setClinicForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="050-1234567"
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.92rem',
                            textAlign: 'left'
                          }}
                        />
                        <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
                        אימייל (אופציונלי)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="email"
                          dir="ltr"
                          value={clinicForm.email}
                          onChange={e => setClinicForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="name@example.com"
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.92rem',
                            textAlign: 'left'
                          }}
                        />
                        <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Username & Password */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
                        שם משתמש (באנגלית) <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        required
                        value={clinicForm.username}
                        onChange={e => setClinicForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') }))}
                        placeholder="michal_cohen"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.92rem',
                          textAlign: 'left'
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                          סיסמה אישית <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#078d9a',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Dices size={13} />
                          <span>חולל סיסמה 🎲</span>
                        </button>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input
                          type={showClinicPassword ? 'text' : 'password'}
                          dir="ltr"
                          required
                          value={clinicForm.password}
                          onChange={e => setClinicForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="לפחות 8 תווים"
                          style={{
                            width: '100%',
                            padding: '10px 40px 10px 12px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.92rem',
                            textAlign: 'left'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowClinicPassword(!showClinicPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b'
                          }}
                        >
                          {showClinicPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingClinic}
                    style={{
                      marginTop: '10px',
                      padding: '13px 20px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #078d9a 0%, #047985 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: submittingClinic ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(7, 141, 154, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {submittingClinic ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>מקים את הקליניקה...</span>
                      </>
                    ) : (
                      <span>הקמת קליניקה וכניסה למערכת 🚀</span>
                    )}
                  </button>
                </form>

                <div style={{
                  marginTop: '18px',
                  paddingTop: '14px',
                  borderTop: '1px solid #f1f5f9',
                  textAlign: 'center',
                  fontSize: '0.86rem',
                  color: '#64748b'
                }}>
                  <span>כבר יש לך קליניקה פעילה? </span>
                  <Link
                    href="/login"
                    style={{ color: '#078d9a', fontWeight: 700, textDecoration: 'none' }}
                    onClick={() => setIsClinicModalOpen(false)}
                  >
                    התחבר/י למערכת המטפלים
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. RETURNING USER LOGIN SELECTOR MODAL */}
      {isLoginModalOpen && (
        <div
          className="entry-login-modal-backdrop"
          onClick={() => setIsLoginModalOpen(false)}
        >
          <div
            className="entry-login-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="entry-login-modal-close"
              onClick={() => setIsLoginModalOpen(false)}
              aria-label="סגור חלון התחברות"
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'grid',
                placeItems: 'center'
              }}>
                <UserCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  התחברות למערכת Wisecare
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.86rem', color: '#64748b' }}>
                  בחר/י את המרחב הרצוי לכניסה:
                </p>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Option 1: Therapist Login */}
              <Link
                href="/login"
                className="entry-login-option-card"
                onClick={() => setIsLoginModalOpen(false)}
              >
                <div
                  className="entry-login-option-icon"
                  style={{ background: '#e8f8fa', color: '#078d9a' }}
                >
                  <Stethoscope size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#081c30' }}>
                    כניסה למרחב המטפלים (קליניקה)
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                    התחברות באמצעות שם משתמש וסיסמה או קוד מרחב ייחודי
                  </div>
                </div>
                <ArrowLeft size={16} color="#078d9a" />
              </Link>

              {/* Option 2: Patient Portal Login */}
              <Link
                href="/join?view=login"
                className="entry-login-option-card"
                onClick={() => setIsLoginModalOpen(false)}
              >
                <div
                  className="entry-login-option-icon"
                  style={{ background: '#e9f8f1', color: '#07895d' }}
                >
                  <Heart size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#081c30' }}>
                    כניסה למרחב אישי (מטופלים)
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                    כניסה למשתמש אישי קיים לצפייה במשימות, תוכן ותובנות
                  </div>
                </div>
                <ArrowLeft size={16} color="#07895d" />
              </Link>
            </div>

            <div style={{
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: '0.84rem',
              color: '#64748b'
            }}>
              <span>משתמש חדש? </span>
              <Link
                href="/join?view=register"
                style={{ color: '#078d9a', fontWeight: 600, textDecoration: 'none' }}
                onClick={() => setIsLoginModalOpen(false)}
              >
                פתח/י מרחב אישי עכשיו
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
