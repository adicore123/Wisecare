'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Flower2, Hash, Anchor, Waves, HeartPulse, Activity, Wind, Square, Moon, Hand,
  ArrowLeftRight, Ear, Music, CircleDot, Snowflake, Zap, Sparkles, Flame, BookOpen,
  Play, Pause, RotateCcw, ChevronRight, Info, AlertTriangle, Siren, CheckCircle2,
} from 'lucide-react';
import {
  ACTIVE_TECHNIQUES, REFERENCE_TECHNIQUES, FAMILY_LABELS, FAMILY_DESCRIPTIONS,
  FIRST_AID_TECHNIQUE_ID, MODULE_DISCLAIMER, TECHNIQUE_BY_ID,
  type BreathingFamily, type BreathingTechnique,
} from '@/lib/breathingTechniques';
import { useBreathingSession, formatClock } from '@/lib/useBreathingSession';

type IconCmp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ICONS: Record<string, IconCmp> = {
  Flower2, Hash, Anchor, Waves, HeartPulse, Activity, Wind, Square, Moon, Hand,
  ArrowLeftRight, Ear, Music, CircleDot, Snowflake, Zap, Sparkles, Flame, BookOpen,
};

const FAMILY_ORDER: BreathingFamily[] = ['observation', 'slow', 'pranayama', 'clinical'];

interface BreathingPrefs {
  techniqueId?: string;
  goalIdx?: number;
  paceIdx?: number;
}

