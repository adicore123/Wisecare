import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, X, AlertCircle } from 'lucide-react';
import { api } from '../api';

export default function SuperAdminLoginModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('אנא הזן שם משתמש וסיסמת מנהל');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.login(username.trim(), password.trim());
      if (res.user?.role !== 'superadmin') {
        throw new Error('חשבון זה אינו מוגדר כמנהל מערכת ראשי (SuperAdmin)');
      }
      onSuccess(res.user, res.token);
      setPassword('');
      onClose();
    } catch (err) {
      setError(err.message || 'שם משתמש או סיסמה שגויים. הגישה חסומה.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div 
        className="modal-card" 
        style={{ 
          maxWidth: '440px', 
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          borderRadius: '20px',
          border: '1px solid #e2e8f0'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '30px 28px 20px 28px',
          textAlign: 'center',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)'
          }}>
            <ShieldCheck size={32} />
          </div>

          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
            אימות מנהל ראשי (SuperAdmin)
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
            מתחם ניהול מאובטח • נדרשת סיסמת גישה ייעודית
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px 28px 12px 28px' }}>
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} color="#6366f1" /> שם משתמש SuperAdmin
              </label>
              <input 
                type="text" 
                className="form-control"
                placeholder="adicore123"
                dir="ltr"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={15} color="#6366f1" /> סיסמת אבטחה
              </label>
              <input 
                type="password" 
                className="form-control"
                placeholder="••••••••"
                dir="ltr"
                required
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div style={{
            padding: '16px 28px 24px 28px',
            display: 'flex',
            gap: '10px'
          }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              ביטול
            </button>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{
                flex: 1.6,
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
              }}
            >
              <Lock size={16} />
              <span>{loading ? 'מאמת...' : 'כניסה מאובטחת'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
