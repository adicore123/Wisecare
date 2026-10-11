'use client';

import React from 'react';
import { Mic, Square } from 'lucide-react';
import { DICTATION_UNSUPPORTED_MESSAGE, useDictation } from '@/lib/useDictation';

interface VoiceDictationButtonProps {
  /** Called once for every finalized spoken segment, in spoken order. */
  onText: (chunk: string) => void;
  /** Small gray hint shown next to the button (e.g. the field name). */
  hint?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * Microphone button that dictates Hebrew speech into a parent field via the
 * browser's Web Speech API. Nothing is recorded or stored — only the
 * recognized text is passed to `onText`, which keeps patient audio off any
 * server. Finalized segments are appended by the parent; interim (in-progress)
 * text is previewed in a bubble above the button for live feedback.
 */
export default function VoiceDictationButton({ onText, hint, disabled, style }: VoiceDictationButtonProps) {
  const { supported, listening, interim, error, start, stop } = useDictation(onText);

  const isDisabled = disabled || supported === false;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        disabled={isDisabled}
        aria-label={listening ? 'עצירת הכתבה' : 'הכתבה קולית לשדה זה'}
        aria-pressed={listening}
        title={supported === false ? DICTATION_UNSUPPORTED_MESSAGE : listening ? 'עצירת ההקלטה' : 'הכתבה קולית — לחיצה כדי לדבר'}
        className={listening ? 'voice-dictation-btn is-listening' : 'voice-dictation-btn'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '30px',
          height: '30px',
          padding: 0,
          borderRadius: '50%',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          border: listening ? '1px solid #ef4444' : '1px solid var(--border-light, #cbd5e1)',
          background: listening ? '#ef4444' : 'var(--bg-surface, #fff)',
          color: listening ? '#ffffff' : 'var(--text-muted, #64748b)',
          opacity: isDisabled ? 0.5 : 1,
          boxShadow: 'none',
          ...style
        }}
      >
        {listening ? <Square size={13} strokeWidth={2.5} /> : <Mic size={15} />}
      </button>

      {hint && !listening && !error && (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>
          {hint}
        </span>
      )}

      {(listening || error) && (
        <span
          className="voice-dictation-bubble"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            right: 0,
            zIndex: 80,
            maxWidth: '300px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'var(--bg-surface, #fff)',
            border: error ? '1px solid #fca5a5' : '1px solid var(--border-light, #cbd5e1)',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.16)',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: error ? '#b91c1c' : 'var(--text-main, #0f172a)',
            direction: 'rtl',
            textAlign: 'right',
            whiteSpace: 'normal'
          }}
        >
          {error ? (
            error
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="voice-dictation-dot"
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  flexShrink: 0
                }}
              />
              <span style={{ minWidth: 0 }}>
                {interim || 'מקשיב… דברו עכשיו'}
              </span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
