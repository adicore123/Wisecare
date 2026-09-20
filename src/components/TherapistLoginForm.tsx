"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  HeartHandshake, 
  KeyRound,
  Stethoscope,
  ChevronLeft,
  X,
  Phone,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import WhatsAppIcon from './WhatsAppIcon';

interface TherapistLoginFormProps {
  loginCode?: string;
  onSuccess?: (user: any, token: string) => void;
}

export default function TherapistLoginForm({ loginCode, onSuccess }: TherapistLoginFormProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState<boolean>(Boolean(loginCode));
  const [loadError, setLoadError] = useState<string>('');

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Forgot Password Modal State
  const [isForgotOpen, setIsForgotOpen] = useState<boolean>(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState<string>('');
  const [forgotCode, setForgotCode] = useState<string>('');
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState<boolean>(false);
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState<string>('');
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string>('');
  const [forgotSuccess, setForgotSuccess] = useState<string>('');

  useEffect(() => {
    if (loginCode) {
      fetchTherapistInfo();
    } else {
      setLoadingInfo(false);
      setWorkspace(null);
    }
  }, [loginCode]);

  const fetchTherapistInfo = async () => {
    try {
      setLoadingInfo(true);
      setLoadError('');
      const data = await api.getTherapistLoginInfo(loginCode);
      setWorkspace(data);
      if (data.username) {
        setUsername(data.username);
      }
    } catch (err: any) {
      setLoadError(err.message || 'קישור הכניסה הייחודי אינו תקין או שאינו קיים במערכת');
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthError('נא למלא שם משתמש וסיסמה');
      return;
    }

    try {
      setSubmitting(true);
      setAuthError('');
      let response: any;
      if (loginCode) {
        response = await api.loginWithCode(loginCode, username.trim(), password);
      } else {
        response = await api.login(username.trim(), password);
      }

      // 1. Role is Patient / Client (Unified Login routing)
      if (response && response.role === 'client') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('wisecare_portal_token', response.token);
          localStorage.setItem('wisecare_last_portal', response.portalCode);
          localStorage.setItem(`wisecare_portal_auth_${response.portalCode}`, 'true');
          if (rememberMe) {
            localStorage.setItem(`wisecare_saved_user_${response.portalCode}`, username.trim());
          }
        }
        router.push(response.redirectUrl || `/portal/${encodeURIComponent(response.portalCode)}`);
        return;
      }

      // 2. Role is Therapist / Staff
      if (response && response.user) {
        if (response.user.role === 'superadmin') {
          setAuthError('גישת מנהל מערכת ראשי (SuperAdmin) מבוצעת אך ורק דרך הכתובת הייעודית המאובטחת: /superadmin');
          return;
        }

        // Store tokens
        if (typeof window !== 'undefined') {
          localStorage.setItem('wisecare_user', JSON.stringify(response.user));
          localStorage.setItem('wisecare_token', response.token);
        }

        if (onSuccess) {
          onSuccess(response.user, response.token);
        } else {
          const code = response.user.loginCode || 'dr-sarah-8821';
          const pendingShareStr = typeof window !== 'undefined' ? localStorage.getItem('wisecare_pending_share') : null;
          if (pendingShareStr) {
            try {
              localStorage.removeItem('wisecare_pending_share');
              const pendingShare = JSON.parse(pendingShareStr);
              const targetUrl = pendingShare.url ? `&url=${encodeURIComponent(pendingShare.url)}` : '';
              const targetTitle = pendingShare.title ? `&title=${encodeURIComponent(pendingShare.title)}` : '';
              const targetText = pendingShare.description ? `&text=${encodeURIComponent(pendingShare.description)}` : '';
              router.push(`/crm/${code}/content?share=1${targetUrl}${targetTitle}${targetText}`);
              return;
            } catch {}
          }
          router.push(response.redirectUrl || `/crm/${code}/clients`);
        }
        return;
      }
    } catch (err: any) {
      setAuthError(err.message || 'שם משתמש או סיסמה שגויים');
    } finally {
      setSubmitting(false);
    }
  };

  // Forgot Password Handlers
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('נא להזין שם משתמש, אימייל או מספר טלפון');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await api.requestSelfCarePasswordReset({
        identifier: forgotIdentifier.trim()
      });
      setForgotMaskedPhone(res.maskedPhone || '');
      setForgotStep('verify');
      setForgotSuccess(res.whatsappSent ? 'קוד אימות בן 6 ספרות נשלח בהצלחה ל-WhatsApp שלך 📲' : 'קוד אימות הופק במערכת');
    } catch (err: any) {
      setForgotError(err.message || 'לא נמצא חשבון תואם לפרטים שהוזנו');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotCode.trim() || forgotCode.trim().length !== 6) {
      setForgotError('נא להזין קוד אימות בן 6 ספרות');
      return;
    }
    if (!forgotNewPassword.trim() || forgotNewPassword.trim().length < 4) {
      setForgotError('הסיסמה החדשה חייבת להכיל לפחות 4 תווים');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('אימות הסיסמה אינו תואם לסיסמה החדשה');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await api.resetSelfCarePassword({
        identifier: forgotIdentifier.trim(),
        code: forgotCode.trim(),
        newPassword: forgotNewPassword.trim()
      });
      if (res?.token) {
        localStorage.setItem('wisecare_portal_token', res.token);
      }
      if (res?.portalCode) {
        localStorage.setItem('wisecare_last_portal', res.portalCode);
        localStorage.setItem(`wisecare_portal_auth_${res.portalCode}`, 'true');
        window.location.replace(`/portal/${encodeURIComponent(res.portalCode)}`);
        return;
      }
      setIsForgotOpen(false);
      setAuthError('');
      alert('הסיסמה אופסה בהצלחה! כעת ניתן להתחבר עם הסיסמה החדשה.');
    } catch (err: any) {
      setForgotError(err.message || 'קוד אימות שגוי או שפג תוקפו');
    } finally {
      setForgotLoading(false);
    }
  };

  // Loading Screen
  if (loadingInfo) {
    return (
      <div className="therapist-login-wrapper">
        <div className="therapist-login-glow-1" />
        <div className="therapist-login-glow-2" />
        <div className="therapist-login-content" style={{ textAlign: 'center' }}>
          <div className="therapist-login-card" style={{ padding: '48px 24px' }}>
            <div className="therapist-login-avatar" style={{ width: '64px', height: '64px' }}>
              <div className="therapist-login-avatar-inner">
                <HeartHandshake size={32} className="spin" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              מאמת קישור כניסה אישי...
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              טוען את נתוני הקליניקה והמרחב הטיפולי המאובטח
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen (Invalid / Expired Link)
  if (loadError) {
    return (
      <div className="therapist-login-wrapper">
        <div className="therapist-login-glow-1" />
        <div className="therapist-login-glow-2" />
        <div className="therapist-login-content">
          <div className="therapist-login-card" style={{ textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <AlertCircle size={32} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
              קישור כניסה לא נמצא
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '20px' }}>
              {loadError}
            </p>

            <div style={{
              background: 'rgba(10, 20, 28, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.84rem',
              color: '#94a3b8',
              marginBottom: '24px'
            }}>
              קוד הקישור שהוזן בדפדפן: <strong style={{ color: 'color-mix(in srgb, var(--primary) 50%, white)', fontFamily: 'monospace' }}>{loginCode}</strong>
              <br />
              וודא/י שהעתקת את הקישור המלא שנשלח אליך ע"י מנהל המערכת.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="therapist-btn-submit"
                style={{ width: '100%' }}
              >
                חזרה למסך הראשי
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Login Screen
  return (
    <div className="therapist-login-wrapper">
      <div className="therapist-login-glow-1" />
      <div className="therapist-login-glow-2" />

      <div className="therapist-login-content">
        {/* Header Branding */}
        <div className="therapist-login-header">
          <div className="therapist-login-badge">
            <ShieldCheck size={16} />
            <span>{loginCode ? 'מרחב כניסה אישי ומאובטח למטפל/ת' : 'מרחב כניסה מאובטח למטפלים ולמטופלים'}</span>
          </div>

          <div className="therapist-login-avatar">
            <div className="therapist-login-avatar-inner">
              {loginCode ? <Stethoscope size={38} /> : <HeartHandshake size={38} />}
            </div>
          </div>

          <h1 className="therapist-login-title">
            {loginCode ? (workspace?.clinicName || 'קליניקת WiseCare') : 'WiseCare'}
          </h1>

          <div className="therapist-login-subtitle">
            {loginCode ? (
              <>
                <span>שלום, </span>
                <strong style={{ color: '#ffffff', fontWeight: 700 }}>
                  {workspace?.name || 'מטפל/ת'}
                </strong>
                {workspace?.title && (
                  <span style={{ fontSize: '0.86rem', color: '#94a3b8' }}>
                    {' '}• {workspace.title}
                  </span>
                )}
              </>
            ) : (
              <span>כניסה למערכת עם שם משתמש, אימייל או מספר טלפון</span>
            )}
          </div>
        </div>

        {/* Login Card */}
        <div className="therapist-login-card">
          <div className="therapist-login-card-strip" />

          {/* Access Code Verification Pill (only shown when entering via unique link) */}
          {loginCode && (
            <div className="therapist-code-indicator">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                <KeyRound size={16} color="color-mix(in srgb, var(--primary) 65%, white)" />
                <span>מזהה מרחב מורשה:</span>
              </div>
              <span className="therapist-code-pill">
                {loginCode}
              </span>
            </div>
          )}

          {/* Auth Error Banner */}
          {authError && (
            <div className="therapist-login-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>שגיאת כניסה:</strong> {authError}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Username Input */}
            <div className="therapist-field-group">
              <label className="therapist-field-label">
                שם משתמש / אימייל / טלפון
              </label>
              <div className="therapist-input-wrapper">
                <span className="therapist-input-icon">
                  <User size={18} />
                </span>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="הזן/י שם משתמש, אימייל או טלפון"
                  required
                  className="therapist-input"
                  autoComplete="username"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="therapist-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="therapist-field-label" style={{ margin: 0 }}>
                  סיסמה אישית
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(true);
                    setForgotStep('request');
                    setForgotError('');
                    setForgotSuccess('');
                    if (username.trim()) setForgotIdentifier(username.trim());
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'color-mix(in srgb, var(--primary) 65%, white)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px'
                  }}
                >
                  שכחת סיסמה?
                </button>
              </div>

              <div className="therapist-input-wrapper">
                <span className="therapist-input-icon">
                  <Lock size={18} />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הזן/י סיסמה"
                  required
                  className="therapist-input"
                  autoComplete="current-password"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="therapist-password-toggle"
                  title={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', fontSize: '0.82rem', color: '#94a3b8' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span>שמור אותי מחובר במכשיר זה</span>
              </label>

              <span style={{ color: 'color-mix(in srgb, var(--primary) 65%, white)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                <Sparkles size={13} />
                כניסה למרחב אישי
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="therapist-btn-submit"
            >
              {submitting ? (
                <>
                  <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%' }} />
                  <span>מאמת פרטים ונכנס למרחב...</span>
                </>
              ) : (
                <>
                  <span>{loginCode ? 'התחבר למרחב הטיפולי' : 'כניסה למערכת 🔐'}</span>
                  <ChevronLeft size={18} />
                </>
              )}
            </button>
          </form>

          {/* Card Footer Security */}
          <div className="therapist-login-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="var(--primary)" />
              <span>חיבור מוצפן TLS 256-bit</span>
            </div>
            <span>WiseCare Clinical & Patient Portal</span>
          </div>
        </div>

        {/* Support & Privacy Policy Footer */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '8px' }}>
            נתקלת בבעיית התחברות? פנה/י למטפל/ת שלך או לקליניקה.
          </p>
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'underline',
              transition: 'color 0.2s'
            }}
          >
            <ShieldCheck size={14} />
            <span>מדיניות פרטיות ואבטחת מידע רפואי</span>
          </button>
        </div>

        {/* Forgot Password Modal */}
        {isForgotOpen && (
          <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setIsForgotOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '440px', background: '#0f172a', border: '1px solid rgba(45, 212, 191, 0.3)', color: '#ffffff' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(45, 212, 191, 0.15)', color: 'color-mix(in srgb, var(--primary) 65%, white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>שחזור ואיפוס סיסמה</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      אימות מהיר ושליחת קוד ל-WhatsApp
                    </p>
                  </div>
                </div>
                <button className="btn-icon" type="button" onClick={() => setIsForgotOpen(false)} style={{ color: '#94a3b8' }}>
                  <X size={18} />
                </button>
              </div>

              {forgotStep === 'request' ? (
                <form onSubmit={handleForgotRequest}>
                  <div className="modal-body" style={{ padding: '20px' }}>
                    {forgotError && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', color: '#fca5a5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '16px' }}>
                      הזן/י את שם המשתמש, כתובת האימייל או מספר הטלפון המשויך לחשבונך. נשלח אליך קוד אימות חד-פעמי ב-WhatsApp.
                    </p>

                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                        שם משתמש / אימייל / טלפון
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        required
                        className="form-control"
                        placeholder="למשל: 050-1234567"
                        style={{ textAlign: 'right', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '12px 14px', borderRadius: '10px' }}
                        value={forgotIdentifier}
                        onChange={e => setForgotIdentifier(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsForgotOpen(false)} style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1', border: 'none' }}>
                      ביטול
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={forgotLoading} style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {forgotLoading ? <Loader2 size={16} className="spin" /> : <WhatsAppIcon size={16} color="#ffffff" />}
                      <span>{forgotLoading ? 'שולח קוד...' : 'שלח קוד אימות ב-WhatsApp 📲'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotReset}>
                  <div className="modal-body" style={{ padding: '20px' }}>
                    {forgotError && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', color: '#fca5a5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        <span>{forgotError}</span>
                      </div>
                    )}
                    {forgotSuccess && (
                      <div style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--primary-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} />
                        <span>{forgotSuccess}</span>
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                        קוד אימות בן 6 ספרות
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        required
                        maxLength={6}
                        className="form-control"
                        placeholder="123456"
                        style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '6px', fontWeight: 700, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '10px', borderRadius: '10px' }}
                        value={forgotCode}
                        onChange={e => setForgotCode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                        סיסמה חדשה
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          dir="ltr"
                          required
                          className="form-control"
                          placeholder="לפחות 4 תווים"
                          style={{ textAlign: 'right', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '10px 14px', paddingLeft: '40px', borderRadius: '10px' }}
                          value={forgotNewPassword}
                          onChange={e => setForgotNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                        אימות סיסמה חדשה
                      </label>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        dir="ltr"
                        required
                        className="form-control"
                        placeholder="הקלד/י שוב את הסיסמה"
                        style={{ textAlign: 'right', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '10px 14px', borderRadius: '10px' }}
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setForgotStep('request')} style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1', border: 'none' }}>
                      חזרה
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={forgotLoading} style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' }}>
                      {forgotLoading ? 'מאפס ונכנס...' : 'אפס סיסמה והיכנס למרחב ✨'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Privacy Policy Modal */}
        <PrivacyPolicyModal 
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />
      </div>
    </div>
  );
}

