'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableClient {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

interface SearchableClientSelectProps<T extends SearchableClient> {
  clients: T[];
  value: string;
  onChange: (clientId: string, selected?: T) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Pinned first row that resets to "no client" (onChange('')) — mirrors the old select's empty <option>. */
  clearLabel?: string;
  /** Per-client annotation shown under the name in the list and in the closed value (e.g. "מרחב אישי"). */
  noteFor?: (client: T) => string | undefined;
}

const fullName = (c: SearchableClient) => `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();

const digitsOnly = (s: string) => s.replace(/\D/g, '');

/**
 * Combobox for picking a client by name or phone. Replaces the plain <select> +
 * separate search box that large client lists made unusable. Colors follow the
 * dynamic theme (var(--primary) family) so it matches every palette.
 */
export default function SearchableClientSelect<T extends SearchableClient = SearchableClient>({
  clients,
  value,
  onChange,
  placeholder = 'חיפוש לפי שם לקוח או טלפון...',
  required,
  disabled,
  clearLabel,
  noteFor,
}: SearchableClientSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = clients.find(c => c.id === value);
  const hasClearRow = Boolean(clearLabel);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('touchstart', onDocPointerDown);
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('touchstart', onDocPointerDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const qDigits = digitsOnly(q);
    return clients.filter(c => {
      if (fullName(c).toLowerCase().includes(q)) return true;
      // Digits-only compare so typing/pasting "0501234567" still finds "050-123-4567"
      return Boolean(qDigits) && digitsOnly(c.phone ?? '').includes(qDigits);
    });
  }, [clients, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Keep the highlighted option visible while arrowing through the list.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const closeAndReset = () => {
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const pick = (client: T) => {
    onChange(client.id, client);
    closeAndReset();
  };

  const pickClear = () => {
    onChange('', undefined);
    closeAndReset();
  };

  const rowCount = filtered.length + (hasClearRow ? 1 : 0);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight(h => Math.min(h + 1, rowCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (hasClearRow && highlight === 0) {
        pickClear();
        return;
      }
      const client = filtered[hasClearRow ? highlight - 1 : highlight];
      if (client) pick(client);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const selectedNote = selected && noteFor ? noteFor(selected) : undefined;
  const displayValue = open
    ? query
    : selected
      ? `${fullName(selected)}${selected.phone ? ` (${selected.phone})` : ''}${selectedNote ? ` · ${selectedNote}` : ''}`
      : clearLabel ?? '';

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      {/* Participates in native form validation: empty until a client is picked */}
      <input
        tabIndex={-1}
        autoComplete="off"
        required={required}
        value={value}
        onChange={() => {}}
        style={{ position: 'absolute', opacity: 0, height: 0, width: 0, padding: 0, border: 0 }}
      />
      <input
        ref={inputRef}
        type="text"
        className="form-control"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={placeholder}
        value={displayValue}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) {
            setQuery('');
            setOpen(true);
          }
        }}
        onKeyDown={onKeyDown}
        style={{
          fontSize: '0.88rem',
          cursor: disabled ? 'not-allowed' : 'text',
          background: 'var(--bg-surface)',
        }}
      />

      {open && !disabled && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 0,
            zIndex: 60,
            marginTop: '4px',
            maxHeight: '260px',
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)',
          }}
        >
          {clearLabel && (
            <div
              role="option"
              aria-selected={value === ''}
              data-index={0}
              onMouseEnter={() => setHighlight(0)}
              onMouseDown={e => {
                e.preventDefault();
                pickClear();
              }}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: value === '' ? 'var(--primary-hover)' : 'var(--text-muted)',
                fontWeight: value === '' ? 700 : 500,
                background:
                  value === ''
                    ? 'var(--primary-faint)'
                    : highlight === 0
                      ? 'color-mix(in srgb, var(--primary) 6%, white)'
                      : 'transparent',
                borderBottom: '1px solid var(--border-card)',
              }}
            >
              {clearLabel}
            </div>
          )}
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '14px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              לא נמצאו לקוחות התואמים לחיפוש
            </div>
          ) : (
            filtered.map((c, i) => {
              const index = hasClearRow ? i + 1 : i;
              const isSelected = c.id === value;
              const isHighlighted = index === highlight;
              const note = noteFor ? noteFor(c) : undefined;
              return (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={e => {
                    e.preventDefault();
                    pick(c);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: note ? '8px 14px' : '10px 14px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    background: isSelected
                      ? 'var(--primary-faint)'
                      : isHighlighted
                        ? 'color-mix(in srgb, var(--primary) 6%, white)'
                        : 'transparent',
                    color: isSelected ? 'var(--primary-hover)' : 'var(--text-main)',
                    fontWeight: isSelected ? 700 : 500,
                    borderBottom: index < rowCount - 1 ? '1px solid var(--border-card)' : 'none',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                    <span>{fullName(c)}</span>
                    {note && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        • {note}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }} dir="ltr">
                    {c.phone || 'ללא טלפון'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
