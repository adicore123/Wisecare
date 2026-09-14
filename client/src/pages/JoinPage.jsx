import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Video,
  ListTodo,
  Loader2,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  Compass,
  Smile,
  Check,
  MessageCircle
} from 'lucide-react';
import { api } from '../api';
import WhatsAppIcon from '../components/WhatsAppIcon';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

const INTRO_FEATURES = [
  {
    icon: ListTodo,
    color: '#0d9488',
    bgColor: '#f0fdfa',
    borderColor: '#ccfbf1',
    title: 'משימות ותרגולים אישיים',
    desc: 'הגדר/י לעצמך הרגלים יומיים, תרגילי נשימות ויעדים אישיים – בקצב שלך ועם סימון ביצוע מעצים.'
  },
  {
    icon: Video,
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#dbeafe',
    title: 'ספריית סרטונים ומאמרים',
    desc: 'שמור/י קישורים מ-YouTube, Facebook Reels ו-TikTok שעושים לך טוב, וצפה/י בהם במרחב אחד שקט.'
  },
  {
    icon: Calendar,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ede9fe',
    title: 'יומן פגישות ותובנות',
    desc: 'תעד/י מועדי פגישות טיפוליות, רשום/י תובנות ונקודות לשיחה, ועקוב/י אחר מצב הרוח השבועי.'
  },
  {
    icon: ShieldCheck,
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    title: 'פרטיות וביטחון מלא',
    desc: 'מרחב מוגן אך ורק עבורך. מאובטח בשם משתמש וסיסמה מוצפנת, ללא תלות באף גורם חיצוני.'
  }
];

const GOAL_OPTIONS = [
  { id: 'calm', label: 'נשימות, ויסות לחצים ורוגע נפשי', icon: Heart },
  { id: 'habits', label: 'ניהול תרגולים, הרגלים ומשימות יומיומיות', icon: ListTodo },
  { id: 'sessions', label: 'תיעוד פגישות טיפוליות ונקודות לשיחה', icon: Calendar },
  { id: 'content', label: 'שמירת סרטונים ומאמרים שעושים לי טוב', icon: Video }
];

