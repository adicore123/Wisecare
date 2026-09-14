"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogIn, Sparkles, UserCheck, X, ArrowLeft, Heart, Stethoscope } from 'lucide-react';

const INTRO_STORAGE_KEY = 'wisecare-intro-seen';

export default function IntroManager() {
  const [introComplete, setIntroComplete] = useState<boolean | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [existingPortal, setExistingPortal] = useState<string | null>(null);
  const [existingTherapist, setExistingTherapist] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check for replay or existing intro view
    const params = new URLSearchParams(window.location.search);
    const forceReplay = params.has('replay');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let hasSeen = false;
    try {
      hasSeen = sessionStorage.getItem(INTRO_STORAGE_KEY) === 'true';
    } catch {
      hasSeen = false;
    }

    if (reduceMotion || (!forceReplay && hasSeen)) {
      setIntroComplete(true);
    } else {
      setIntroComplete(false);
      const timer = setTimeout(() => {
        completeIntro();
      }, 4700);
      return () => clearTimeout(timer);
    }

    // 2. Check for active device sessions
    try {
      const lastPortal = localStorage.getItem('wisecare_last_portal');
      if (lastPortal) {
        setExistingPortal(lastPortal);
      }

      const token = localStorage.getItem('wisecare_token');
      const userStr = localStorage.getItem('wisecare_user');
      if (token && userStr) {
        const u = JSON.parse(userStr);
        if (u && (u.role === 'therapist' || u.role === 'superadmin')) {
          setExistingTherapist(u);
        }
      }
    } catch (e) {
      console.warn('Error reading stored session in intro:', e);
    }
  }, []);

  const completeIntro = () => {
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch {}
    setIntroComplete(true);
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

      {/* 2. MAIN ENTRY & ROLE SELECTION VIEW */}
      <main className={`entry-home ${introComplete ? 'is-visible' : ''}`}>
        {/* Ambient SVG shapes */}
        <svg className="intro-ambient intro-ambient--start" viewBox="0 0 330 560" aria-hidden="true">
          <path d="M-20 20C170 40 205 218 53 331C-35 396-12 517 83 590" />
          <path d="M-22 472C67 382 63 267 185 218C190 347 95 410-22 472Z" />
        </svg>
        <svg className="intro-ambient intro-ambient--end" viewBox="0 0 330 560" aria-hidden="true">
          <path d="M350 20C160 40 125 218 277 331C365 396 342 517 247 590" />
          <path d="M352 472C263 382 267 267 145 218C140 347 235 410 352 472Z" />
        </svg>

        <section className="entry-home__content" aria-labelledby="entryTitle">
          {/* Top Header with Brand & Quick Login for Returning Users */}
          <header className="entry-top-nav">
            <div className="entry-brand-header">
              <img className="entry-brand-logo" src="/pwa-icon.svg" alt="Wisecare" />
              <span className="entry-brand-text">Wisecare</span>
            </div>

            {/* Existing User Login Trigger */}
            <button
              type="button"
              className="entry-login-trigger"
              onClick={() => setIsLoginModalOpen(true)}
              title="כניסה ישירה למשתמשים קיימים במערכת"
            >
              <LogIn size={16} />
              <span>כבר יש לך חשבון? התחברות</span>
            </button>
          </header>

          {/* Active Device Session Pill Banner (if detected) */}
          {existingPortal && (
            <div className="entry-resume-banner">
              <div className="entry-resume-banner-text">
                <Sparkles size={18} color="#2563eb" />
                <span>נמצא מרחב אישי פעיל במכשיר זה</span>
              </div>
              <Link
                href={`/portal/${encodeURIComponent(existingPortal)}`}
                className="entry-resume-banner-btn"
              >
                <span>המשך למרחב שלך</span>
                <ArrowLeft size={14} />
              </Link>
            </div>
          )}

          {existingTherapist && !existingPortal && (
            <div className="entry-resume-banner" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderColor: '#bbf7d0' }}>
              <div className="entry-resume-banner-text" style={{ color: '#15803d' }}>
                <Stethoscope size={18} color="#16a34a" />
                <span>מחובר/ת כמטפל/ת: {existingTherapist.name || existingTherapist.username}</span>
              </div>
              <Link
                href={existingTherapist.loginCode ? `/crm/${existingTherapist.loginCode}/clients` : '/login'}
                className="entry-resume-banner-btn"
                style={{ background: '#16a34a' }}
              >
                <span>המשך לקליניקה</span>
                <ArrowLeft size={14} />
              </Link>
            </div>
          )}

          {/* Page Heading */}
          <div className="entry-home__heading">
            <h1 id="entryTitle">
              איך תרצו להשתמש ב־<span lang="en">Wisecare</span>?
            </h1>
            <p>בחרו את המרחב שמתאים לכם וניקח אתכם משם.</p>
          </div>

          {/* Two Main Pathway Cards */}
          <div className="intro-paths" aria-label="בחירת סוג המרחב">
            {/* 1. THERAPIST / CLINIC CARD */}
            <div className="intro-path intro-path--therapist">
              <span className="intro-path__icon" aria-hidden="true">
                <svg viewBox="0 0 80 80" role="img">
                  <circle cx="27" cy="20" r="9" />
                  <circle cx="57" cy="29" r="7" />
                  <path d="M13 56V47c0-11 6-18 14-18s13 6 17 15c3 7 8 11 16 11h7" />
                  <path d="M49 61v-8c0-8 4-14 10-14s10 5 10 13v12" />
                </svg>
              </span>

              <div className="intro-path__content">
                <strong>אני מטפל/ת</strong>
                <span>יש לי מטופלים ואני רוצה לנהל את העבודה הטיפולית שלי במקום אחד.</span>
              </div>

              <div className="intro-path__action-group">
                <Link
                  href="/login"
                  className="intro-path__action"
                  data-role="therapist"
                >
                  <span>כניסה למרחב המטפלים</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m14.5 5-7 7 7 7" />
                  </svg>
                </Link>

                <Link
                  href="/login"
                  className="intro-path__secondary"
                >
                  <span>כבר רשום כמטפל? התחבר כאן</span>
                  <ArrowLeft size={13} />
                </Link>
              </div>
            </div>

            {/* 2. PATIENT / SELF-CARE CARD */}
            <div className="intro-path intro-path--patient">
              <span className="intro-path__icon" aria-hidden="true">
                <svg viewBox="0 0 80 80" role="img">
                  <path d="M40 65S15 45 15 27c0-10 7-16 15-16 5 0 9 3 10 8 2-5 6-8 11-8 8 0 14 6 14 16 0 18-25 38-25 38Z" />
                  <path d="M40 59c0-17 6-28 18-34-1 15-7 26-18 34Z" />
                </svg>
              </span>

              <div className="intro-path__content">
                <strong>אני מטופל/ת</strong>
                <span>אני רוצה מרחב אישי שיעזור לי ללוות ולארגן את התהליך שלי.</span>
              </div>

              <div className="intro-path__action-group">
                <Link
                  href="/join?view=register"
                  className="intro-path__action"
                  data-role="patient"
                >
                  <span>פתיחת מרחב אישי חדש</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m14.5 5-7 7 7 7" />
                  </svg>
                </Link>

                <Link
                  href="/join?view=login"
                  className="intro-path__secondary"
                >
                  <span>כבר יש לך מרחב אישי? התחבר/י</span>
                  <ArrowLeft size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 3. RETURNING USER DIRECT LOGIN MODAL */}
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
