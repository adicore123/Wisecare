'use client';

import React, { useEffect, useState } from 'react';
import { Clock, KeyRound, Music, PenLine, ListTodo, Film, Wind, Brain, CalendarDays, Notebook, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface UsageEvent {
  id: string;
  kind: 'login' | 'module' | 'action';
  module?: string;
  action?: string;
  at: string;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId: string | null;
}

const MODULE_LABELS: Record<string, { label: string; icon: typeof Music }> = {
  tasks: { label: 'משימות ותרגולים', icon: ListTodo },
  content: { label: 'תוכן', icon: Film },
  songs: { label: 'שירים', icon: Music },
  breathing: { label: 'נשימות', icon: Wind },
  knowledge: { label: 'הבנת הנפש', icon: Brain },
  journal: { label: 'יומן תובנות', icon: Notebook },
  appointments: { label: 'תורים', icon: CalendarDays }
};

const ACTION_LABELS: Record<string, { label: string; icon: typeof Music }> = {
  play_song: { label: 'ניגן שיר', icon: Music },
  write_journal: { label: 'כתב מחשבה ביומן', icon: PenLine },
  save_reflection: { label: 'שמר תיעוד אישי על משימה', icon: PenLine }
};

function eventMeta(e: UsageEvent): { icon: React.ElementType; label: string; color: string } {
  if (e.kind === 'login') return { icon: KeyRound, label: 'נכנס למרחב', color: '#059669' };
  if (e.kind === 'action' && e.action && ACTION_LABELS[e.action]) {
    return { icon: ACTION_LABELS[e.action].icon, label: ACTION_LABELS[e.action].label, color: '#7c3aed' };
  }
  const mod = e.module && MODULE_LABELS[e.module];
  if (mod) return { icon: mod.icon, label: `פתח את ${mod.label}`, color: '#0284c7' };
  return { icon: Clock, label: 'פעילות', color: '#64748b' };
}

function formatWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  };
}

/** יומן פעילות מפורט — מה ומתי בדיוק קרה במרחב, מותאם מובייל */
export default function ActivityLogModal({ isOpen, onClose, clientName, clientId }: ActivityLogModalProps) {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && clientId) {
      setLoading(true);
      setError('');
      api.getUsageEvents(clientId)
        .then((res: any) => setEvents(Array.isArray(res) ? res : []))
        .catch((err: any) => setError(err.message || 'שגיאה בטעינה'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  return (
    <div className="song-modal-overlay" style={{ zIndex: 1350 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="song-modal" style={{ maxHeight: '88vh', overflowY: 'auto', maxWidth: '480px' }}>
        <h3>🕐 יומן פעילות — {clientName}</h3>
        <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#94a3b8' }}>
          {events.length > 0 ? `${events.length} האירועים האחרונים — החדשים קודם` : 'היסטוריית פעולות במרחב'}
        </p>

        {loading ? (
          <div className="song-empty" style={{ padding: '30px 0' }}>
            <Loader2 size={26} className="song-mini-spin" />
          </div>
        ) : error ? (
          <div className="song-form-error">{error}</div>
        ) : events.length === 0 ? (
          <div className="song-empty" style={{ padding: '26px 0' }}>
            <Clock size={26} />
            <p>אין עדיין אירועים מתועדים למרחב זה</p>
          </div>
        ) : (
          <div className="activity-log-list">
            {events.map((e) => {
              const meta = eventMeta(e);
              const Icon = meta.icon;
              const when = formatWhen(e.at);
              const today = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const isToday = when.date === today;
              return (
                <div key={e.id} className="activity-log-row">
                  <span className="activity-log-icon" style={{ color: meta.color }}>
                    <Icon size={15} />
                  </span>
                  <span className="activity-log-label">{meta.label}</span>
                  <span className="activity-log-when">
                    {isToday ? <b style={{ color: '#059669' }}>היום</b> : when.date}
                    <span className="activity-log-time">{when.time}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="song-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
