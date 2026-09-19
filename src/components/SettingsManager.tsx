"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Palette, 
  MessageSquare, 
  Phone, 
  Mail, 
  Compass, 
  User, 
  Sparkles, 
  Check, 
  Save, 
  RefreshCw, 
  QrCode, 
  Smartphone, 
  Info, 
  Send,
  HeartHandshake,
  CheckCircle2,
  Calendar,
  Layers,
  Video
} from 'lucide-react';
import { api } from '@/lib/api';
import Toast from './Toast';
import WhatsAppIcon from './WhatsAppIcon';
import { THEME_PALETTES, applyTheme } from '@/lib/theme';

const authHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wisecare_token') || '' : '';
  return { Authorization: `Bearer ${token}` };
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('clinic'); // 'clinic' | 'whatsapp' | 'design'

  const [settings, setSettings] = useState({
    clinicName: 'מרחב טיפולי WiseCare',
    therapistName: 'ד"ר שרה לוי',
    therapistTitle: 'פסיכולוגית קלינית מומחית, מטפלת CBT',
    clinicPhone: '050-1234567',
    clinicEmail: 'clinic@wisecare.health',
    clinicAddress: 'דרך מנחם בגין 144',
    clinicCity: 'תל אביב - יפו',
    clinicFloor: 'קומה 12, משרד 1204',
    clinicArrivalInstructions: 'חניה פנויה בחניון המגדל (שעה ראשונה חינם בהצגת שובר). קוד כניסה לקליניקה: 4545#.',
    clinicDescription: 'קליניקה מוסמכת לטיפול רגשי, CBT ממוקד, ליווי חרדות וצמיחה אישית באווירה מקצועית, מכילה ובטוחה.',
    themeId: 'sage',
    greenApiToken: '',
    greenApiInstanceId: '',
    greenApiUrl: 'https://7107.api.greenapi.com',
    defaultMessageTemplate: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [instanceStatus, setInstanceStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [toast, setToast] = useState(null);

  // Per-therapist video-calls module switch
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [videoSaving, setVideoSaving] = useState(false);

  // Test WhatsApp
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(prev => ({
        ...prev,
        ...data,
        themeId: data.themeId || prev.themeId || 'sage'
      }));

      if (data.themeId) {
        applyTheme(data.themeId);
      }
      checkStatus();

      // Video module preference (per therapist)
      try {
        const videoRes = await fetch('/api/settings/video-calls', { headers: authHeaders() });
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          setVideoEnabled(videoData.enabled !== false);
        }
      } catch { /* default: enabled */ }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQrCode = async () => {
    setLoadingQr(true);
    try {
      const data = await api.getGreenApiQr();
      setQrData(data);
    } catch (err) {
      console.error('Failed to load QR:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const statusRes = await api.checkGreenApiStatus();
      setInstanceStatus(statusRes);
      if (statusRes.status === 'notAuthorized') {
        fetchQrCode();
      }
    } catch (err) {
      setInstanceStatus({ configured: false, status: 'error', message: err.message });
    } finally {
      setCheckingStatus(false);
    }
  };

  const toggleVideoModule = async () => {
    if (videoSaving) return;
    const next = !videoEnabled;
    setVideoSaving(true);
    try {
      const res = await fetch('/api/settings/video-calls', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ enabled: next })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'שגיאה בעדכון ההגדרה');
      }
      setVideoEnabled(next);
      // keep the cached user in sync so the sidebar hides/shows the module right away
      try {
        const stored = JSON.parse(localStorage.getItem('wisecare_user') || '{}');
        stored.videoCallsEnabled = next;
        localStorage.setItem('wisecare_user', JSON.stringify(stored));
      } catch {}
      showToast(
        next
          ? 'מודול שיחות הווידאו הופעל — הוא יופיע בתפריט הניווט'
          : 'מודול שיחות הווידאו כובה — יוסר מהתפריט ולא יוצג למטופלים. רענן/י את הדף לעדכון התפריט',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'שגיאה בעדכון ההגדרה', 'error');
    } finally {
      setVideoSaving(false);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(prev => ({ ...prev, ...updated }));
      setSaveSuccess(true);
      showToast('ההגדרות נשמרו בהצלחה בבסיס הנתונים');
      await checkStatus();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      showToast('שגיאה בשמירת הגדרות: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTheme = (themeId) => {
    setSettings(prev => ({ ...prev, themeId }));
    applyTheme(themeId);
  };

  const handleTestWhatsApp = async (e) => {
    e.preventDefault();
    if (!testPhone) {
      showToast('נא להזין מספר טלפון לבדיקה', 'error');
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await api.testWhatsApp(testPhone);
      setTestResult({ success: true, ...res.result });
      showToast('הודעת בדיקה נשלחה בהצלחה לוואטסאפ!');
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      showToast('שליחת הודעת בדיקה נכשלה', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const currentTheme = THEME_PALETTES.find(p => p.id === (settings.themeId || 'sage')) || THEME_PALETTES[0];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: '12px' }} />
        <div>טוען הגדרות קליניקה ומערכת...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            הגדרות קליניקה ומערכת <Sparkles size={22} color="var(--primary)" />
          </h1>
          <p>ניהול פרטי המרחב הטיפולי, חיבור WhatsApp אוטומטי ובחירת פלטת צבעים מותאמת</p>
        </div>

        {/* Global Save Button in Header */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn btn-primary"
          style={{ minWidth: '140px' }}
        >
          {saving ? (
            <>
              <RefreshCw size={16} className="spin" />
              <span>שומר...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check size={16} />
              <span>נשמר בהצלחה!</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>שמור הגדרות</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="settings-tabs-nav">
        <button
          className={`settings-tab-btn ${activeTab === 'clinic' ? 'active' : ''}`}
          onClick={() => setActiveTab('clinic')}
        >
          <Building2 size={18} />
          <span>פרטי העסק והקליניקה</span>
        </button>

        <button
          className={`settings-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
          onClick={() => setActiveTab('whatsapp')}
        >
          <WhatsAppIcon size={19} />
          <span>WhatsApp ו-Green API</span>
          {instanceStatus?.status === 'authorized' && (
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block'
            }} />
          )}
        </button>

        <button
          className={`settings-tab-btn ${activeTab === 'design' ? 'active' : ''}`}
          onClick={() => setActiveTab('design')}
        >
          <Palette size={18} />
          <span>עיצוב ופלטת צבעים</span>
          <span style={{
            fontSize: '0.75rem',
            background: 'var(--primary)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {currentTheme.name}
          </span>
        </button>
      </div>

      {/* TAB 1: פרטי העסק והקליניקה */}
      {activeTab === 'clinic' && (
        <>
        <div>
          <form onSubmit={handleSaveSettings}>
            {/* Card: Core Clinic Details */}
            <div className="card-table" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>פרופיל הקליניקה והמטפל/ת</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>פרטים אלו יוצגו למטופלים בפורטל ובשליחת הודעות אוטומטיות</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div className="form-group">
                  <label>שם הקליניקה / המרחב הטיפולי</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.clinicName || ''}
                    onChange={e => setSettings({ ...settings, clinicName: e.target.value })}
                    placeholder="למשל: מרחב טיפולי WiseCare"
                  />
                </div>

                <div className="form-group">
                  <label>שם המטפל/ת הראשי/ת</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.therapistName || ''}
                    onChange={e => setSettings({ ...settings, therapistName: e.target.value })}
                    placeholder="למשל: ד״ר שרה לוי"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>תואר מקצועי והתמחות</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.therapistTitle || ''}
                    onChange={e => setSettings({ ...settings, therapistTitle: e.target.value })}
                    placeholder="למשל: פסיכולוגית קלינית מומחית, מטפלת CBT מוסמכת"
                  />
                </div>

                <div className="form-group">
                  <label>טלפון הקליניקה / וואטסאפ לבירורים</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      dir="ltr"
                      value={settings.clinicPhone || ''}
                      onChange={e => setSettings({ ...settings, clinicPhone: e.target.value })}
                      placeholder="050-1234567"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>דוא״ל הקליניקה</label>
                  <input
                    type="email"
                    className="form-control"
                    dir="ltr"
                    value={settings.clinicEmail || ''}
                    onChange={e => setSettings({ ...settings, clinicEmail: e.target.value })}
                    placeholder="clinic@wisecare.health"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>אודות הקליניקה וחזון טיפולי</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={settings.clinicDescription || ''}
                    onChange={e => setSettings({ ...settings, clinicDescription: e.target.value })}
                    placeholder="תיאור קצר של הגישה הטיפולית, למשל: מרחב מכיל ומקצועי לטיפול בחרדות, קשיים רגשיים וצמיחה אישית..."
                  />
                </div>
              </div>
            </div>

            {/* Card: Address & Location */}
            <div className="card-table" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MapPin size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>כתובת הקליניקה והוראות הגעה</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>פרטי המיקום יסייעו למטופלים להגיע בקלות וברוגע למפגש הטיפולי</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div className="form-group">
                  <label>רחוב ומספר בית</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.clinicAddress || ''}
                    onChange={e => setSettings({ ...settings, clinicAddress: e.target.value })}
                    placeholder="למשל: דרך מנחם בגין 144"
                  />
                </div>

                <div className="form-group">
                  <label>עיר</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.clinicCity || ''}
                    onChange={e => setSettings({ ...settings, clinicCity: e.target.value })}
                    placeholder="למשל: תל אביב - יפו"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>קומה / מספר משרד / חדר</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.clinicFloor || ''}
                    onChange={e => setSettings({ ...settings, clinicFloor: e.target.value })}
                    placeholder="למשל: קומה 12, חדר טיפולים 1204"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>הוראות הגעה, חניה וקוד כניסה</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={settings.clinicArrivalInstructions || ''}
                    onChange={e => setSettings({ ...settings, clinicArrivalInstructions: e.target.value })}
                    placeholder="למשל: חניה זמינה בחניון הבניין (שעה ראשונה חינם). אינטרקום בכניסה: 45#, עלייה במעלית ימנית לקומה 12."
                  />
                  <small style={{ color: '#64748b', display: 'block', marginTop: '6px' }}>
                    💡 טיפ: הוראות אלו יכולות להיכלל אוטומטית בהודעות ה-WhatsApp שנשלחות למטופלים חדשים.
                  </small>
                </div>
              </div>
            </div>

            {/* Live Clinic Preview Badge */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '28px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--primary)' }}>
                <Sparkles size={18} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>תצוגה מקדימה של כרטיס הקליניקה למטופל</span>
              </div>

              <div style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '14px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <HeartHandshake size={28} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {settings.clinicName || 'מרחב טיפולי'}
                    </h4>
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                      {settings.therapistName} • {settings.therapistTitle}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="#94a3b8" />
                      <span>{settings.clinicAddress}, {settings.clinicCity} ({settings.clinicFloor})</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'left', minWidth: '140px' }}>
                  <span style={{
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Phone size={13} /> {settings.clinicPhone || '050-1234567'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                {saving ? 'שומר שינויים...' : 'שמור את כל פרטי הקליניקה'}
              </button>
            </div>
          </form>
        </div>

        {/* Video-calls module switch (per therapist) */}
        <div className="card-table" style={{ padding: '28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: videoEnabled ? '#ccfbf1' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Video size={22} color={videoEnabled ? '#0d9488' : '#94a3b8'} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>שיחות וידאו</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '540px', lineHeight: 1.6 }}>
                  שיחות וידאו פרטיות 1-על-1 עם מטופלים דרך המערכת. בעת כיבוי — המודול יוסר מהתפריט שלך,
                  לא ניתן יהיה לפתוח שיחות, והמטופלים לא יראו אותו במרחב האישי.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleVideoModule}
              disabled={videoSaving}
              aria-pressed={videoEnabled}
              title={videoEnabled ? 'לחץ/י לכיבוי המודול' : 'לחץ/י להפעלת המודול'}
              style={{
                width: '64px', height: '34px', borderRadius: '100px', position: 'relative',
                background: videoEnabled ? '#10b981' : '#cbd5e1', border: 'none',
                cursor: videoSaving ? 'wait' : 'pointer', transition: 'background 0.2s ease',
                flexShrink: 0, direction: 'ltr'
              }}
            >
              <span style={{
                position: 'absolute', top: '3px', width: '28px', height: '28px', borderRadius: '50%',
                background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                left: videoEnabled ? '33px' : '3px', transition: 'left 0.2s ease'
              }} />
            </button>
          </div>
        </div>
        </>
      )}

      {/* TAB 2: WhatsApp ו-Green API */}
      {activeTab === 'whatsapp' && (
        <div>
          {/* Live Green API Status Banner */}
          {(() => {
            const isAuth = instanceStatus?.status === 'authorized';
            const isNotAuth = instanceStatus?.status === 'notAuthorized';
            const isConfigured = instanceStatus?.configured;

            const bg = !isConfigured ? '#fffbeb' : isAuth ? '#f0fdf4' : isNotAuth ? '#fefce8' : '#fef2f2';
            const border = !isConfigured ? '#fde68a' : isAuth ? '#bbf7d0' : isNotAuth ? '#fef08a' : '#fecaca';
            const iconBg = !isConfigured ? '#fef3c7' : isAuth ? '#dcfce7' : isNotAuth ? '#fef9c3' : '#fee2e2';
            const iconColor = !isConfigured ? '#b45309' : isAuth ? '#15803d' : isNotAuth ? '#a16207' : '#b91c1c';

            return (
              <div style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: iconBg,
                    color: iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <WhatsAppIcon size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                      סטטוס חיבור WhatsApp: {!isConfigured 
                        ? '⚠️ חסר idInstance' 
                        : isAuth 
                        ? '🟢 מחובר ומסונכרן (Online)' 
                        : isNotAuth 
                        ? '🟡 ממתין לסריקת קוד QR' 
                        : `🔴 ${instanceStatus?.status || 'שגיאת חיבור'}`}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                      {!isConfigured 
                        ? 'יש להזין את ה-idInstance והטוקן מלוח הבקרה של Green API.'
                        : isAuth 
                        ? 'המכשיר מחובר בהצלחה ל-Green API! הודעות ואוטומציות נשלחות ישירות למטופלים.'
                        : isNotAuth 
                        ? 'הקוד ממתין לסריקה באפליקציית WhatsApp במכשירך.'
                        : (instanceStatus?.message || 'ודא שהטוקן ומזהה המופע תואמים ונסה לרענן.')
                      }
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={checkStatus} 
                  disabled={checkingStatus}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} className={checkingStatus ? 'spin' : ''} />
                  <span>{checkingStatus ? 'בודק חיבור...' : 'רענן סטטוס חיבור'}</span>
                </button>
              </div>
            );
          })()}

          {/* QR Code Pairing Card if not authorized */}
          {instanceStatus?.status === 'notAuthorized' && (
            <div style={{
              background: '#ffffff',
              border: '2px solid var(--primary)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 10px 25px -5px var(--primary-glow)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <QrCode size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WhatsAppIcon size={22} /> סריקת קוד QR לחיבור ה-WhatsApp
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: '#64748b' }}>
                    המכשיר מנותק מ-Green API. יש לסרוק את הקוד כדי להפעיל מחדש את שליחת ההודעות האוטומטיות
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '32px',
                flexWrap: 'wrap',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '12px'
              }}>
                {/* QR Image */}
                <div style={{
                  background: '#ffffff',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  minWidth: '220px',
                  minHeight: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {loadingQr ? (
                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>טוען קוד QR עדכני...</div>
                  ) : qrData?.type === 'qrCode' && qrData?.message ? (
                    <img 
                      src={`data:image/png;base64,${qrData.message}`} 
                      alt="WhatsApp QR Code"
                      style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
                    />
                  ) : (
                    <div style={{ color: '#ef4444', fontSize: '0.88rem' }}>
                      {qrData?.message || 'לא ניתן לטעון קוד QR'}
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div style={{ maxWidth: '420px', lineHeight: '1.8' }}>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                    איך מתחברים ב-3 שלבים פשוטים:
                  </h4>
                  <ol style={{ paddingRight: '20px', margin: 0, fontSize: '0.92rem', color: '#334155' }}>
                    <li>פתחו את אפליקציית <strong>WhatsApp</strong> בטלפון הנייד.</li>
                    <li>היכנסו ל-<strong>הגדרות (Settings)</strong> &gt; <strong>מכשירים מקושרים (Linked Devices)</strong>.</li>
                    <li>לחצו על <strong>קשר מכשיר (Link a Device)</strong> וסרקו את קוד ה-QR שמופיע כאן משמאל.</li>
                  </ol>
                  <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={fetchQrCode}
                      disabled={loadingQr}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <RefreshCw size={14} />
                      <span>רענן קוד QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={checkStatus}
                      disabled={checkingStatus}
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <Check size={14} />
                      <span>בדוק חיבור כעת</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test WhatsApp Message Card */}
          <div className="card-table" style={{ padding: '28px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <WhatsAppIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>בדיקת שליחת הודעת WhatsApp</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>שליחת הודעת בדיקה מיידית למספר טלפון כדי לוודא תקינות מלאה</p>
              </div>
            </div>

            <form onSubmit={handleTestWhatsApp} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <input 
                  type="text" 
                  className="form-control"
                  dir="ltr"
                  placeholder="מספר טלפון (למשל: 0521234567)"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={sendingTest}
                className="btn btn-primary"
                style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <WhatsAppIcon size={16} color="#ffffff" />
                <span>{sendingTest ? 'שולח בדיקה...' : 'שלח הודעת בדיקה'}</span>
              </button>
            </form>

            {testResult && (
              <div style={{
                marginTop: '16px',
                padding: '14px',
                borderRadius: '10px',
                background: testResult.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                fontSize: '0.88rem',
                color: testResult.success ? '#166534' : '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {testResult.success ? (
                  <>
                    <CheckCircle2 size={18} color="#16a34a" />
                    <span>הודעת הבדיקה נשלחה בהצלחה! מזהה הודעה: {testResult.idMessage}</span>
                  </>
                ) : (
                  <>
                    <Info size={18} color="#dc2626" />
                    <span>שגיאה בשליחה: {testResult.error}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSaveSettings}>
            {/* Green API Credentials Card */}
            <div className="card-table" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>פרטי החיבור ל-Green API</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>פרטי הגישה למופע ה-WhatsApp הפעיל שלך</p>
                </div>
              </div>

              <div className="form-group">
                <label>Instance ID (מזהה המופע ב-Green API)</label>
                <input 
                  type="text" 
                  className="form-control"
                  dir="ltr"
                  placeholder="למשל: 710722735138"
                  value={settings.greenApiInstanceId || ''}
                  onChange={e => setSettings({ ...settings, greenApiInstanceId: e.target.value })}
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                  מופיע בלוח הבקרה של Green API בראש המופע (idInstance).
                </small>
              </div>

              <div className="form-group">
                <label>API Token Instance (טוקן המופע)</label>
                <input 
                  type="text" 
                  className="form-control"
                  dir="ltr"
                  value={settings.greenApiToken || ''}
                  onChange={e => setSettings({ ...settings, greenApiToken: e.target.value })}
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                  מופיע ב-Green API תחת apiTokenInstance לצד ה-idInstance.
                </small>
              </div>

              <div className="form-group">
                <label>API URL (כתובת השרת ב-Green API)</label>
                <input 
                  type="text" 
                  className="form-control"
                  dir="ltr"
                  placeholder="https://7107.api.greenapi.com"
                  value={settings.greenApiUrl || ''}
                  onChange={e => setSettings({ ...settings, greenApiUrl: e.target.value })}
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                  כתובת שרת ה-API של המופע שלך (למשל: https://7107.api.greenapi.com).
                </small>
              </div>
            </div>

            {/* Message Template Card */}
            <div className="card-table" style={{ padding: '28px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
                תבנית הודעת הפתיחה וההזמנה למטופל
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                הודעה זו תישלח למטופל בעת יצירת תיק חדש או בלחיצה על "שלח קישור WhatsApp".
              </p>

              <div className="form-group">
                <textarea 
                  className="form-control"
                  style={{ minHeight: '150px', lineHeight: 1.6 }}
                  value={settings.defaultMessageTemplate || ''}
                  onChange={e => setSettings({ ...settings, defaultMessageTemplate: e.target.value })}
                />
              </div>

              <div style={{
                background: '#f8fafc',
                padding: '14px 18px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '0.85rem',
                color: '#64748b'
              }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>תגיות דינמיות שיוחלפו אוטומטית בהודעה:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>{`{{firstName}}`}</span>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>{`{{lastName}}`}</span>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>{`{{therapistName}}`}</span>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>{`{{clinicName}}`}</span>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>{`{{portalUrl}}`}</span>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>{`{{pin}}`}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <WhatsAppIcon size={18} color="#ffffff" />
                <span>{saving ? 'שומר שינויים...' : 'שמור הגדרות WhatsApp'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: עיצוב ופלטת צבעים */}
      {activeTab === 'design' && (
        <div>
          <div className="card-table" style={{ padding: '28px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Palette size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>פלטות צבעים טיפוליות למרחב הטיפולי</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  בחרו פלטת צבעים המשרה את התחושה הרצויה בקליניקה שלכם. הצבעים מתעדכנים מיידית בממשק.
                </p>
              </div>
            </div>

            {/* 7 Palettes Grid */}
            <div className="palette-grid">
              {THEME_PALETTES.map((palette) => {
                const isSelected = (settings.themeId || 'sage') === palette.id;
                return (
                  <button
                    type="button"
                    key={palette.id}
                    className={`palette-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectTheme(palette.id)}
                    aria-pressed={isSelected}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="palette-preview-mark" style={{ background: palette.colors.primary }} aria-hidden="true">
                          <Palette size={17} />
                        </span>
                        {isSelected && (
                          <span style={{
                            background: palette.colors.primary,
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check size={14} />
                          </span>
                        )}
                      </div>

                      <h4 style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginTop: '10px',
                        marginBottom: '2px'
                      }}>
                        {palette.name}
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                        {palette.englishName}
                      </div>

                      <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '8px', lineHeight: 1.5 }}>
                        {palette.description}
                      </p>
                    </div>

                    <div className="palette-color-swatches">
                      <div className="palette-swatch" style={{ background: palette.colors.primary }} title="Primary" />
                      <div className="palette-swatch" style={{ background: palette.colors.primaryHover }} title="Hover" />
                      <div className="palette-swatch" style={{ background: palette.colors.primaryLight, border: '1px solid #cbd5e1' }} title="Light" />
                      <div className="palette-swatch" style={{ background: palette.colors.accent }} title="Accent" />
                      <div className="palette-swatch" style={{ background: palette.colors.sidebar }} title="Sidebar" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Interactive Preview */}
            <div style={{
              marginTop: '32px',
              padding: '24px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--primary)' }}>
                <Sparkles size={18} />
                <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>
                  תצוגה מקדימה חיה של אלמנטים עם הפלטה הנבחרת ({currentTheme.name})
                </h4>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {/* Element 1: Buttons */}
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
                    כפתורים ופעולות
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      כפתור ראשי
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      כפתור משני
                    </button>
                    <span style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      תגית קלינית
                    </span>
                  </div>
                </div>

                {/* Element 2: Patient Card Snippet */}
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>
                    כרטיס מטופל לדוגמה
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700
                    }}>
                      י
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>יונתן כהן</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>תרגול CBT פעיל • שלב 3</div>
                    </div>
                  </div>
                </div>

                {/* Element 3: Mini Sidebar Preview */}
                <div style={{
                  background: 'var(--bg-sidebar-gradient)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--sidebar-border)',
                  color: '#ffffff',
                  gridColumn: '1 / -1',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>תצוגה מקדימה של הסייד-בר (Sidebar)</span>
                    <span style={{ color: 'var(--sidebar-active-color)', fontSize: '0.78rem', fontWeight: 700 }}>
                      מותאם לצבעי פלטת {currentTheme.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Mini Brand Icon */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--brand-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px var(--primary-glow)'
                    }}>
                      <HeartHandshake size={20} color="#ffffff" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      WiseCare <Sparkles size={14} color="var(--sidebar-active-color)" />
                    </div>

                    {/* Sample Active Nav Item */}
                    <div style={{
                      marginRight: 'auto',
                      background: 'var(--bg-sidebar-active)',
                      color: 'var(--sidebar-active-color)',
                      borderRight: '3px solid var(--sidebar-active-border)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>תיק לקוחות ומטופלים</span>
                      <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>4</span>
                    </div>

                    {/* Sample Inactive Nav Item */}
                    <div style={{
                      color: '#94a3b8',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 500
                    }}>
                      הגדרות קליניקה ומיתוג
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Theme Button */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                {saving ? 'שומר עיצוב...' : `שמור את פלטת "${currentTheme.name}" כברירת מחדל`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