export default function JoinPage() {
  // view: 'intro' | 'register' | 'login' | 'forgot_request' | 'forgot_verify' | 'success'
  const [view, setView] = useState('intro');

  // Registration Form
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    goal: 'calm'
  });

  // Login Form
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });

  // Forgot Password Form
  const [forgotForm, setForgotForm] = useState({
    identifier: '',
    code: '',
    newPassword: '',
    confirmNewPassword: '',
    maskedPhone: '',
    maskedEmail: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Switch views and clear errors
  const switchView = (newView) => {
    setError('');
    setView(newView);
  };

  // --- Handlers ---

  // 1. Submit Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = registerForm.fullName.trim();
    const cleanPhone = registerForm.phone.trim();
    const cleanEmail = registerForm.email.trim();
    const cleanUsername = registerForm.username.trim();
    const cleanPassword = registerForm.password;

    if (!cleanName) {
      setError('נא להזין שם מלא');
      return;
    }
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 9) {
      setError('נא להזין מספר טלפון תקין לקבלת הודעות ב-WhatsApp');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה לשחזור סיסמה');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('שם המשתמש חייב להכיל לפחות 3 תווים');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים לרמת אבטחה תקינה');
      return;
    }
    if (cleanPassword !== registerForm.confirmPassword) {
      setError('אימות הסיסמה אינו תואם לסיסמה שהוזנה');
      return;
    }

    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    setLoading(true);
    try {
      const selectedGoalObj = GOAL_OPTIONS.find(g => g.id === registerForm.goal);
      const res = await api.joinSelfCare({
        firstName,
        lastName,
        phone: cleanPhone,
        email: cleanEmail,
        username: cleanUsername,
        password: cleanPassword,
        goal: selectedGoalObj ? selectedGoalObj.label : registerForm.goal
      });

      if (res?.token) {
        localStorage.setItem('wisecare_portal_token', res.token);
      }
      setCreatedResult(res);
      setView('success');
    } catch (err) {
      setError(err.message || 'אירעה שגיאה ביצירת החשבון. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginForm.identifier.trim() || !loginForm.password) {
      setError('נא למלא שם משתמש (או טלפון/אימייל) וסיסמה');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginSelfCare({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password
      });

      if (res?.token) {
        localStorage.setItem('wisecare_portal_token', res.token);
      }
      if (res?.portalCode) {
        window.location.href = `/portal/${encodeURIComponent(res.portalCode)}`;
      }
    } catch (err) {
      setError(err.message || 'שם משתמש או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  };

  // 3. Request OTP for Forgot Password
  const handleForgotRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!forgotForm.identifier.trim()) {
      setError('נא להזין מספר טלפון, אימייל או שם משתמש');
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestSelfCarePasswordReset({
        identifier: forgotForm.identifier.trim()
      });

      setForgotForm(prev => ({
        ...prev,
        maskedPhone: res.maskedPhone || '',
        maskedEmail: res.maskedEmail || ''
      }));
      setView('forgot_verify');
    } catch (err) {
      setError(err.message || 'שגיאה בשליחת קוד אימות');
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify OTP and Set New Password
  const handleForgotVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!forgotForm.code || forgotForm.code.trim().length !== 6) {
      setError('נא להזין קוד אימות בן 6 ספרות');
      return;
    }
    if (!forgotForm.newPassword || forgotForm.newPassword.length < 8) {
      setError('סיסמה חדשה חייבת להכיל לפחות 8 תווים');
      return;
    }
    if (forgotForm.newPassword !== forgotForm.confirmNewPassword) {
      setError('אימות הסיסמה אינו תואם לסיסמה החדשה');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetSelfCarePassword({
        identifier: forgotForm.identifier.trim(),
        code: forgotForm.code.trim(),
        newPassword: forgotForm.newPassword
      });

      if (res?.token) {
        localStorage.setItem('wisecare_portal_token', res.token);
      }
      if (res?.portalCode) {
        window.location.href = `/portal/${encodeURIComponent(res.portalCode)}`;
      }
    } catch (err) {
      setError(err.message || 'שגיאה באיפוס הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterPortal = () => {
    if (createdResult?.portalCode) {
      window.location.href = `/portal/${encodeURIComponent(createdResult.portalCode)}`;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 10% 10%, rgba(204, 251, 241, 0.6) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(220, 252, 231, 0.5) 0%, transparent 40%), #f8fafc',
      fontFamily: 'var(--font-main, sans-serif)',
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      color: '#0f172a'
    }}>
      {/* Top Brand Pill */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 16px',
        borderRadius: '999px',
        background: '#ffffff',
        border: '1px solid #ccfbf1',
        boxShadow: '0 2px 10px rgba(13, 148, 136, 0.08)',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
          display: 'grid',
          placeItems: 'center',
          color: '#ffffff'
        }}>
          <Sparkles size={13} />
        </div>
        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f766e' }}>WiseCare Self-Care</span>
        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>• מרחב אישי ומאובטח</span>
      </div>

      {/* Main Container Card */}
      <div style={{
        width: '100%',
        maxWidth: view === 'intro' ? '680px' : '560px',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        padding: 'clamp(24px, 5vw, 40px)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'max-width 0.3s ease'
      }}>
        {/* Subtle top accent gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: 'linear-gradient(90deg, #0d9488 0%, #10b981 50%, #14b8a6 100%)'
        }} />

        {/* Global Error Banner */}
        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. INTRO / SHOWCASE VIEW                                                  */}
        {/* ========================================================================= */}
        {view === 'intro' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                background: '#f0fdfa',
                color: '#0d9488',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '12px'
              }}>
                <Smile size={15} />
                <span>הכירו את המרחב האישי שלכם</span>
              </div>
              <h1 style={{
                fontSize: 'clamp(1.7rem, 3.5vw, 2.2rem)',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '10px',
                lineHeight: 1.25
              }}>
                המרחב הטיפולי האישי והשקט שלך 🌱
              </h1>
              <p style={{
                fontSize: '0.98rem',
                color: '#64748b',
                lineHeight: 1.6,
                maxWidth: '520px',
                margin: '0 auto'
              }}>
                מקום בטוח ופרטי משלך לתרגולים, שמירת סרטונים מעצימים, מעקב פגישות וויסות רגשי – בקצב שלך, ללא תלות במטפל חיצוני.
              </p>
            </div>

            {/* 4 Feature Preview Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
              marginBottom: '32px'
            }}>
              {INTRO_FEATURES.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: feat.bgColor,
                      border: `1px solid ${feat.borderColor}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: feat.color,
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      flexShrink: 0
                    }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                        {feat.title}
                      </h3>
                      <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={() => switchView('register')}
                style={{
                  width: '100%',
                  minHeight: '52px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  color: '#ffffff',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>פתח לי מרחב אישי חדש ✨</span>
                <ArrowLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => switchView('login')}
                style={{
                  width: '100%',
                  minHeight: '46px',
                  borderRadius: '14px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <User size={16} />
                <span>כבר יש לך מרחב? התחבר כאן</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. REGISTRATION VIEW                                                      */}
        {/* ========================================================================= */}
        {view === 'register' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => switchView('intro')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <ArrowRight size={16} />
                <span>חזרה לאינטרו</span>
              </button>

              <button
                type="button"
                onClick={() => switchView('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                כבר רשום? התחבר
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                פתיחת מרחב אישי מאובטח 🌱
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                הגדר/י לעצמך שם משתמש וסיסמה אישית לכניסה שקטה ופרטית מכל מכשיר.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '18px' }}>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    שם מלא *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerForm.fullName}
                    onChange={e => setRegisterForm(c => ({ ...c, fullName: e.target.value }))}
                    placeholder="למשל: דניאל לוי"
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    מספר טלפון לקבלת הודעות ב-WhatsApp *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      value={registerForm.phone}
                      onChange={e => setRegisterForm(c => ({ ...c, phone: e.target.value }))}
                      placeholder="050-1234567"
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '10px 42px 10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#25d366', display: 'flex' }}>
                      <WhatsAppIcon size={18} />
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    כתובת אימייל (לשחזור סיסמה) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      dir="ltr"
                      required
                      value={registerForm.email}
                      onChange={e => setRegisterForm(c => ({ ...c, email: e.target.value }))}
                      placeholder="name@example.com"
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '10px 40px 10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Mail size={18} />
                    </span>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    שם משתמש לבחירתך *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      dir="ltr"
                      required
                      value={registerForm.username}
                      onChange={e => setRegisterForm(c => ({ ...c, username: e.target.value }))}
                      placeholder="למשל: daniel_care"
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '10px 40px 10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <User size={18} />
                    </span>
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                      סיסמה (8+ תווים) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        required
                        value={registerForm.password}
                        onChange={e => setRegisterForm(c => ({ ...c, password: e.target.value }))}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          padding: '10px 36px 10px 12px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                      אימות סיסמה *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        dir="ltr"
                        required
                        value={registerForm.confirmPassword}
                        onChange={e => setRegisterForm(c => ({ ...c, confirmPassword: e.target.value }))}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          padding: '10px 36px 10px 12px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Goal Selector */}
                <div style={{ marginTop: '6px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    יעד אישי מועדף
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                    {GOAL_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isSelected = registerForm.goal === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRegisterForm(c => ({ ...c, goal: opt.id }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: isSelected ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                            background: isSelected ? '#f0fdfa' : '#ffffff',
                            color: isSelected ? '#0f766e' : '#475569',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.84rem',
                            textAlign: 'right',
                            cursor: 'pointer'
                          }}
                        >
                          <Icon size={15} color={isSelected ? '#0d9488' : '#94a3b8'} />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Privacy Policy & Terms Agreement */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  borderRadius: '12px',
                  border: '1px solid #bbf7d0',
                  fontSize: '0.82rem',
                  color: '#166534',
                  lineHeight: '1.45'
                }}>
                  <input
                    type="checkbox"
                    id="joinPrivacyCheck"
                    required
                    defaultChecked
                    style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#0d9488', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="joinPrivacyCheck" style={{ cursor: 'pointer' }}>
                    קראתי ואני מאשר/ת את{' '}
                    <button
                      type="button"
                      onClick={() => setIsPrivacyOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#0d9488',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 'inherit'
                      }}
                    >
                      מדיניות הפרטיות ואבטחת המידע
                    </button>
                    . ידוע לי כי המרחב הינו אישי ועצמאי לחלוטין, ואינו משותף עם מטפלים חיצוניים.
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  minHeight: '52px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  color: '#ffffff',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.4)',
                  marginTop: '10px'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>יוצר חשבון מאובטח...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>יצירת מרחב אישי וכניסה מיידית</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. LOGIN VIEW                                                             */}
        {/* ========================================================================= */}
        {view === 'login' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => switchView('intro')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <ArrowRight size={16} />
                <span>חזרה לאינטרו</span>
              </button>

              <button
                type="button"
                onClick={() => switchView('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                מרחב חדש? הירשם כאן
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#f0fdfa',
                color: '#0d9488',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px'
              }}>
                <Lock size={24} />
              </div>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                התחברות למרחב האישי 🔐
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                הזן/י את שם המשתמש, הטלפון או האימייל ואת הסיסמה שלך.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    שם משתמש / אימייל / טלפון
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    required
                    value={loginForm.identifier}
                    onChange={e => setLoginForm(c => ({ ...c, identifier: e.target.value }))}
                    placeholder="daniel_care או 050-1234567"
                    style={{
                      width: '100%',
                      minHeight: '46px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                      סיסמה
                    </label>
                    <button
                      type="button"
                      onClick={() => switchView('forgot_request')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0d9488',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      שכחתי סיסמה?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      required
                      value={loginForm.password}
                      onChange={e => setLoginForm(c => ({ ...c, password: e.target.value }))}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        minHeight: '46px',
                        padding: '10px 40px 10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  minHeight: '52px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  color: '#ffffff',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.4)'
                }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : <Lock size={18} />}
                <span>{loading ? 'מתחבר למרחב...' : 'התחבר למרחב האישי'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. FORGOT PASSWORD - STEP 1 (REQUEST OTP)                                 */}
        {/* ========================================================================= */}
        {view === 'forgot_request' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => switchView('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <ArrowRight size={16} />
                <span>חזרה להתחברות</span>
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#fef3c7',
                color: '#d97706',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px'
              }}>
                <KeyRound size={24} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                איפוס סיסמה מאובטח 🔑
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                הזן/י את מספר הטלפון, האימייל או שם המשתמש שלך. נשלח אליך קוד אימות חד-פעמי (OTP) ב-WhatsApp ובמייל.
              </p>
            </div>

            <form onSubmit={handleForgotRequestSubmit}>
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                  מספר טלפון, אימייל או שם משתמש *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={forgotForm.identifier}
                  onChange={e => setForgotForm(c => ({ ...c, identifier: e.target.value }))}
                  placeholder="050-1234567 או email@domain.com"
                  style={{
                    width: '100%',
                    minHeight: '46px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  minHeight: '50px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.4)'
                }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : <WhatsAppIcon size={18} />}
                <span>{loading ? 'שולח קוד אימות...' : 'שלח קוד אימות ל-WhatsApp'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. FORGOT PASSWORD - STEP 2 (VERIFY OTP & RESET)                          */}
        {/* ========================================================================= */}
        {view === 'forgot_verify' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => switchView('forgot_request')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <ArrowRight size={16} />
                <span>חזרה והזנת פרטים מחדש</span>
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px'
              }}>
                <CheckCircle2 size={26} />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                קוד אימות נשלח אליך! 💬
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                קוד אימות בן 6 ספרות נשלח ל-WhatsApp שלך ({forgotForm.maskedPhone || 'למספר הרשום'}).<br />
                הזן/י את הקוד ובחר/י סיסמה חדשה.
              </p>
            </div>

            <form onSubmit={handleForgotVerifySubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    קוד אימות בן 6 ספרות (OTP) *
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={6}
                    required
                    value={forgotForm.code}
                    onChange={e => setForgotForm(c => ({ ...c, code: e.target.value.replace(/\D/g, '') }))}
                    placeholder="123456"
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '2px solid #0d9488',
                      fontSize: '1.3rem',
                      letterSpacing: '6px',
                      textAlign: 'center',
                      fontWeight: 800,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '4px', display: 'block' }}>
                    הקוד תקף למשך 10 דקות מרגע הבקשה.
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    סיסמה חדשה (לפחות 8 תווים) *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    required
                    value={forgotForm.newPassword}
                    onChange={e => setForgotForm(c => ({ ...c, newPassword: e.target.value }))}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#334155' }}>
                    אימות סיסמה חדשה *
                  </label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    dir="ltr"
                    required
                    value={forgotForm.confirmNewPassword}
                    onChange={e => setForgotForm(c => ({ ...c, confirmNewPassword: e.target.value }))}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  minHeight: '52px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  color: '#ffffff',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.4)'
                }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
                <span>{loading ? 'מאמת ומאפס סיסמה...' : 'איפוס סיסמה וכניסה למרחב'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. SUCCESS VIEW                                                           */}
        {/* ========================================================================= */}
        {view === 'success' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#15803d',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              המרחב המאובטח שלך מוכן! 🌱
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '22px' }}>
              שלום <strong>{createdResult?.client?.firstName}</strong>, יצרנו עבורך מרחב אישי שלם ומוגן.<br />
              שם המשתמש שלך הוא: <strong style={{ color: '#0f766e', direction: 'ltr', display: 'inline-block' }}>{createdResult?.client?.username}</strong>
              <br />
              {createdResult?.whatsappSent ? (
                <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                  <WhatsAppIcon size={16} /> קישור ופרטי התחברות נשלחו אליך ב-WhatsApp!
                </span>
              ) : (
                <span style={{ color: '#64748b' }}>תוכל להיכנס מיד למרחב שלך בלחיצה אחת:</span>
              )}
            </p>

            <div style={{
              background: '#f0fdfa',
              border: '1px solid #ccfbf1',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>
                מה מחכה לך במרחב שלך:
              </div>
              <ul style={{ margin: 0, paddingRight: '20px', color: '#134e4a', fontSize: '0.86rem', lineHeight: 1.7 }}>
                <li><strong>משימות ותרגולים:</strong> הוסף יעדים אישיים וסמן V כשביצעת.</li>
                <li><strong>סרטונים ומאמרים:</strong> שמור לעצמך קישורים מיוטיוב, פייסבוק רילס, טיקטוק ורשתות.</li>
                <li><strong>פגישות:</strong> תעד פגישות טיפוליות והוסף נקודות לשיחה.</li>
                <li><strong>מצב רוח ונשימות:</strong> ויסות רגשי ותרגיל נשימה 4-7-8 מודרך.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleEnterPortal}
              style={{
                width: '100%',
                minHeight: '52px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.4)',
                marginBottom: '12px'
              }}
            >
              <span>כניסה למרחב האישי שלי</span>
              <ArrowLeft size={18} />
            </button>

            <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
              💡 טיפ: תוכל להיכנס בכל שלב בעזרת שם המשתמש והסיסמה שהגדרת!
            </div>
          </div>
        )}
      </div>

      {/* Page Global Footer with Privacy Policy */}
      <footer style={{
        marginTop: '24px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '0.84rem',
        color: '#64748b'
      }}>
        <span>WiseCare Sanctuary 🌿</span>
        <span>•</span>
        <button
          type="button"
          onClick={() => setIsPrivacyOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#0d9488',
            fontWeight: 700,
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
            fontSize: 'inherit'
          }}
        >
          מדיניות פרטיות ואבטחת מידע
        </button>
      </footer>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}
