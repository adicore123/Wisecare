"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Video, PhoneCall, Loader2, CheckCircle2, AlertCircle, Copy,
  KeyRound, History, Users, X
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
};

type ActiveCall = ActiveCallSession & {
  clientName: string;
  joinUrl: string;
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
  const [status, setStatus] = useState<LiveKitStatus | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

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

  useEffect(() => {
    if (!currentUser) return;
    loadStatus();
    loadCalls();
    api.getClients()
      .then((list: ClientOption[]) => setClients((list || []).filter((c) => !c.archived)))
      .catch(() => showToast('שגיאה בטעינת רשימת המטופלים', 'error'));
  }, [currentUser, loadStatus, loadCalls]);

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
    if (!activeCall?.joinUrl && !selectedClient?.portalCode) return;
    const link = activeCall?.joinUrl || `/video-call/${selectedClient?.portalCode}`;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${link}`);
      showToast('קישור ההצטרפות הועתק');
    } catch {
      showToast('העתקה נכשלה — נסה שוב', 'error');
    }
  };

  return (
    <div className="page-content" dir="rtl">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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

      {/* Active call view */}
      {activeCall ? (
        <div className="card" style={{
          padding: '0', marginBottom: '24px', overflow: 'hidden',
          border: '1px solid rgba(13, 148, 136, 0.25)', borderRadius: '14px'
        }}>
          <div style={{ height: '72vh', display: 'flex', flexDirection: 'column' }}>
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
              💡 המטופל יכול להצטרף מהמרחב האישי שלו, או דרך הקישור שנשלח אליו בוואטסאפ
            </span>
            <button type="button" className="btn btn-secondary" onClick={copyJoinLink}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Copy size={15} /> העתק קישור הצטרפות
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '22px 24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneCall size={20} /> פתיחת שיחה חדשה
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 2fr) auto auto', gap: '14px', alignItems: 'end', flexWrap: 'wrap' }}>
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

      {/* Call history */}
      <div className="card" style={{ padding: '22px 24px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={20} /> היסטוריית שיחות
        </h2>
        {loadingCalls ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary, #64748b)', padding: '18px 0' }}>
            <Loader2 size={18} className="animate-spin" /> טוען…
          </div>
        ) : calls.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary, #64748b)', padding: '18px 0' }}>
            <Users size={18} /> עדיין לא נערכו שיחות וידאו
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {calls.slice(0, 15).map((c) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                padding: '12px 16px', borderRadius: '10px', flexWrap: 'wrap',
                background: 'rgba(13, 148, 136, 0.04)', border: '1px solid rgba(13, 148, 136, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: c.status === 'active' ? '#22c55e' : 'rgba(100,116,139,0.5)'
                  }} />
                  <span style={{ fontWeight: 500 }}>{c.clientName || 'מטופל'}</span>
                  {c.status === 'active' && (
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>פעילה עכשיו</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', flexWrap: 'wrap' }}>
                  <span>התחילה: {formatStartedAt(c.startedAt)}</span>
                  <span>משך: {formatCallDuration(c.durationSec)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
