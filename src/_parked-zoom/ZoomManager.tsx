"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Video, Plus, Copy, Trash2, Loader2, X, PhoneCall, ExternalLink,
  CheckCircle2, AlertCircle, MonitorPlay, CalendarDays, KeyRound, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '@/lib/api';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';

type ZoomApt = {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: string;
  notes?: string;
  zoomMeetingId?: string;
  joinUrl?: string;
  startUrl?: string;
  passcode?: string;
};

type ConnState = {
  connected: boolean;
  connectedMode: 's2s' | 'personal' | 'none';
  connectedEmail?: string;
  s2sConfigured: boolean;
  oauthConfigured: boolean;
  sdkConfigured: boolean;
  isSuperadmin?: boolean;
  callbackUri?: string;
  maskedS2S?: { accountId: string; clientId: string };
};

const todayStr = () => new Date().toISOString().split('T')[0];

const authHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wisecare_token') || '' : '';
  return { Authorization: `Bearer ${token}` };
};

// Field definitions with exact "where to find it" hints for Zoom Marketplace
const S2S_FIELDS = [
  { key: 'zoomAccountId', label: 'Account ID', ph: 'בתוך האפליקציה → App Credentials', where: 'הערך הראשון בכרטיס App Credentials של אפליקציית Server-to-Server OAuth' },
  { key: 'zoomClientId', label: 'Client ID', ph: 'מתחת ל-Account ID', where: 'הערך השני באותו כרטיס' },
  { key: 'zoomClientSecret', label: 'Client Secret', ph: 'לוחצים Eye כדי לראות ומעתיקים', where: 'הערך השלישי — לוחצים על עין כדי לחשוף ומעתיקים' }
];

const SDK_FIELDS = [
  { key: 'zoomSdkKey', label: 'SDK Key', ph: 'מאפליקציית Meeting SDK', where: 'באפליקציית Meeting SDK → כרטיס App Credentials → SDK Key (נקרא גם App Key)' },
  { key: 'zoomSdkSecret', label: 'SDK Secret', ph: 'מתחת ל-SDK Key', where: 'מתחת ל-SDK Key באותו כרטיס' }
];

