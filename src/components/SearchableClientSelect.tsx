'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableClient {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string | null;
}

interface SearchableClientSelectProps {
  clients: SearchableClient[];
  value: string;
  onChange: (clientId: string, selected?: SearchableClient) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const fullName = (c: SearchableClient) => `${c.firstName} ${c.lastName ?? ''}`.trim();

/**
 * Combobox for picking a client by name or phone. Replaces the plain <select> +
 * separate search box that large client lists made unusable. Colors follow the
 * dynamic theme (var(--primary) family) so it matches every palette.
 */
export default function SearchableClientSelect({
  clients,
  value,
  onChange,
  placeholder = 'חיפוש לפי שם לקוח או טלפון...',
  required,
  disabled,
}: SearchableClientSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = clients.find(c => c.id === value);

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
    return clients.filter(
      c => fullName(c).toLowerCase().includes(q) || (c.phone ?? '').includes(q)
    );
  }, [clients, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Keep the highlighted option visible while arrowing through the list.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const pick = (client: SearchableClient) => {
    onChange(client.id, client);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      const client = filtered[highlight];
      if (client) pick(client);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const displayValue = open
    ? query
    : selected
      ? `${fullName(selected)}${selected.phone ? ` (${selected.phone})` : ''}`
      : '';

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
              const isSelected = c.id === value;
              const isHighlighted = i === highlight;
              return (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={isSelected}
                  data-index={i}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={e => {
                    e.preventDefault();
                    pick(c);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    background: isSelected
                      ? 'var(--primary-faint)'
                      : isHighlighted
                        ? 'color-mix(in srgb, var(--primary) 6%, white)'
                        : 'transparent',
                    color: isSelected ? 'var(--primary-hover)' : 'var(--text-main)',
                    fontWeight: isSelected ? 700 : 500,
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border-card)' : 'none',
                  }}
                >
                  <span>{fullName(c)}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} dir="ltr">
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
