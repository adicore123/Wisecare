"use client";

import React, { useState, useEffect } from 'react';
import { X, Send, UserPlus, MessageSquare, Check, Sparkles, Lock, Eye, EyeOff } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';

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
    sendWhatsAppNow: true
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
        sendWhatsAppNow: true
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

    if (!formData.username.trim()) {
      setError('נא לקבוע שם משתמש עבור הלקוח');
      return;
    }

    if (!formData.password.trim() || formData.password.trim().length < 4) {
      setError('נא לקבוע סיסמה בת 4 תווים לפחות');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
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
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserPlus size={20} />
            </div>
            <div>
              <h3>הוספת לקוח / מטופל חדש</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>פתיחת סביבה טיפולית אישית עם קישור מאובטח</p>
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

            {/* Credentials Row: Username & Password */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={15} color="var(--primary, #0d9488)" /> פרטי גישה ואבטחה למרחב האישי
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  ישמשו את הלקוח לכניסה למרחב
                </span>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>שם משתמש ללקוח *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="למשל: daniel_levi"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                    required
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
                        color: 'var(--primary, #0d9488)',
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
                      required
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
            </div>

            {/* Phone & Age */}
            <div className="form-row">
              <div className="form-group">
                <label>מספר טלפון (וואטסאפ) *</label>
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

            {/* WhatsApp Question Box */}
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
                    <WhatsAppIcon size={18} /> שליחת פרטי גישה וסיסמה אישית ב-WhatsApp
                  </h4>
                  <p>
                    לשלוח מיד ללקוח הודעת וואטסאפ חגיגית עם הקישור למרחב, <strong>שם המשתמש והסיסמה האישית שנקבעו</strong>?
                  </p>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              ביטול
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'פותח סביבה...' : 'שמור ופתח סביבת לקוח'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
