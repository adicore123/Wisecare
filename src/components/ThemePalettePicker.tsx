'use client';

import React from 'react';
import { THEME_PALETTES } from '@/lib/theme';

interface ThemePalettePickerProps {
  value: string;
  onChange: (themeId: string) => void;
  /** Optional label rendered above the swatches */
  label?: string;
}

/**
 * Compact palette swatch row for choosing a client portal's own color theme.
 * Kept deliberately small — the full descriptive cards live in SettingsManager.
 */
export default function ThemePalettePicker({ value, onChange, label }: ThemePalettePickerProps) {
  return (
    <div>
      {label && (
        <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {THEME_PALETTES.map(palette => {
          const isSelected = (value || 'sage') === palette.id;
          return (
            <button
              key={palette.id}
              type="button"
              title={`${palette.name} (${palette.englishName})`}
              aria-pressed={isSelected}
              onClick={() => onChange(palette.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '999px',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                background: isSelected ? 'var(--primary-faint)' : 'var(--bg-surface)',
                boxShadow: isSelected ? '0 0 0 3px var(--focus-ring)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span aria-hidden="true" style={{ display: 'inline-flex', gap: '2px' }}>
                <Dot color={palette.colors.primary} />
                <Dot color={palette.colors.accent} />
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 800 : 500, color: 'var(--text-main)' }}>
                {palette.emoji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        border: '1px solid rgba(255,255,255,0.6)',
      }}
    />
  );
}
