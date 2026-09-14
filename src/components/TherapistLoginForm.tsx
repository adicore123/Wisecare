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
  ChevronLeft
} from 'lucide-react';
import { api } from '@/lib/api';
import PrivacyPolicyModal from './PrivacyPolicyModal';

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
          router.push(`/crm/${code}/clients`);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'שם משתמש או סיסמה שגויים');
    } finally {
      setSubmitting(false);
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
              קוד הקישור שהוזן בדפדפן: <strong style={{ color: '#5eead4', fontFamily: 'monospace' }}>{loginCode}</strong>
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
            <span>{loginCode ? 'מרחב כניסה אישי ומאובטח למטפל/ת' : 'מרחב כניסה מורשה למטפלים ולמנהלי מערכת'}</span>
          </div>

          <div className="therapist-login-avatar">
            <div className="therapist-login-avatar-inner">
              <Stethoscope size={38} />
            </div>
          </div>

          <h1 className="therapist-login-title">
            {loginCode ? (workspace?.clinicName || 'קליניקת WiseCare') : 'WiseCare Clinical CRM'}
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
              <span>הזן/הזיני שם משתמש וסיסמה לכניסה למרחב המקצועי</span>
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
                <KeyRound size={16} color="#2dd4bf" />
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
                שם משתמש
              </label>
              <div className="therapist-input-wrapper">
                <span className="therapist-input-icon">
                  <User size={18} />
                </span>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="הזן שם משתמש"
                  required
                  className="therapist-input"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="therapist-field-group">
              <label className="therapist-field-label">
                סיסמה אישית
              </label>
              <div className="therapist-input-wrapper">
                <span className="therapist-input-icon">
                  <Lock size={18} />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הזן סיסמה"
                  required
                  className="therapist-input"
                  autoComplete="current-password"
                  style={{ direction: showPassword ? 'rtl' : 'ltr', textAlign: showPassword ? 'right' : 'left' }}
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
                  style={{ accentColor: '#0d9488', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span>שמור אותי מחובר במכשיר זה</span>
              </label>

              <span style={{ color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
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
                  <span>{loginCode ? 'התחבר למרחב הטיפולי' : 'התחברות למערכת'}</span>
                  <ChevronLeft size={18} />
                </>
              )}
            </button>
          </form>

          {/* Card Footer Security */}
          <div className="therapist-login-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>חיבור מוצפן TLS 256-bit</span>
            </div>
            <span>WiseCare Clinical CRM</span>
          </div>
        </div>

        {/* Privacy Policy & Support Footer */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '8px' }}>
            נתקלת בבעיית התחברות? פנה/י למנהל הקליניקה.
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

        {/* Privacy Policy Modal */}
        <PrivacyPolicyModal 
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />
      </div>
    </div>
  );
}
