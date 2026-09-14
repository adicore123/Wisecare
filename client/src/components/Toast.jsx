import React from 'react';
import { AlertCircle, Sparkles, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div 
      className="toast-notice"
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
      style={{
        background: isSuccess ? '#0f172a' : '#991b1b',
        border: `1px solid ${isSuccess ? '#1e293b' : '#b91c1c'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        zIndex: 300
      }}
    >
      {isSuccess ? (
        <Sparkles size={18} color="#2dd4bf" />
      ) : (
        <AlertCircle size={18} color="#fca5a5" />
      )}
      <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>{message}</span>
      {onClose && (
        <button 
          type="button"
          onClick={onClose} 
          className="toast-close-btn"
          aria-label="סגור הודעה"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
