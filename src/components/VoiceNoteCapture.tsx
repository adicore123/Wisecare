'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, X, Loader2, CheckCircle2, FileText, CalendarClock, ClipboardList, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { DICTATION_UNSUPPORTED_MESSAGE, useDictation } from '@/lib/useDictation';
import SearchableClientSelect from './SearchableClientSelect';

type CapturePhase = 'idle' | 'listening' | 'routing' | 'saving' | 'saved';
type SaveTarget = 'clientNotes' | 'lastAppointment' | 'newTask';

const TARGET_OPTIONS: { value: SaveTarget; label: string; icon: React.ReactNode }[] = [
  { value: 'clientNotes', label: 'הערות הלקוח (תיק טיפולי)', icon: <FileText size={16} /> },
  { value: 'lastAppointment', label: 'הפגישה האחרונה של הלקוח', icon: <CalendarClock size={16} /> },
  { value: 'newTask', label: 'מטלה חדשה ללקוח', icon: <ClipboardList size={16} /> }
];

const timestampLabel = () =>
  new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());

const taskTitleFrom = (text: string) => {
  const words = text.trim().split(/\s+/).slice(0, 6).join(' ');
  return words.length < text.trim().length ? `${words}…` : words;
};

/**
 * Floating "voice note on the go" button for the CRM (mobile/PWA-first, hidden
 * on desktop): tap, speak, and route the transcribed note to a client's file,
 * their latest appointment, or a new task. Uses the browser's Web Speech API —
 * no audio is ever stored or sent anywhere, only the recognized text.
 */
