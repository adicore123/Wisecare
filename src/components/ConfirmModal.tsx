"use client";

import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  loading?: boolean;
  zIndex?: number;
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onCancel,
  onConfirm, 
  title = 'אישור פעולה', 
  message = 'האם אתה בטוח שברצונך לבצע פעולה זו?', 
  confirmText = 'אישור ומחיקה', 
  cancelText = 'ביטול',
  confirmLabel,
  cancelLabel,
  isDanger = true,
  loading = false,
  zIndex = 1200
}: ConfirmModalProps) {
  const cancelButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeModal = onClose || onCancel;
  const resolvedConfirmText = confirmLabel || confirmText;
  const resolvedCancelText = cancelLabel || cancelText;

  useEffect(() => {
    if (!isOpen) return undefined;
    cancelButtonRef.current?.focus();
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeModal?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeModal} style={{ zIndex }}>
      <div 
        className="modal-card" 
        style={{ maxWidth: '440px', padding: '0', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div style={{ padding: '24px 24px 16px 24px', textAlign: 'center' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: isDanger ? '#fee2e2' : 'var(--primary-faint)',
            color: isDanger ? '#dc2626' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            {isDanger ? <Trash2 size={26} /> : <AlertTriangle size={26} />}
          </div>

          <h3 id={titleId} style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            {title}
          </h3>

          <p id={descriptionId} style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>

        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={closeModal}
            disabled={loading}
            style={{ flex: 1 }}
            ref={cancelButtonRef}
          >
            {resolvedCancelText}
          </button>
          <button 
            type="button" 
            className={isDanger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'מבצע...' : resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
