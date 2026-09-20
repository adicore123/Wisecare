"use client";

import React, { useState, useEffect } from 'react';
import { X, Send, UserPlus, MessageSquare, Check, Sparkles, Lock, Eye, EyeOff, Globe, Building2, Info } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import ThemePalettePicker from './ThemePalettePicker';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  therapistName?: string;
  currentTherapist?: any;
}

export default function ClientModal({ isOpen, onClose, onSave, therapistName, currentTherapist }: ClientModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
    password: '',
    age: '',
    gender: 'זכר',
    notes: '',
    sendWhatsAppNow: true,
    portalEnabled: true,
    themeId: 'sage',
    clientSetsCredentials: true // Default: client chooses credentials upon first portal entry
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
  };

  useEffect(() => {
    if (isOpen) {
      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
      let pass = '';
      for (let i = 0; i < 8; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        username: '',
        password: pass,
        age: '',
        gender: 'זכר',
        notes: '',
        sendWhatsAppNow: true,
        portalEnabled: true,
        themeId: 'sage',
        clientSetsCredentials: true
      });
      setError('');
      setShowPassword(false);
    }
  }, [isOpen]);

  // Auto suggest username when name changes if user hasn't typed custom username
  const handleFirstNameChange = (val: string) => {
    const cleanFirst = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      firstName: val,
      username: prev.username && !prev.username.startsWith('client_') && !prev.username.startsWith(cleanFirst) 
        ? prev.username 
        : (cleanFirst ? `${cleanFirst}_${Math.floor(100 + Math.random() * 900)}` : '')
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      setError('אנא מלא את כל שדות החובה: שם פרטי, שם משפחה ומספר טלפון');
      return;
    }

    if (formData.portalEnabled && !formData.clientSetsCredentials) {
      if (!formData.username.trim()) {
        setError('נא לקבוע שם משתמש עבור הלקוח לפתיחת המרחב האישי');
        return;
      }

      if (!formData.password.trim() || formData.password.trim().length < 4) {
        setError('נא לקבוע סיסמה בת 4 תווים לפחות');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        clientSetsCredentials: formData.clientSetsCredentials,
        username: formData.portalEnabled && !formData.clientSetsCredentials ? formData.username.trim() : (formData.username.trim() || undefined),
        password: formData.portalEnabled && !formData.clientSetsCredentials ? formData.password.trim() : undefined,
        sendWhatsAppNow: formData.portalEnabled ? formData.sendWhatsAppNow : false,
        portalEnabled: formData.portalEnabled
      };
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת הלקוח');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: formData.portalEnabled ? 'var(--primary-faint)' : '#f1f5f9',
              color: formData.portalEnabled ? 'var(--primary)' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              {formData.portalEnabled ? <Globe size={20} /> : <Building2 size={20} />}
            </div>
            <div>
              <h3>הוספת לקוח / מטופל חדש</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {formData.portalEnabled 
                  ? 'פתיחת סביבה טיפולית אישית עם קישור מאובטח ומרחב דיגיטלי' 
                  : 'רישום מטופל בקליניקה ללא מרחב דיגיטלי'}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.88rem'
              }}>
                {error}
              </div>
            )}

            {/* Decision Selector: Portal vs Clinic Only */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                בחירת מודל ליווי וסביבת לקוח:
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                {/* Option 1: Personal Portal */}
                <div
                  onClick={() => setFormData(prev => ({ ...prev, portalEnabled: true }))}
                  style={{
                    border: formData.portalEnabled ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                    background: formData.portalEnabled ? 'var(--primary-faint)' : '#ffffff',
                    boxShadow: formData.portalEnabled ? '0 2px 8px color-mix(in srgb, var(--primary) 12%, transparent)' : 'none',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: formData.portalEnabled ? 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Globe size={18} color={formData.portalEnabled ? 'var(--primary)' : '#64748b'} />
                      מרחב אישי (פורטל)
                    </span>
                    <input
                      type="radio"
                      name="portalChoice"
                      checked={formData.portalEnabled}
                      onChange={() => setFormData(prev => ({ ...prev, portalEnabled: true }))}
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                    פתיחת פורטל דיגיטלי ייחודי עם קישור אישי, משימות, יומן תובנות ושאלונים מהבית.
                  </p>
                </div>

                {/* Option 2: Clinic Only */}
                <div
                  onClick={() => setFormData(prev => ({ ...prev, portalEnabled: false, sendWhatsAppNow: false }))}
                  style={{
                    border: !formData.portalEnabled ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                    background: !formData.portalEnabled ? 'var(--primary-faint)' : '#ffffff',
                    boxShadow: !formData.portalEnabled ? '0 2px 8px color-mix(in srgb, var(--primary) 12%, transparent)' : 'none',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: !formData.portalEnabled ? 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Building2 size={18} color={!formData.portalEnabled ? 'var(--primary)' : '#64748b'} />
                      קליניקה בלבד (ללא פורטל)
                    </span>
                    <input
                      type="radio"
                      name="portalChoice"
                      checked={!formData.portalEnabled}
                      onChange={() => setFormData(prev => ({ ...prev, portalEnabled: false, sendWhatsAppNow: false }))}
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                    ניהול תיק מטופל, פגישות והערות בקליניקה בלבד. ללא פרטי גישה (ניתן להפעיל פורטל בכל עת).
                  </p>
                </div>
              </div>
            </div>

            {/* First & Last Name */}
            <div className="form-row">
              <div className="form-group">
                <label>שם פרטי *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="למשל: דניאל"
                  required
                  value={formData.firstName}
                  onChange={e => handleFirstNameChange(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>שם משפחה *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="למשל: לוי"
                  required
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            {/* Phone & Age */}
            <div className="form-row">
              <div className="form-group">
                <label>מספר טלפון {formData.portalEnabled ? '(לשליחת גישה בוואטסאפ) *' : '*'} </label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="050-1234567"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>גיל</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="למשל: 32"
                  min="3"
                  max="120"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
            </div>

            {/* Gender Dropdown */}
            <div className="form-group">
              <label>מין</label>
              <select 
                className="form-control"
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="זכר">זכר</option>
                <option value="נקבה">נקבה</option>
                <option value="אחר">אחר</option>
              </select>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label>הערות טיפוליות ורקע ראשוני</label>
              <textarea 
                className="form-control"
                placeholder="נושאי פנייה מרכזיים, מטרות טיפול, דגשים מיוחדים..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Credentials Row or Clinic-only Info */}
            {formData.portalEnabled ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={15} color="var(--primary, var(--primary))" /> הגדרת פרטי גישה למרחב האישי
                  </span>
                </div>

                {/* Mode Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, clientSetsCredentials: true }))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: formData.clientSetsCredentials ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                      background: formData.clientSetsCredentials ? 'var(--primary-faint)' : '#ffffff',
                      color: formData.clientSetsCredentials ? 'var(--primary-hover)' : '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span>✨ הלקוח יבחר בעצמו (מומלץ)</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b' }}>
                      יקבל קישור ב-WhatsApp ויבחר שם משתמש וסיסמה
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, clientSetsCredentials: false }))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: !formData.clientSetsCredentials ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                      background: !formData.clientSetsCredentials ? 'var(--primary-faint)' : '#ffffff',
                      color: !formData.clientSetsCredentials ? 'var(--primary-hover)' : '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span>🔑 הגדרה ידנית כעת</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b' }}>
                      המטפל קובע שם משתמש וסיסמה מראש
                    </span>
                  </button>
                </div>

                {/* The client portal's own palette — independent of the CRM theme */}
                <div style={{ marginBottom: '14px' }}>
                  <ThemePalettePicker
                    label="🎨 פלטת המרחב האישי של הלקוח"
                    value={formData.themeId || 'sage'}
                    onChange={themeId => setFormData(prev => ({ ...prev, themeId }))}
                  />
                </div>

                {formData.clientSetsCredentials ? (
                  <div style={{
                    background: 'var(--primary-faint)',
                    border: '1px solid var(--primary-light)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.82rem',
                    color: 'var(--primary-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Sparkles size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>
                      הלקוח יקבל קישור כניסה ייחודי ב-WhatsApp, ובכניסתו הראשונה למרחב יקבע לעצמו שם משתמש וסיסמה אישית בקלות. תוכל תמיד לנהל או לאפס את הסיסמה מכרטיס הלקוח.
                    </span>
                  </div>
                ) : (
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>שם משתמש ללקוח *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="למשל: daniel_levi"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                        required={!formData.clientSetsCredentials}
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ margin: 0 }}>סיסמה אישית *</label>
                        <button 
                          type="button" 
                          onClick={generateRandomPassword}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary, var(--primary))',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Sparkles size={12} /> חולל סיסמה 🎲
                        </button>
                      </div>
                      <div style={{ position: 'relative', marginTop: '6px' }}>
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          className="form-control" 
                          placeholder="הזן/י סיסמה (לפחות 4 תווים)"
                          dir="ltr"
                          style={{ textAlign: 'right', paddingLeft: '40px' }}
                          required={!formData.clientSetsCredentials}
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer'
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Info size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', marginBottom: '2px' }}>
                    מטופל קליניקה רגיל (ללא מרחב אישי דיגיטלי)
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
                    הלקוח ינוהל ב-CRM עבור פגישות, תיעוד טיפולי והערות. אין צורך לקבוע שם משתמש וסיסמה, ולא תישלח שום הודעה ללקוח. אם תרצה, תוכל להפעיל עבורו פורטל אישי בכל עת מכרטיס הלקוח בלחיצת כפתור אחת.
                  </p>
                </div>
              </div>
            )}

            {/* WhatsApp Question Box (Only if portal is enabled) */}
            {formData.portalEnabled && (
              <div className="wa-prompt-box">
                <input
                  type="checkbox"
                  id="sendWaCheck"
                  checked={formData.sendWhatsAppNow}
                  onChange={e => setFormData({ ...formData, sendWhatsAppNow: e.target.checked })}
                />
                <div className="wa-prompt-content">
                  <label htmlFor="sendWaCheck" style={{ cursor: 'pointer' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <WhatsAppIcon size={18} /> שליחת הודעת הזמנה וקישור גישה ב-WhatsApp
                    </h4>
                    <p>
                      {formData.clientSetsCredentials
                        ? 'לשלוח מיד ללקוח הודעת וואטסאפ עם קישור אישי להגדרת שם משתמש וסיסמה וכניסה למרחב?'
                        : 'לשלוח מיד ללקוח הודעת וואטסאפ עם קישור למרחב, שם המשתמש והסיסמה שנקבעו?'}
                    </p>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              ביטול
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading 
                ? 'שומר...' 
                : formData.portalEnabled 
                  ? 'שמור ופתח סביבת לקוח' 
                  : 'שמור לקוח בקליניקה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