export default function BreathingModule({ portalCode }: { portalCode: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goalIdx, setGoalIdx] = useState(0);
  const [paceIdx, setPaceIdx] = useState(0);
  const [showReference, setShowReference] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const prefsRef = useRef<BreathingPrefs>({});
  const confettiFiredRef = useRef(false);

  const technique = selectedId ? TECHNIQUE_BY_ID.get(selectedId) ?? null : null;

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const raw = localStorage.getItem(`wisecare_breathing_${portalCode}`);
      if (raw) prefsRef.current = JSON.parse(raw) || {};
    } catch {}
  }, [portalCode]);

  const savePrefs = (p: BreathingPrefs) => {
    prefsRef.current = { ...prefsRef.current, ...p };
    try {
      localStorage.setItem(`wisecare_breathing_${portalCode}`, JSON.stringify(prefsRef.current));
    } catch {}
  };

  const goalOptions = technique?.sessionGoal.options ?? [];
  const goalValue = goalOptions[Math.min(goalIdx, Math.max(0, goalOptions.length - 1))] ?? 1;
  const pace = technique?.paceOptions?.[paceIdx] ?? 1;

  const session = useBreathingSession({
    technique: technique ?? ACTIVE_TECHNIQUES[0],
    goalValue,
    pace,
    onComplete: () => {
      if (confettiFiredRef.current) return;
      confettiFiredRef.current = true;
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    },
  });

  // החלפת הגדרות אפשרית רק במנוחה — אחרת מפריעה לסשן פעיל
  const settingsLocked = session.status === 'running' || session.status === 'paused';

  const selectTechnique = (t: BreathingTechnique) => {
    confettiFiredRef.current = false;
    const stored = prefsRef.current;
    const gIdx = stored.techniqueId === t.id && typeof stored.goalIdx === 'number'
      ? Math.min(stored.goalIdx, t.sessionGoal.options.length - 1) : 0;
    const pIdx = stored.techniqueId === t.id && t.paceOptions && typeof stored.paceIdx === 'number'
      ? Math.min(stored.paceIdx, t.paceOptions.length - 1) : 0;
    setGoalIdx(gIdx);
    setPaceIdx(pIdx);
    setSelectedId(t.id);
  };

  const backToGallery = () => {
    session.stop();
    confettiFiredRef.current = false;
    setSelectedId(null);
  };

  // ───────────────────────── גלריית הטכניקות ─────────────────────────
  if (!technique) {
    const firstAid = TECHNIQUE_BY_ID.get(FIRST_AID_TECHNIQUE_ID)!;
    const byFamily = (f: BreathingFamily) =>
      ACTIVE_TECHNIQUES.filter((t) => t.family === f && t.id !== FIRST_AID_TECHNIQUE_ID);

    const renderCard = (t: BreathingTechnique, opts?: { prominent?: boolean }) => {
      const Icon = ICONS[t.icon] ?? Wind;
      const goalLabel =
        t.sessionGoal.type === 'minutes'
          ? `${t.sessionGoal.default} דק'`
          : `${t.sessionGoal.default} ${t.sessionGoal.unit}`;
      return (
        <button
          key={t.id}
          type="button"
          className={`bre-card${opts?.prominent ? ' bre-card-prominent' : ''}`}
          onClick={() => selectTechnique(t)}
        >
          <div className={`bre-card-icon${opts?.prominent ? ' bre-card-icon-lg' : ''}`}>
            <Icon size={opts?.prominent ? 26 : 20} />
          </div>
          <div className="bre-card-body">
            <div className="bre-card-title">
              <span className="bre-card-name">{t.nameHe}</span>
              {t.evidence.length > 0 && <span className="bre-badge">מבוסס מחקר</span>}
            </div>
            <div className="bre-card-tagline">{t.tagline}</div>
            <div className="bre-chips">
              {t.useWhen.slice(0, 3).map((u) => (
                <span key={u} className="bre-chip">{u}</span>
              ))}
              <span className="bre-chip bre-chip-goal">{goalLabel}</span>
            </div>
          </div>
          <ChevronRight size={18} className="bre-card-chevron" />
        </button>
      );
    };

    return (
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div className="page-header" style={{ justifyContent: 'center', textAlign: 'center', display: 'block' }}>
          <div className="page-title-group">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              מרחב נשימה 🌿
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px' }}>
              ספריית טכניקות נשימה מהעולם המבוסס-מחקר של המיינדפולנס — להרגעה, מיקוד ואיזון
            </p>
          </div>
        </div>

        <div className="bre-disclaimer">
          <Info size={14} />
          <span>{MODULE_DISCLAIMER}</span>
        </div>

        {/* עזרה ראשונה */}
        <div className="bre-family-block">
          <div className="bre-family-title">
            <Siren size={16} /> עזרה ראשונה לרגעי לחץ
          </div>
          {renderCard(firstAid, { prominent: true })}
        </div>

        {FAMILY_ORDER.map((family) => {
          const list = byFamily(family);
          if (!list.length) return null;
          return (
            <div key={family} className="bre-family-block">
              <div className="bre-family-title">{FAMILY_LABELS[family]}</div>
              <div className="bre-family-desc">{FAMILY_DESCRIPTIONS[family]}</div>
              <div className="bre-gallery-grid">
                {list.map((t) => renderCard(t))}
              </div>
            </div>
          );
        })}

        {/* מידע והפניה בלבד */}
        <div className="bre-family-block">
          <button type="button" className="bre-ref-toggle" onClick={() => setShowReference((v) => !v)}>
            <BookOpen size={15} />
            <span>טכניקות מתקדמות — מידע והפניה בלבד ({REFERENCE_TECHNIQUES.length})</span>
            <ChevronRight size={15} style={{ transform: showReference ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showReference && (
            <div className="bre-gallery-grid">
              {REFERENCE_TECHNIQUES.map((t) => (
                <div key={t.id} className="bre-card bre-card-ref">
                  <div className="bre-card-icon bre-card-icon-ref">
                    <BookOpen size={18} />
                  </div>
                  <div className="bre-card-body">
                    <div className="bre-card-name">{t.nameHe}</div>
                    <div className="bre-card-tagline">{t.tagline}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6, marginTop: '6px' }}>
                      {t.description}
                    </div>
                    {t.referenceNote && (
                      <div className="bre-protocol-note" style={{ marginTop: '8px' }}>{t.referenceNote}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────── מסך הטכניקה והנגן ─────────────────────────
  const Icon = ICONS[technique.icon] ?? Wind;
  const { sessionGoal } = technique;
  const goalUnit = sessionGoal.type === 'minutes' ? 'דק׳' : sessionGoal.unit;

  const changeGoal = (idx: number) => {
    setGoalIdx(idx);
    savePrefs({ techniqueId: technique.id, goalIdx: idx, paceIdx });
  };
  const changePace = (idx: number) => {
    setPaceIdx(idx);
    savePrefs({ techniqueId: technique.id, goalIdx, paceIdx: idx });
  };

  const phaseScale = session.currentPhase?.scale ?? 1;
  const phaseSeconds = session.phaseDuration || 4;
  const isRunning = session.status === 'running';
  const isActive = isRunning || session.status === 'paused';

  const completionSummary =
    sessionGoal.type === 'minutes'
      ? `השלמת ${goalValue} דקות תרגול`
      : sessionGoal.unit === 'חזרות'
        ? `${goalValue} אנחות פיזיולוגיות — כל הכבוד!`
        : `השלמת ${goalValue} מחזורי נשימה`;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <button type="button" className="bre-back" onClick={backToGallery}>
        <ChevronRight size={16} /> חזרה לספריית הטכניקות
      </button>

      <div className="page-header" style={{ justifyContent: 'center', textAlign: 'center', display: 'block' }}>
        <div className="page-title-group">
          <div className="bre-detail-icon"><Icon size={26} /></div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 0' }}>
            {technique.nameHe}
          </h2>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{technique.nameEn}</div>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '6px' }}>{technique.tagline}</p>
        </div>
      </div>

      {(technique.safety?.warnings?.length || technique.safety?.environments?.length) ? (
        <div className="bre-warnings">
          <AlertTriangle size={15} />
          <div>
            {technique.safety?.warnings?.map((w) => <div key={w}>• {w}</div>)}
            {technique.safety?.environments?.map((e) => <div key={e}>• {e}</div>)}
          </div>
        </div>
      ) : null}

      {/* בוררי מטרה וקצב */}
      <div className="bre-settings">
        <div className="bre-setting-row">
          <span className="bre-setting-label">
            {sessionGoal.type === 'minutes' ? 'משך הסשן' : `מספר ${goalUnit}`}
          </span>
          <div className="bre-chips">
            {sessionGoal.options.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                disabled={settingsLocked}
                className={`bre-chip bre-chip-btn${idx === goalIdx ? ' bre-chip-active' : ''}`}
                onClick={() => changeGoal(idx)}
              >
                {opt} {goalUnit}
              </button>
            ))}
          </div>
        </div>
        {technique.countsBased && technique.paceOptions && (
          <div className="bre-setting-row">
            <span className="bre-setting-label">קצב אישי (שניות לספירה)</span>
            <div className="bre-chips">
              {technique.paceOptions.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  disabled={settingsLocked}
                  className={`bre-chip bre-chip-btn${idx === paceIdx ? ' bre-chip-active' : ''}`}
                  onClick={() => changePace(idx)}
                >
                  {opt} שנ'
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* הנגן */}
      <div className="card-table bre-player-card">
        {technique.mode === 'phases' && (
          <>
            <div
              className="bre-circle"
              style={{
                transform: `scale(${isActive ? phaseScale : 1})`,
                transition: reducedMotion
                  ? 'none'
                  : `transform ${phaseSeconds}s cubic-bezier(0.4, 0, 0.4, 1)`,
                boxShadow: isRunning
                  ? '0 0 45px var(--primary-glow, color-mix(in srgb, var(--primary) 45%, transparent))'
                  : 'var(--shadow-md)',
              }}
            >
              <Wind size={34} style={{ opacity: 0.65 }} color="var(--primary-hover, var(--primary))" />
              <div className="bre-phase-label">
                {isRunning ? session.currentPhase?.label : session.status === 'paused' ? 'מושהה' : 'מוכן/ה לתרגול'}
              </div>
              {isRunning && (
                <div className="bre-countdown">{Math.ceil(session.phaseRemaining)}</div>
              )}
            </div>

            <BreathingProgress
              progress={session.progress}
              center={
                sessionGoal.type === 'cycles'
                  ? `מחזור ${Math.min(session.cyclesCompleted + 1, goalValue)} מתוך ${goalValue}`
                  : `נותרו ${formatClock(session.remainingSeconds)}`
              }
            />

            <div className="bre-controls">
              {!isActive ? (
                <button type="button" className="btn btn-primary" onClick={session.start} style={{ padding: '12px 32px', fontSize: '1.05rem', fontWeight: 700 }}>
                  <Play size={18} style={{ display: 'inline', marginLeft: '6px', verticalAlign: '-3px' }} />
                  התחל/י תרגול
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'}`}
                    onClick={isRunning ? session.pause : session.resume}
                    style={{ padding: '12px 28px', fontWeight: 700 }}
                  >
                    {isRunning ? <><Pause size={16} style={{ display: 'inline', verticalAlign: '-3px', marginLeft: '4px' }} />השהיה</> : <><Play size={16} style={{ display: 'inline', verticalAlign: '-3px', marginLeft: '4px' }} />המשך</>}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={session.stop} style={{ padding: '12px 20px', fontWeight: 600 }}>
                    <RotateCcw size={15} style={{ display: 'inline', verticalAlign: '-2px', marginLeft: '4px' }} />
                    עצירה
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {technique.mode === 'open' && (
          <>
            <div className={`bre-circle bre-circle-ambient${reducedMotion ? ' no-anim' : ''}`}>
              <Icon size={30} color="var(--primary-hover, var(--primary))" style={{ opacity: 0.7 }} />
              <div className="bre-phase-label">
                {isRunning
                  ? 'התבוננו/י בנשימה שלך'
                  : session.status === 'paused'
                    ? 'מושהה'
                    : 'מוכן/ה להתבוננות'}
              </div>
              <div className="bre-countdown bre-countdown-clock">{formatClock(session.remainingSeconds)}</div>
            </div>

            <BreathingProgress progress={session.progress} center={isRunning ? 'בלי לשנות את הנשימה — רק להסתכל' : undefined} />

            <div className="bre-controls">
              {!isActive ? (
                <button type="button" className="btn btn-primary" onClick={session.start} style={{ padding: '12px 32px', fontSize: '1.05rem', fontWeight: 700 }}>
                  <Play size={18} style={{ display: 'inline', marginLeft: '6px', verticalAlign: '-3px' }} />
                  התחל/י התבוננות
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'}`}
                    onClick={isRunning ? session.pause : session.resume}
                    style={{ padding: '12px 28px', fontWeight: 700 }}
                  >
                    {isRunning ? 'השהיה' : 'המשך'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={session.stop} style={{ padding: '12px 20px', fontWeight: 600 }}>
                    עצירה
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {technique.mode === 'counter' && (
          <>
            <button
              type="button"
              className="bre-tap-btn"
              onClick={session.countBreath}
              disabled={!isRunning}
              aria-label="הקשה על כל נשיפה"
            >
              <div className="bre-tap-count">{session.breathInSet}</div>
              <div className="bre-tap-hint">{isRunning ? 'הקש/י בכל נשיפה' : 'התחילו/י סשן כדי לספור'}</div>
            </button>

            <div className="bre-counter-meta">
              <span>מתוך 10 בסט</span>
              <span className="bre-dot">•</span>
              <span>{session.setsCompleted} סטים הושלמו</span>
              <span className="bre-dot">•</span>
              <span>נותרו {formatClock(session.remainingSeconds)}</span>
            </div>
            <button
              type="button"
              className="bre-lost-btn"
              onClick={session.lostCount}
              disabled={!isRunning}
            >
              איבדתי את הספירה — חזרה ל-1 (זה בסדר גמור)
            </button>

            <BreathingProgress progress={session.progress} />

            <div className="bre-controls">
              {!isActive ? (
                <button type="button" className="btn btn-primary" onClick={session.start} style={{ padding: '12px 32px', fontSize: '1.05rem', fontWeight: 700 }}>
                  <Play size={18} style={{ display: 'inline', marginLeft: '6px', verticalAlign: '-3px' }} />
                  התחל/י סשן ספירה
                </button>
              ) : (
                <button type="button" className="btn btn-danger" onClick={session.stop} style={{ padding: '12px 28px', fontWeight: 700 }}>
                  סיום
                </button>
              )}
            </div>
          </>
        )}

        {/* מסך סיום */}
        {session.status === 'completed' && (
          <div className="bre-complete">
            <CheckCircle2 size={40} />
            <div className="bre-complete-title">כל הכבוד! 🌿</div>
            <div className="bre-complete-sub">
              {completionSummary}
              {technique.mode === 'counter' ? ` • ${session.setsCompleted} סטים שלמים` : ''}
            </div>
            <div className="bre-controls">
              <button type="button" className="btn btn-primary" onClick={() => { confettiFiredRef.current = false; session.start(); }}>
                עוד פעם
              </button>
              <button type="button" className="btn btn-secondary" onClick={backToGallery}>
                חזרה לספרייה
              </button>
            </div>
          </div>
        )}
      </div>

      {/* הוראות */}
      {technique.instructions.length > 0 && (
        <div className="bre-info-card">
          <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>איך מתרגלים?</strong>
          <ol className="bre-steps">
            {technique.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* ראיות */}
      {technique.evidence.length > 0 && (
        <div className="bre-info-card">
          <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>בסיס מחקרי</strong>
          <ul className="bre-evidence">
            {technique.evidence.map((e, i) => (
              <li key={i}>
                <span className="bre-evidence-note">{e.note}</span>
                <span className="bre-evidence-src">— {e.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {technique.protocolNote && (
        <div className="bre-protocol-note bre-protocol-note-block">{technique.protocolNote}</div>
      )}
    </div>
  );
}

function BreathingProgress({ progress, center }: { progress: number; center?: string }) {
  return (
    <div className="bre-progress-wrap">
      <div className="bre-progress-bar">
        <div
          className="bre-progress-fill"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
        />
      </div>
      {center && <div className="bre-progress-center">{center}</div>}
    </div>
  );
}