export default function ZoomManager() {
  const [conn, setConn] = useState<ConnState | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);
  const [meetings, setMeetings] = useState<ZoomApt[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // manual credentials form (superadmin)
  const [form, setForm] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // create form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ clientId: '', date: todayStr(), time: '10:00', durationMinutes: 50, notes: '', sendWhatsApp: true });
  const [isCreating, setIsCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ZoomApt | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [connState, mts, cls] = await Promise.all([
        fetch('/api/zoom/connect', { headers: authHeaders() }).then(r => r.json()).catch(() => null),
        fetch('/api/zoom/meetings', { headers: authHeaders() }).then(r => r.json()).catch(() => []),
        api.getClients()
      ]);
      setConn(connState && !connState.error ? connState : { connected: false, connectedMode: 'none', s2sConfigured: false, oauthConfigured: false, sdkConfigured: false });
      setMeetings(Array.isArray(mts) ? mts : []);
      setClients(Array.isArray(cls) ? cls : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בטעינה', 'error');
    } finally {
      setLoading(false);
      setLoadingConn(false);
    }
  }, []);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('wisecare_user') : null;
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const parsed = JSON.parse(user);
      setCurrentUser(parsed);
      if (parsed.role !== 'therapist' && parsed.role !== 'superadmin') {
        window.location.href = '/login';
        return;
      }
    } catch {
      window.location.href = '/login';
      return;
    }

    const q = new URLSearchParams(window.location.search);
    if (q.get('connected') === '1') showToast('חשבון ה-Zoom חובר בהצלחה! 🎉');
    if (q.get('connect_failed') === '1') showToast('החיבור ל-Zoom לא הושלם — נסה שוב', 'error');

    loadAll();
  }, [loadAll]);

  const handleSaveCredentials = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/zoom/connect', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveSystemConfig', ...form })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'השמירה נכשלה');
      showToast(data.message);
      setForm({});
      await loadAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/zoom/connect', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });
      showToast('החיבור האישי נותק');
      await loadAll();
    } catch {
      showToast('שגיאה בניתוק', 'error');
    }
  };

  const handleCreate = async () => {
    if (!createForm.clientId) return showToast('נא לבחור לקוח', 'error');
    if (!createForm.date || !createForm.time) return showToast('נא לבחור תאריך ושעה', 'error');
    setIsCreating(true);
    try {
      const res = await fetch('/api/zoom/meetings', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (!res.ok && res.status !== 201) throw new Error(data.error || 'יצירת הפגישה נכשלה');
      showToast(data.message || 'פגישת הזום נוצרה!');
      setIsCreateOpen(false);
      setCreateForm({ clientId: '', date: todayStr(), time: '10:00', durationMinutes: 50, notes: '', sendWhatsApp: true });
      await loadAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteAppointment(deleteTarget.id);
      showToast('הפגישה בוטלה ונמחקה גם מ-Zoom');
      await loadAll();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בביטול', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('הקישור הועתק');
    } catch {
      showToast('לא ניתן להעתיק', 'error');
    }
  };

  const sendLinkWhatsApp = async (apt: ZoomApt) => {
    try {
      await api.sendAppointmentReminder(apt.id);
      showToast('הודעה עם הקישור נשלחה ללקוח');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשליחה', 'error');
    }
  };

  const upcoming = meetings.filter(m => `${m.date}T${m.time}` >= `${todayStr()}T00:00`);
  const past = meetings.filter(m => `${m.date}T${m.time}` < `${todayStr()}T00:00`);

  const renderField = (f: { key: string; label: string; ph: string; where: string }) => (
    <label key={f.key} style={{ display: 'block' }}>
      <span style={{ fontWeight: 700, fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>{f.label}</span>
      <input
        className="form-control" type="password" autoComplete="off"
        value={form[f.key] || ''}
        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
        placeholder={f.ph}
      />
      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '3px' }}>📍 {f.where}</span>
    </label>
  );

  const renderMeetingRow = (apt: ZoomApt, isPast = false) => (
    <div key={apt.id} style={{
      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', background: isPast ? '#f8fafc' : '#fff'
    }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
        background: isPast ? '#f1f5f9' : '#eef2ff', color: isPast ? '#94a3b8' : '#4f46e5',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Video size={20} />
      </div>
      <div style={{ flex: 1, minWidth: '190px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{apt.clientName}</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          📅 {new Date(`${apt.date}T${apt.time}`).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {' '}· {apt.durationMinutes} דק׳
          {apt.zoomMeetingId ? ` · חדר: ${apt.zoomMeetingId}` : ' · ללא חדר מקושר'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {apt.zoomMeetingId && !isPast && conn?.sdkConfigured && (
          <a
            href={`/join-meeting/${apt.id}`}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#4f46e5', borderColor: '#4f46e5' }}
          >
            <MonitorPlay size={14} />
            <span>התחל בתוך המערכת</span>
          </a>
        )}
        {apt.joinUrl && (
          <a href={apt.joinUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} title="פתח באפליקציית Zoom">
            <ExternalLink size={14} />
          </a>
        )}
        {apt.joinUrl && (
          <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} title="העתק קישור" onClick={() => copyLink(apt.joinUrl!)}>
            <Copy size={14} />
          </button>
        )}
        {!isPast && apt.clientPhone && (
          <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} title="שלח קישור בוואטסאפ" onClick={() => sendLinkWhatsApp(apt)}>
            <PhoneCall size={14} />
          </button>
        )}
        {!isPast && (
          <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', color: '#ef4444' }} title="ביטול פגישה" onClick={() => setDeleteTarget(apt)}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );

  /* ============ status banner logic ============ */
  const renderStatusCard = () => {
    if (loadingConn) {
      return null;
    }

    if (conn?.connected) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#16a34a',
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '8px 14px', width: 'fit-content'
        }}>
          <CheckCircle2 size={16} />
          <span>Zoom מחובר{conn.connectedMode === 'personal' && conn.connectedEmail ? ` (${conn.connectedEmail})` : ''}</span>
        </div>
      );
    }

    if (conn?.isSuperadmin) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px'
        }}>
          <AlertCircle size={20} color="#d97706" />
          <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem', flex: 1 }}>
            כדי לקבוע פגישות זום יש לחבר פעם אחת את חשבון הזום של הקליניקה — ההגדרה ממתינה למטה בתחתית העמוד.
          </span>
          <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '7px 16px' }} onClick={() => setConfigOpen(true)}>
            <KeyRound size={14} />
            <span>פתח/י הגדרות חיבור</span>
          </button>
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#64748b',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px'
      }}>
        <AlertCircle size={18} color="#94a3b8" />
        <span>מנהל/ת המערכת טרם חיבר/ה את חשבון הזום. פנה/י אליהם להפעלה — נעשה פעם אחת בלבד.</span>
      </div>
    );
  };

  return (
    <div className="page-content">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="page-title-group">
          <span className="eyebrow"><Video size={15} /> פגישות וידאו מהמערכת</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>פגישות זום</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            קבע פגישות זום ללקוחות, שלח קישור בוואטסאפ וקיים שיחות ישירות בתוך המערכת — בלי לצאת מ-WiseCare.
          </p>
        </div>
        <button
          type="button" className="btn btn-primary"
          onClick={() => setIsCreateOpen(true)}
          disabled={!conn?.connected}
          title={conn?.connected ? '' : 'יש לחבר את חשבון הזום תחילה'}
        >
          <Plus size={17} />
          <span>פגישת זום חדשה</span>
        </button>
      </div>

      {/* Slim status line */}
      <div style={{ marginBottom: '16px' }}>
        {renderStatusCard()}
      </div>

      {/* Meetings list */}
      {loading ? (
        <div className="content-empty"><Loader2 className="spin" /><h2>טוען פגישות...</h2></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.05rem', marginBottom: '10px' }}>
              <CalendarDays size={18} color="#4f46e5" /> פגישות קרובות ({upcoming.length})
            </div>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                אין פגישות זום קרובות.{conn?.connected ? ' לחץ "פגישת זום חדשה" כדי לקבוע.' : ''}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcoming.map(m => renderMeetingRow(m))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '10px', color: '#64748b' }}>פגישות שהסתיימו ({past.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {past.slice(0, 15).map(m => renderMeetingRow(m, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual credentials — superadmin only, collapsed at the bottom */}
      {conn?.isSuperadmin && (
        <div className="card" style={{ padding: '16px 18px', marginTop: '26px', background: '#f8fafc', border: '1px dashed #94a3b8' }}>
          <button
            type="button"
            onClick={() => setConfigOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'right', padding: 0 }}
          >
            <KeyRound size={18} color="#64748b" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#64748b', flex: 1, textAlign: 'right' }}>
              הגדרות חיבור Zoom — למנהל בלבד {conn.s2sConfigured ? '(מחובר ✔)' : '(לא מחובר)'}
            </span>
            {configOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
          </button>

          {configOpen && (
            <div style={{ marginTop: '14px' }}>
              {/* Step 1: S2S */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', marginBottom: '4px' }}>
                  שלב 1 · חיבור ישיר לחשבון הזום — חובה ⭐
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px', lineHeight: 1.7 }}>
                  היכנס/י ל-<a href="https://marketplace.zoom.us" target="_blank" rel="noreferrer" style={{ color: '#0369a1', textDecoration: 'underline' }}>marketplace.zoom.us</a> → התחבר/י עם חשבון הזום של הקליניקה →
                  <strong> Develop → Build App</strong> → בחר/י <strong>Server-to-Server OAuth</strong> → תן/י שם ולחצי <strong>Create</strong>.
                  בכרטיס <strong>App Credentials</strong> ימתינו לך שלושת הערכים הבאים:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {S2S_FIELDS.map(renderField)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', marginTop: '10px' }}>
                  ⚠️ חשוב: בכרטיס <strong>Scopes</strong> של אותה אפליקציה לחצי <strong>+ Add Scopes</strong> → Meetings → סמני <strong>meeting:write</strong> → Done.
                  בלי זה היצירה של פגישות תיכשל. ואז בכרטיס Activation לחצי <strong>Activate App</strong>.
                </div>
              </div>

              {/* Step 2: SDK (optional) */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', marginBottom: '4px' }}>
                  שלב 2 · לשיחה בתוך המערכת — אופציונלי
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px', lineHeight: 1.7 }}>
                  באותו אתר: <strong>Develop → Build App</strong> → בחר/י <strong>Meeting SDK</strong> → Create.
                  בכרטיס <strong>App Credentials</strong> יופיעו:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {SDK_FIELDS.map(renderField)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
                  בלי שלב זה המערכת עדיין עובדת מלאה — רק שהפגישות ייפתחו באפליקציית הזום החיצונית במקום בתוך המסך.
                </div>
              </div>

              <button type="button" className="btn btn-primary" onClick={handleSaveCredentials} disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>שמור פרטי חיבור</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}>
          <div className="modal-card" style={{ maxWidth: '480px', width: '94vw', padding: '22px' }} role="dialog" aria-modal="true">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>פגישת זום חדשה</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsCreateOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>לקוח *</span>
                <select
                  className="form-control" value={createForm.clientId}
                  onChange={e => setCreateForm(p => ({ ...p, clientId: e.target.value }))}
                >
                  <option value="">— בחר לקוח —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName || ''}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>תאריך *</span>
                  <input className="form-control" type="date" value={createForm.date} onChange={e => setCreateForm(p => ({ ...p, date: e.target.value }))} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>שעה *</span>
                  <input className="form-control" type="time" value={createForm.time} onChange={e => setCreateForm(p => ({ ...p, time: e.target.value }))} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>משך (דק׳)</span>
                  <input className="form-control" type="number" min={15} max={180} step={5} value={createForm.durationMinutes} onChange={e => setCreateForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} />
                </label>
              </div>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>הערות</span>
                <textarea className="form-control" rows={2} value={createForm.notes} onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={createForm.sendWhatsApp} onChange={e => setCreateForm(p => ({ ...p, sendWhatsApp: e.target.checked }))} />
                שלח אישור עם הקישור בוואטסאפ
              </label>

              <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                <span>{isCreating ? 'יוצר פגישה ב-Zoom...' : 'צור פגישה ושלח קישור'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="ביטול פגישת זום"
          message={`לבטל את פגישת הזום של ${deleteTarget.clientName} בתאריך ${deleteTarget.date} בשעה ${deleteTarget.time}? חדר הזום יימחק גם ב-Zoom.`}
          confirmText="כן, בטל פגישה"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
