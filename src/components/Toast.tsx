"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';

const EXIT_ANIMATION_MS = 250;

export default function Toast({ message, type = 'success', duration = undefined, onClose }) {
  const [leaving, setLeaving] = useState(false);
  const isSuccess = type === 'success';
  const autoDismissMs = duration ?? (isSuccess ? 2800 : 5000);

  useEffect(() => {
    if (!message) return;
    setLeaving(false);
    const exitTimer = setTimeout(() => setLeaving(true), Math.max(autoDismissMs - EXIT_ANIMATION_MS, 0));
    const removeTimer = setTimeout(() => onClose?.(), autoDismissMs);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [message, type, autoDismissMs, onClose]);

  if (!message) return null;

  const dismissNow = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onClose?.(), EXIT_ANIMATION_MS);
  };

  return (
    <div
      className={`toast-notice${leaving ? ' is-leaving' : ''}`}
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
      onClick={dismissNow}
      title="לחיצה לסגירה"
      style={{
        background: isSuccess ? 'rgba(15, 23, 42, 0.94)' : 'rgba(153, 27, 27, 0.96)',
        border: `1px solid ${isSuccess ? 'rgba(45, 212, 191, 0.25)' : '#b91c1c'}`
      }}
    >
      {isSuccess ? (
        <Sparkles size={16} color="#2dd4bf" style={{ flexShrink: 0 }} />
      ) : (
        <AlertCircle size={16} color="#fca5a5" style={{ flexShrink: 0 }} />
      )}
      <span className="toast-text">{message}</span>
    </div>
  );
}
