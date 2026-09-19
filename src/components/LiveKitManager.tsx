"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Video, VideoOff, PhoneCall, Loader2, CheckCircle2, AlertCircle, Copy,
  KeyRound, History, Users, X, Clock, CalendarClock, Search, CalendarPlus, Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import Toast from './Toast';
import LiveKitCallView, { ActiveCallSession } from './livekit/LiveKitCallView';

type LiveKitStatus = {
  configured: boolean;
  url: string | null;
  missing: string[];
};

type ClientOption = {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  portalCode?: string;
  portalEnabled?: boolean;
  archived?: boolean;
};

type CallRecord = {
  id: string;
  clientName?: string;
  therapistName?: string;
  room?: string;
  startedAt?: string;
  endedAt?: string;
  durationSec?: number | null;
  status?: string;
  startedBy?: string;
};

type ActiveCall = ActiveCallSession & {
  clientName: string;
  joinUrl: string;
};

type ScheduledCall = {
  id: string;
  clientId: string;
  clientName?: string;
  clientHasPortal?: boolean;
  date: string;
  time: string;
  notes?: string;
  status: string;
  createdAt?: string;
};

const authHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wisecare_token') || '' : '';
  return { Authorization: `Bearer ${token}` };
};

const formatCallDuration = (totalSec?: number | null): string => {
  if (!totalSec || totalSec < 0) return '—';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatStartedAt = (iso?: string): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

export default function LiveKitManager() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [status, setStatus] = useState<LiveKitStatus | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  // Scheduled calls
  const [schedules, setSchedules] = useState<ScheduledCall[]>([]);
  const [pendingCall, setPendingCall] = useState<{ id: string; clientName?: string } | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ clientId: '', date: '', time: '', notes: '' });
  const [scheduling, setScheduling] = useState(false);

  // Module views: scheduled table / instant start / call history
  const [activeView, setActiveView] = useState<'scheduled' | 'start' | 'history'>('scheduled');
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');

  const scheduledCount = schedules.filter((s) => s.status === 'scheduled').length;

  /** "היום ב-18:30" / "מחר ב-09:00" / "יום ג' 22/09 ב-14:00" */
  const formatWhen = (date: string, time: string): string => {
    try {
      const d = new Date(`${date}T${time || '00:00'}:00`);
      if (isNaN(d.getTime())) return `${date} ${time}`;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const target = new Date(d); target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
      if (diffDays === 0) return `היום בשעה ${time}`;
      if (diffDays === 1) return `מחר בשעה ${time}`;
      if (diffDays === -1) return `אתמול בשעה ${time}`;
      const label = d.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' });
      return `${label} בשעה ${time}`;
    } catch {
      return `${date} ${time}`;
    }
  };

  const scheduleStatusMeta = (status: string): { label: string; bg: string; color: string } => {
    switch (status) {
      case 'scheduled': return { label: 'מתוכננת', bg: '#fef3c7', color: '#92400e' };
      case 'started': return { label: 'החלה', bg: '#dcfce7', color: '#166534' };
      case 'cancelled': return { label: 'בוטלה', bg: '#fee2e2', color: '#991b1b' };
      case 'missed': return { label: 'לא יצאה', bg: '#f1f5f9', color: '#64748b' };
      default: return { label: status, bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const sortedSchedules = [
    ...schedules.filter((s) => s.status === 'scheduled').sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    ...schedules.filter((s) => s.status !== 'scheduled').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  ];

  const filteredCalls = historyQuery.trim()
    ? calls.filter((c) => (c.clientName || '').includes(historyQuery.trim()))
    : calls;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4200);
  };

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('wisecare_user') : null;
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const parsed = JSON.parse(user);
      if (parsed.role !== 'therapist' && parsed.role !== 'superadmin') {
        window.location.href = '/login';
        return;
      }
      setCurrentUser(parsed);
      // Server is the source of truth — localStorage may hold a stale flag
      fetch('/api/settings/video-calls', { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : { enabled: true }))
        .then((d) => { if (d.enabled === false) setVideoDisabled(true); })
        .catch(() => {});
    } catch {
      window.location.href = '/login';
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/livekit/status', { headers: authHeaders() });
      if (res.ok) setStatus(await res.json());
    } catch { /* keep null */ }
  }, []);

  const loadCalls = useCallback(async () => {
    try {
      const res = await fetch('/api/livekit/calls', { headers: authHeaders() });
      if (res.ok) setCalls(await res.json());
    } catch { /* keep previous */ } finally {
      setLoadingCalls(false);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/livekit/schedule', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
        setPendingCall(data.pendingCall || null);
      }
    } catch { /* keep previous */ }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadStatus();
    loadCalls();
    loadSchedules();
    api.getClients()
      .then((list: ClientOption[]) => setClients((list || []).filter((c) => !c.archived)))
      .catch(() => showToast('שגיאה בטעינת רשימת המטופלים', 'error'));
  }, [currentUser, loadStatus, loadCalls, loadSchedules]);

  // Refresh every 60s — also drives the server-side scheduler tick, so due
  // scheduled calls fire on time while this screen is open
  useEffect(() => {
    if (!currentUser) return undefined;
    const t = window.setInterval(() => {
      loadSchedules();
      loadCalls();
    }, 60000);
    return () => window.clearInterval(t);
  }, [currentUser, loadSchedules, loadCalls]);

  const scheduleCall = async () => {
    if (!scheduleForm.clientId || !scheduleForm.date || !scheduleForm.time) {
      showToast('בחר/י מטופל, תאריך ושעה', 'error');
      return;
    }
    setScheduling(true);
    try {
      const res = await fetch('/api/livekit/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(scheduleForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בקביעת השיחה');
      showToast(data.message || 'השיחה נקבעה', 'success');
      setScheduleForm({ clientId: '', date: '', time: '', notes: '' });
      setScheduleFormOpen(false);
      loadSchedules();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setScheduling(false);
    }
  };

  const cancelSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/livekit/schedule/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בביטול');
      showToast(data.message || 'השיחה בוטלה', 'success');
      loadSchedules();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  /** Hard-deletes a schedule record. For scheduled rows this removes the
      upcoming call entirely — the confirm dialog warns no WhatsApp is sent. */
  const deleteScheduleRecord = async (s: ScheduledCall) => {
    const msg = s.status === 'scheduled'
      ? 'מחיקת הרישום תסיר את השיחה המתוכננת לצמיתות — לא תישלח הודעת ביטול למטופל.\nלהמשיך?'
      : 'למחוק את הרישום מהטבלה?';
    if (typeof window !== 'undefined' && !window.confirm(msg)) return;
    try {
      const res = await fetch(`/api/livekit/schedule/${s.id}?purge=1`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה במחיקה');
      showToast(data.message || 'הרישום נמחק', 'success');
      loadSchedules();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  /** Removes an ended call record from history */
  const deleteCallRecord = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('למחוק את רישום השיחה מההיסטוריה?')) return;
    try {
      const res = await fetch(`/api/livekit/calls/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה במחיקה');
      showToast(data.message || 'רישום השיחה נמחק', 'success');
      loadCalls();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const joinPendingCall = async () => {
    if (!pendingCall) return;
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ callId: pendingCall.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בהצטרפות לשיחה');
      setActiveCall({
        callId: data.callId,
        token: data.token,
        serverUrl: data.url,
        clientName: pendingCall.clientName || '',
        joinUrl: data.joinUrl || ''
      });
      setPendingCall(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const startCall = async () => {
    if (!selectedClientId) {
      showToast('בחר/י מטופל לפני פתיחת השיחה', 'error');
      return;
    }
    setStarting(true);
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ clientId: selectedClientId, sendWhatsApp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בפתיחת השיחה');

      setActiveCall({
        callId: data.callId,
        token: data.token,
        serverUrl: data.url,
        clientName: selectedClient ? `${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim() : '',
        joinUrl: data.joinUrl
      });
      showToast(data.message || 'השיחה נפתחה');
      loadCalls();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setStarting(false);
    }
  };

  const copyJoinLink = async () => {
    if (!activeCall?.joinUrl) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${activeCall.joinUrl}`);
      showToast('קישור ההצטרפות הועתק');
    } catch {
      showToast('העתקה נכשלה — נסה שוב', 'error');
    }
  };

  return (
    <div className="page-content" dir="rtl">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {videoDisabled ? (
        <div className="card" style={{ padding: '48px 28px', textAlign: 'center', maxWidth: '560px', margin: '48px auto' }}>
          <div style={{
            width: 68, height: 68, borderRadius: '18px', margin: '0 auto 18px',
            background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <VideoOff size={32} color="#64748b" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>מודול שיחות הווידאו כבוי</h2>
          <p style={{ color: 'var(--text-secondary, #64748b)', lineHeight: 1.7, marginBottom: '20px' }}>
            שיחות הווידאו הושבתו עבור מרחב זה. המודול אינו מוצג בתפריט, ואינו זמין למטופלים במרחב האישי.
            ניתן להפעיל אותו בחזרה ממסך ההגדרות, תחת "שיחות וידאו".
          </p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.href = `/crm/${currentUser?.loginCode || ''}/settings`}>
            מעבר להגדרות
          </button>
        </div>
      ) : (
      <>

      <div className="page-header" style={{ marginBottom: '22px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Video size={26} /> פגישות וידאו
          </h1>
          <p className="page-subtitle" style={{ marginTop: '6px', color: 'var(--text-secondary, #64748b)', fontSize: '0.95rem' }}>
            שיחות וידאו פרטיות 1-על-1 עם מטופלים — ישירות מהמערכת, בלי לצאת מ-WiseCare
          </p>
        </div>
      </div>

      <style>{`
        .lk-manager-stage { height: 72vh; }
        /* Start-call form: 3 columns on desktop, stacked on phones — the fixed
           grid used to push the start button off-screen on narrow RTL widths */
        .lk-start-form {
          display: grid;
          grid-template-columns: minmax(260px, 2fr) auto auto;
          gap: 14px;
          align-items: end;
        }
        .lk-schedule-form {
          display: grid;
          grid-template-columns: minmax(220px, 2fr) auto auto;
          gap: 12px;
          align-items: end;
        }
        .lk-schedule-form .lk-full-row { grid-column: 1 / -1; }

        /* View tabs */
        .lk-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .lk-tab {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 12px; cursor: pointer;
          border: 1px solid #e2e8f0; background: #ffffff;
          font-weight: 600; font-size: 0.92rem; color: #475569;
          transition: all 0.15s ease; font-family: inherit;
        }
        .lk-tab:hover { border-color: #5eead4; color: #0f766e; }
        .lk-tab.active {
          background: #0d9488; border-color: #0d9488; color: #ffffff;
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.25);
        }
        .lk-tab-badge {
          min-width: 22px; height: 22px; padding: 0 7px; border-radius: 100px;
          background: rgba(13, 148, 136, 0.12); color: #0f766e;
          font-size: 0.78rem; font-weight: 800;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .lk-tab.active .lk-tab-badge { background: rgba(255,255,255,0.22); color: #ffffff; }

        /* Data tables */
        .lk-table-card { padding: 0; overflow: hidden; }
        .lk-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .lk-table thead th {
          text-align: right; padding: 12px 16px; background: #f8fafc;
          color: #64748b; font-size: 0.78rem; font-weight: 700;
          border-bottom: 1px solid #e2e8f0; white-space: nowrap;
        }
        .lk-table tbody td { padding: 13px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .lk-table tbody tr:last-child td { border-bottom: none; }
        .lk-table tbody tr { transition: background 0.12s ease; }
        .lk-table tbody tr:hover { background: #f8fafc; }
        .lk-chip {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.76rem; font-weight: 700; padding: 4px 12px; border-radius: 100px;
          white-space: nowrap;
        }
        .lk-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
        .lk-dot-pulse { animation: lkPulse 1.6s ease infinite; }
        @keyframes lkPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
          50% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
        }

        @media (max-width: 760px) {
          .lk-manager-stage { height: calc(100dvh - 190px); min-height: 420px; }
          .lk-start-form { grid-template-columns: 1fr; gap: 12px; align-items: stretch; }
          .lk-start-form > button { justify-self: stretch; padding: 14px 20px; font-size: 1rem; }
          .lk-schedule-form { grid-template-columns: 1fr; align-items: stretch; }
          .lk-schedule-form > button { justify-self: stretch; }

          .lk-tabs { gap: 6px; }
          .lk-tab { padding: 9px 13px; font-size: 0.85rem; flex: 1 1 auto; justify-content: center; }

          /* Tables become labeled cards on phones */
          .lk-table thead { display: none; }
          .lk-table, .lk-table tbody, .lk-table tr, .lk-table td { display: block; width: 100%; }
          .lk-table tbody tr { border-bottom: 1px solid #e2e8f0; padding: 10px 0; }
          .lk-table tbody tr:last-child { border-bottom: none; }
          .lk-table tbody td {
            display: flex; justify-content: space-between; align-items: center;
            gap: 14px; border-bottom: none; padding: 6px 16px; text-align: left;
          }
          .lk-table tbody td::before {
            content: attr(data-label); font-size: 0.74rem; color: #94a3b8; font-weight: 700; flex-shrink: 0;
          }
        }
      `}</style>

      {/* LiveKit connection status */}
      {status && !status.configured && (
        <div className="card" style={{
          padding: '18px 20px', marginBottom: '20px',
          border: '1px solid rgba(217, 119, 6, 0.35)', background: 'rgba(245, 158, 11, 0.07)',
          borderRadius: '12px', display: 'flex', gap: '14px', alignItems: 'flex-start'
        }}>
          <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.93rem', lineHeight: 1.65 }}>
            <strong>שירות הווידאו (LiveKit) עדיין לא מוגדר.</strong>
            <div style={{ color: 'var(--text-secondary, #64748b)', marginTop: '4px' }}>
              כדי להפעיל שיחות וידאו יש להוסיף את שלוש השורות הבאות לקובץ <code style={{ direction: 'ltr', display: 'inline-block' }}>.env.local</code> שבשורש הפרויקט (המפתחות מתקבלים בקונסול LiveKit Cloud תחת Settings ← API Keys):
            </div>
            <div style={{
              direction: 'ltr', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.85rem',
              background: 'rgba(15, 23, 42, 0.92)', color: '#5eead4',
              padding: '10px 14px', borderRadius: '8px', marginTop: '8px', display: 'inline-block'
            }}>
              {status.missing.map((m) => <div key={m}>{m}=</div>)}
            </div>
            <div style={{ color: 'var(--text-secondary, #64748b)', marginTop: '8px', fontSize: '0.85rem' }}>
              אחרי ההוספה — יש לאתחל את השרת והשיחות יעבדו מיד. עד אז, כל שאר המערכת פועלת כרגיל.
            </div>
          </div>
        </div>
      )}
      {status?.configured && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
          padding: '10px 16px', borderRadius: '100px', width: 'fit-content',
          background: 'rgba(13, 148, 136, 0.1)', border: '1px solid rgba(13, 148, 136, 0.3)',
          fontSize: '0.88rem', color: '#0f766e', fontWeight: 500
        }}>
          <CheckCircle2 size={16} /> שירות הווידאו מחובר ומוכן
        </div>
      )}

      {/* Scheduled call auto-started — waiting for the host */}
      {!activeCall && pendingCall && (
        <div className="card" style={{
          padding: '18px 22px', marginBottom: '20px',
          border: '1.5px solid #f59e0b', background: 'rgba(245, 158, 11, 0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '14px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={24} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.02rem' }}>
                🕒 השיחה המתוכננת עם {pendingCall.clientName || 'המטופל/ת'} החלה
              </div>
              <div style={{ fontSize: '0.85rem', color: '#92400e', marginTop: '2px' }}>
                קישור ההצטרפות נשלח למטופל בוואטסאפ — אפשר להצטרף לשיחה
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={joinPendingCall}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
          >
            <Video size={16} /> הצטרפ/י כעת
          </button>
        </div>
      )}

      {/* Active call view */}
      {activeCall && (
        <div className="card" style={{
          padding: '0', marginBottom: '24px', overflow: 'hidden',
          border: '1px solid rgba(13, 148, 136, 0.25)', borderRadius: '14px'
        }}>
          <div className="lk-manager-stage" style={{ display: 'flex', flexDirection: 'column' }}>
            <LiveKitCallView
              session={{ callId: activeCall.callId, token: activeCall.token, serverUrl: activeCall.serverUrl }}
              role="host"
              title={`שיחת וידאו — ${activeCall.clientName}`}
              subtitle={activeCall.clientName}
              onExited={() => { setActiveCall(null); loadCalls(); }}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            padding: '12px 18px', flexWrap: 'wrap', borderTop: '1px solid rgba(13,148,136,0.15)'
          }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)' }}>
              💡 הקישור המאובטח פועל עבור כל מטופל — גם כזה ללא מרחב אישי — ותקף לשיחה הנוכחית בלבד. המטופל יכול להצטרף דרך הקישור שנשלח אליו בוואטסאפ, או מהמרחב האישי אם יש לו
            </span>
            <button type="button" className="btn btn-secondary" onClick={copyJoinLink}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Copy size={15} /> העתק קישור הצטרפות
            </button>
          </div>
        </div>
      )}

      {/* View tabs */}
      <div className="lk-tabs" role="tablist" aria-label="תצוגות מודול שיחות וידאו">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'scheduled'}
          className={`lk-tab${activeView === 'scheduled' ? ' active' : ''}`}
          onClick={() => setActiveView('scheduled')}
        >
          <CalendarClock size={17} />
          <span>שיחות מתוכננות</span>
          {scheduledCount > 0 && <span className="lk-tab-badge">{scheduledCount}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'start'}
          className={`lk-tab${activeView === 'start' ? ' active' : ''}`}
          onClick={() => setActiveView('start')}
        >
          <PhoneCall size={17} />
          <span>פתיחת שיחה</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'history'}
          className={`lk-tab${activeView === 'history' ? ' active' : ''}`}
          onClick={() => setActiveView('history')}
        >
          <History size={17} />
          <span>היסטוריית שיחות</span>
          {calls.length > 0 && <span className="lk-tab-badge">{calls.length}</span>}
        </button>
      </div>

      {/* ── View: instant call ── */}
      {activeView === 'start' && !activeCall && (
        <div className="card" style={{ padding: '22px 24px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneCall size={20} /> פתיחת שיחה מיידית
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', marginBottom: '16px', lineHeight: 1.6 }}>
            שיחה שמתחילה עכשיו — קישור ההצטרפות נשלח למטופל בוואטסאפ באותו רגע. לשיחה עתידית מתוזמנת עברו ללשונית "שיחות מתוכננות".
          </p>
          <div className="lk-start-form">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>בחירת מטופל</label>
              <select
                className="form-control"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px' }}
              >
                <option value="">— בחר/י מטופל —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.firstName || ''} ${c.lastName || ''}`.trim()}{c.phone ? ` (${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', paddingBottom: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} />
              שליחת קישור בוואטסאפ
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={startCall}
              disabled={starting || !selectedClientId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 26px' }}
            >
              {starting ? <Loader2 size={17} className="animate-spin" /> : <Video size={17} />}
              <span>{starting ? 'פותח שיחה…' : 'התחל שיחה'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── View: scheduled calls ── */}
      {activeView === 'scheduled' && (
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '14px', flexWrap: 'wrap', marginBottom: scheduleFormOpen || scheduledCount === 0 ? '16px' : '18px'
          }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarClock size={20} /> שיחות מתוכננות
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.6, maxWidth: '560px' }}>
                המטופל מקבל מיד אישור בוואטסאפ, תזכורת בבוקר השיחה (07:00), ובמועד שנקבע נשלח אליו אוטומטית קישור הצטרפות — גם אם אין לו מרחב אישי.
              </p>
            </div>
            <button
              type="button"
              className={scheduleFormOpen ? 'btn btn-secondary' : 'btn btn-primary'}
              onClick={() => setScheduleFormOpen((v) => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', flexShrink: 0 }}
            >
              {scheduleFormOpen ? <X size={16} /> : <CalendarPlus size={16} />}
              <span>{scheduleFormOpen ? 'סגירת הטופס' : 'קביעת שיחה חדשה'}</span>
            </button>
          </div>

          {(scheduleFormOpen || scheduledCount === 0) && (
            <form className="lk-schedule-form" onSubmit={(e) => { e.preventDefault(); scheduleCall(); }} style={{
              padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', marginBottom: '18px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>בחירת מטופל</label>
                <select
                  className="form-control"
                  value={scheduleForm.clientId}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, clientId: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px' }}
                >
                  <option value="">— בחר/י מטופל —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${c.firstName || ''} ${c.lastName || ''}`.trim()}
                      {c.portalEnabled !== false ? ' • מרחב אישי' : ' • קליניקה בלבד'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>תאריך</label>
                <input
                  type="date"
                  className="form-control"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
                  style={{ padding: '10px 14px', borderRadius: '10px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>שעה</label>
                <input
                  type="time"
                  className="form-control"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))}
                  style={{ padding: '10px 14px', borderRadius: '10px' }}
                />
              </div>
              <div className="lk-full-row">
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>הערות (לא נשלחות למטופל)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="למשל: מפגש המשך על כלים מהשבוע שעבר"
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))}
                  style={{ padding: '10px 14px', borderRadius: '10px' }}
                />
              </div>
              <div className="lk-full-row">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={scheduling}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 26px', justifySelf: 'start' }}
                >
                  {scheduling ? <Loader2 size={17} className="animate-spin" /> : <CalendarClock size={17} />}
                  <span>{scheduling ? 'קובע/ת…' : 'אישור הקביעה'}</span>
                </button>
              </div>
            </form>
          )}

          {sortedSchedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '16px', margin: '0 auto 14px',
                background: '#f0fdfa', border: '1px solid #99f6e4',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CalendarClock size={28} color="#0d9488" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>עדיין אין שיחות מתוכננות</div>
              <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem', marginBottom: '18px' }}>
                קבע/י שיחה ראשונה למטופל — וכל שאר הדרך (אישור, תזכורת וקישור) תתבצע אוטומטית בוואטסאפ
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setScheduleFormOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}>
                <CalendarPlus size={16} /> קביעת שיחה ראשונה
              </button>
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <table className="lk-table">
                <thead>
                  <tr>
                    <th>מועד השיחה</th>
                    <th>מטופל</th>
                    <th>מרחב</th>
                    <th>סטטוס</th>
                    <th>הערות</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSchedules.map((s) => {
                    const meta = scheduleStatusMeta(s.status);
                    return (
                      <tr key={s.id}>
                        <td data-label="מועד">
                          <span style={{ fontWeight: 600 }}>{formatWhen(s.date, s.time)}</span>
                        </td>
                        <td data-label="מטופל">
                          <span style={{ fontWeight: 600 }}>{s.clientName}</span>
                        </td>
                        <td data-label="מרחב">
                          <span className="lk-chip" style={{
                            background: s.clientHasPortal ? '#f0fdfa' : '#f8fafc',
                            color: s.clientHasPortal ? '#0f766e' : '#64748b'
                          }}>
                            {s.clientHasPortal ? 'מרחב אישי' : 'קליניקה בלבד'}
                          </span>
                        </td>
                        <td data-label="סטטוס">
                          <span className="lk-chip" style={{ background: meta.bg, color: meta.color }}>
                            <span className="lk-dot" style={{ background: meta.color }} />
                            {meta.label}
                          </span>
                        </td>
                        <td data-label="הערות">
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{s.notes || '—'}</span>
                        </td>
                        <td data-label="פעולות">
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {s.status === 'scheduled' && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => cancelSchedule(s.id)}
                                style={{ padding: '6px 14px', fontSize: '0.8rem', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <X size={13} /> ביטול
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-secondary"
                              title={s.status === 'scheduled' ? 'מחיקה לצמיתות (בלי הודעה למטופל)' : 'מחיקת הרישום'}
                              onClick={() => deleteScheduleRecord(s)}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Trash2 size={13} /> מחיקה
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── View: call history ── */}
      {activeView === 'history' && (
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '14px', flexWrap: 'wrap', marginBottom: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} /> היסטוריית שיחות
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.6 }}>
                כל שיחות הווידאו שנערכו במרחב — מיידיות ומתוכננות כאחד
              </p>
            </div>
            {calls.length > 0 && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="חיפוש מטופל…"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  style={{ padding: '9px 34px 9px 14px', borderRadius: '10px', minWidth: '190px' }}
                />
              </div>
            )}
          </div>

          {loadingCalls ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary, #64748b)', padding: '24px 0' }}>
              <Loader2 size={18} className="animate-spin" /> טוען את ההיסטוריה…
            </div>
          ) : calls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '16px', margin: '0 auto 14px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Users size={28} color="#94a3b8" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>עדיין לא נערכו שיחות וידאו</div>
              <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem', marginBottom: '18px' }}>
                אחרי השיחה הראשונה — כל השיחות יתועדו כאן עם משך ומועד מדויקים
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setActiveView('start')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}>
                <PhoneCall size={16} /> פתיחת שיחה ראשונה
              </button>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--text-secondary, #64748b)', fontSize: '0.92rem' }}>
              לא נמצאו שיחות עבור "{historyQuery}"
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <table className="lk-table">
                <thead>
                  <tr>
                    <th>מטופל</th>
                    <th>התחילה</th>
                    <th>משך</th>
                    <th>נפתחה ע"י</th>
                    <th>סטטוס</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.slice(0, 50).map((c) => {
                    const active = c.status === 'active';
                    return (
                      <tr key={c.id}>
                        <td data-label="מטופל">
                          <span style={{ fontWeight: 600 }}>{c.clientName || 'מטופל'}</span>
                        </td>
                        <td data-label="התחילה">
                          <span style={{ fontSize: '0.86rem', color: '#334155' }}>{formatStartedAt(c.startedAt)}</span>
                        </td>
                        <td data-label="משך">
                          <span style={{ fontFamily: 'monospace', fontSize: '0.86rem', color: active ? '#0f766e' : '#475569', fontWeight: 600 }}>
                            {active ? 'מתנהלת…' : formatCallDuration(c.durationSec)}
                          </span>
                        </td>
                        <td data-label={'נפתחה ע"י'}>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            {c.startedBy === 'scheduled' ? '🕐 מתוזמנת' : '⚡ מיידית'}
                          </span>
                        </td>
                        <td data-label="סטטוס">
                          <span className="lk-chip" style={{
                            background: active ? '#dcfce7' : '#f1f5f9',
                            color: active ? '#166534' : '#64748b'
                          }}>
                            <span className={`lk-dot${active ? ' lk-dot-pulse' : ''}`} style={{ background: active ? '#22c55e' : '#94a3b8' }} />
                            {active ? 'פעילה עכשיו' : 'הסתיימה'}
                          </span>
                        </td>
                        <td data-label="פעולות">
                          {!active && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              title="מחיקת רישום השיחה"
                              onClick={() => deleteCallRecord(c.id)}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Trash2 size={13} /> מחיקה
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}