export default function VoiceNoteCapture({ currentUser }: { currentUser: any }) {
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [clients, setClients] = useState<any[] | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [target, setTarget] = useState<SaveTarget>('clientNotes');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [noSpeech, setNoSpeech] = useState(false);

  const dictation = useDictation(chunk => {
    setTranscript(prev => (prev ? prev.trimEnd() + ' ' + chunk : chunk));
  });

  const clientsRequestedRef = useRef(false);

  // Load the client list the first time the routing dialog is needed.
  useEffect(() => {
    if (phase !== 'routing' || clientsRequestedRef.current) return;
    clientsRequestedRef.current = true;
    api.getClients(currentUser.id)
      .then((cls: any[]) => setClients(Array.isArray(cls) ? cls : []))
      .catch(() => setClients([]));
  }, [phase, currentUser.id]);

  const reset = () => {
    dictation.stop();
    setPhase('idle');
    setTranscript('');
    setSelectedClientId('');
    setTarget('clientNotes');
    setSaveError(null);
    setNoSpeech(false);
  };

  const beginCapture = () => {
    if (dictation.supported === false) {
      setSaveError(DICTATION_UNSUPPORTED_MESSAGE);
      setPhase('routing'); // Show the message inside the dialog — still allows typing.
      return;
    }
    setTranscript('');
    setNoSpeech(false);
    setPhase('listening');
    dictation.start();
  };

  const finishCapture = () => {
    dictation.stop();
    if (!transcript.trim()) {
      // Nothing recognized — bounce back with a gentle hint.
      setNoSpeech(true);
      setPhase('idle');
      setTimeout(() => setNoSpeech(false), 3000);
      return;
    }
    setPhase('routing');
  };

  // Escape closes the routing dialog (recording already stopped at that point).
  useEffect(() => {
    if (phase !== 'routing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const save = async () => {
    const client = clients?.find(c => c.id === selectedClientId);
    if (!client) {
      setSaveError('בחרו לקוח לשיוך התיעוד.');
      return;
    }
    const text = transcript.trim();
    if (!text) {
      setSaveError('הטקסט ריק — אפשר להקליד כאן את התיעוד.');
      return;
    }

    setSaveError(null);
    setPhase('saving');
    const line = `[${timestampLabel()} — פתק קולי] ${text}`;

    try {
      if (target === 'clientNotes') {
        const combined = client.notes ? `${client.notes.trimEnd()}\n\n${line}` : line;
        await api.updateClient(client.id, { notes: combined });
      } else if (target === 'lastAppointment') {
        const apts: any[] = await api.getAppointments({ clientId: client.id });
        const sorted = (Array.isArray(apts) ? apts : [])
          .filter(a => a.status !== 'cancelled' && a.date)
          .sort((a, b) => `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`));
        const today = new Date().toISOString().slice(0, 10);
        const appointment =
          sorted.find(a => a.date <= today) || sorted[0];
        if (!appointment) {
          setSaveError('לא נמצאו פגישות ללקוח זה — אפשר לשייך להערות הלקוח במקום.');
          setPhase('routing');
          return;
        }
        const combined = appointment.notes ? `${appointment.notes.trimEnd()}\n${line}` : line;
        await api.updateAppointment(appointment.id, { notes: combined });
      } else {
        await api.createTask({
          clientId: client.id,
          title: `פתק קולי: ${taskTitleFrom(text)}`,
          description: text
        });
      }
      setPhase('saved');
      setTimeout(reset, 1800);
    } catch (err: any) {
      setSaveError(err?.message || 'שמירת התיעוד נכשלה. נסו שוב.');
      setPhase('routing');
    }
  };

  const showFab = phase === 'idle' || phase === 'listening';

  return (
    <>
      {/* Floating mic — bottom-left, mobile/PWA focused */}
      {showFab && (
        <div className="lg:hidden" style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 55 }}>
          {phase === 'listening' && (
            <div
              className="voice-dictation-bubble"
              style={{
                marginBottom: '10px',
                maxWidth: '300px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'var(--bg-surface, #fff)',
                border: '1px solid var(--border-light, #cbd5e1)',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.16)',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                color: 'var(--text-main, #0f172a)',
                direction: 'rtl',
                maxHeight: '140px',
                overflowY: 'auto'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#b91c1c', fontWeight: 700 }}>
                <span className="voice-dictation-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                מקליט — דברו עכשיו
              </span>
              <span style={{ color: 'var(--text-muted, #64748b)' }}>
                {transcript || dictation.interim || 'מקשיב…'}
              </span>
              {transcript && dictation.interim && (
                <span style={{ color: 'var(--text-muted, #94a3b8)' }}> {dictation.interim}</span>
              )}
            </div>
          )}
          {noSpeech && (
            <div
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                fontSize: '0.8rem',
                color: '#b91c1c',
                direction: 'rtl'
              }}
            >
              לא זוהה דיבור — נסו שוב
            </div>
          )}
          <button
            type="button"
            onClick={phase === 'listening' ? finishCapture : beginCapture}
            aria-label={phase === 'listening' ? 'עצירת ההקלטה ובחירת יעד' : 'פתק קולי חדש'}
            title={phase === 'listening' ? 'עצירה ובחירת יעד' : 'פתק קולי — לחצו ודברו'}
            className={phase === 'listening' ? 'voice-dictation-btn is-listening' : 'voice-dictation-btn'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              cursor: 'pointer',
              border: 'none',
              background: phase === 'listening' ? '#ef4444' : 'var(--primary, #2563eb)',
              color: '#ffffff',
              boxShadow: '0 10px 26px rgba(15, 23, 42, 0.35)'
            }}
          >
            {phase === 'listening' ? <Square size={22} strokeWidth={2.5} /> : <Mic size={26} />}
          </button>
        </div>
      )}

      {/* Routing dialog — "where should this go?" */}
      {(phase === 'routing' || phase === 'saving' || phase === 'saved') && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="שיוך תיעוד קולי"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            direction: 'rtl'
          }}
          onClick={e => {
            if (e.target === e.currentTarget && phase === 'routing') reset();
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '90dvh',
              overflowY: 'auto',
              background: 'var(--bg-surface, #fff)',
              borderRadius: '16px',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)',
              padding: '20px'
            }}
          >
            {phase === 'saved' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '24px 0' }}>
                <CheckCircle2 size={42} color="#16a34a" />
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main, #0f172a)' }}>
                  התיעוד נשמר בהצלחה
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    לאן לשייך את התיעוד הקולי?
                  </h4>
                  <button
                    type="button"
                    onClick={reset}
                    disabled={phase === 'saving'}
                    className="btn-icon"
                    style={{ background: '#f1f5f9' }}
                    aria-label="סגירה"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="form-group">
                  <label>לקוח *</label>
                  {clients === null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted, #64748b)', fontSize: '0.88rem', padding: '8px 0' }}>
                      <Loader2 size={16} className="animate-spin" /> טוען רשימת לקוחות…
                    </div>
                  ) : (
                    <SearchableClientSelect
                      clients={clients}
                      value={selectedClientId}
                      onChange={setSelectedClientId}
                      disabled={phase === 'saving'}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label>יעד השיוך</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {TARGET_OPTIONS.map(option => (
                      <label
                        key={option.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: target === option.value ? '1.5px solid var(--primary, #2563eb)' : '1px solid var(--border-light, #cbd5e1)',
                          background: target === option.value ? 'var(--primary-faint, #eff6ff)' : 'transparent',
                          fontSize: '0.88rem',
                          fontWeight: target === option.value ? 700 : 500,
                          color: 'var(--text-main, #0f172a)'
                        }}
                      >
                        <input
                          type="radio"
                          name="voice-note-target"
                          checked={target === option.value}
                          onChange={() => setTarget(option.value)}
                          disabled={phase === 'saving'}
                        />
                        {option.icon}
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>התיעוד (אפשר לערוך לפני השמירה)</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    disabled={phase === 'saving'}
                    placeholder="הטקסט המתומלל יופיע כאן — אפשר גם להקליד ידנית"
                  />
                </div>

                {saveError && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#b91c1c',
                    fontSize: '0.84rem',
                    marginBottom: '12px'
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    {saveError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={reset} disabled={phase === 'saving'}>
                    ביטול
                  </button>
                  <button type="button" className="btn btn-primary" onClick={save} disabled={phase === 'saving'}>
                    {phase === 'saving' ? <Loader2 size={16} className="animate-spin" /> : 'שמור תיעוד'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
