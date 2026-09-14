"use client";

import React, { useState } from 'react';
import { X, Send, UserPlus, MessageSquare, Check, Sparkles } from 'lucide-react';
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
    age: '',
    gender: 'זכר',
    notes: '',
    sendWhatsAppNow: true // Prompt requested: "המערכת תשאל אם לשלוח את הסיסמה ללקוח או לא בוואטסאפ"
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      setError('אנא מלא את כל שדות החובה: שם פרטי, שם משפחה ומספר טלפון');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
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
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
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
                    <WhatsAppIcon size={18} /> שליחת הודעת פתיחה וסיסמה אישית ב-WhatsApp (Green API)
                  </h4>
                  <p>
                    האם לשלוח מיד ללקוח הודעת וואטסאפ חגיגית עם הקישור הישיר למרחב האישי שלו וקוד הגישה?
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
