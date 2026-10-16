'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BreathingPhase, BreathingTechnique } from './breathingTechniques';

export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface BreathingSessionSummary {
  cycles: number;
  seconds: number;
}

interface UseBreathingSessionOptions {
  technique: BreathingTechnique;
  /** מספר מחזורים (cycles) או דקות (minutes) — לפי sessionGoal.type */
  goalValue: number;
  /** מכפיל שניות לטכניקות מבוססות-ספירה (1 = ברירת מחדל) */
  pace?: number;
  onComplete?: (summary: BreathingSessionSummary) => void;
}

const vibrate = (ms: number) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {}
};

// A single shared empty array — `?? []` inline would create a new reference on
// every render, recreating derivePhase and re-triggering the tick effect into
// a setState loop (Maximum update depth exceeded).
const EMPTY_PHASES: BreathingPhase[] = [];

/**
 * מנוע סשן נשימה בשלושה מצבים:
 *  phases  — מעגל שלבים מונחה (שאיפה/החזקה/נשיפה) עם טיימר מבוסס-ציר-זמן
 *  open    — טיימר סשן בלבד (התבוננות/מיינדפולנס), בלי הנחיית שלבים
 *  counter — ספירת נשימות בהקשה: סטים של 10 עם טיימר סשן
 *
 * הטיימר מחושב מציר-זמן (Date.now) ולא מצטבר אינטרוולים — חסין מסחיבה
 * ומדליפת setTimeout בעת השהיה.
 */
export function useBreathingSession({
  technique,
  goalValue,
  pace = 1,
  onComplete,
}: UseBreathingSessionOptions) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  // counter mode
  const [breathInSet, setBreathInSet] = useState(1);
  const [setsCompleted, setSetsCompleted] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const lastPhaseIdxRef = useRef(-1);
  const completedFiredRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const phases = technique.mode === 'phases' ? technique.phases ?? EMPTY_PHASES : EMPTY_PHASES;
  const cycleDuration = phases.reduce((sum, p) => sum + p.seconds, 0) * pace;

  const goalType = technique.sessionGoal.type;
  const totalSeconds =
    goalType === 'cycles'
      ? Math.max(cycleDuration, 1) * Math.max(1, goalValue)
      : Math.max(1, goalValue) * 60;

  // ── גזירת השלב הנוכחי מתוך הזמן שחלף ─────────────────────────
  const derivePhase = useCallback(
    (elapsedSec: number) => {
      if (!phases.length || cycleDuration <= 0) return null;
      const inCycle = elapsedSec % cycleDuration;
      const cyclesCompleted = Math.floor(elapsedSec / cycleDuration);
      let acc = 0;
      for (let i = 0; i < phases.length; i++) {
        const dur = phases[i].seconds * pace;
        if (inCycle < acc + dur || i === phases.length - 1) {
          const phaseElapsed = inCycle - acc;
          return {
            phaseIndex: i,
            phase: phases[i],
            phaseRemaining: Math.max(0, dur - phaseElapsed),
            phaseDuration: dur,
            cyclesCompleted,
          };
        }
        acc += dur;
      }
      return null;
    },
    [phases, cycleDuration, pace]
  );

  const current = status === 'idle' && elapsed === 0 ? null : derivePhase(elapsed);
  const cyclesCompleted = current?.cyclesCompleted ?? 0;
  const progress = Math.min(1, elapsed / totalSeconds);
  const remainingSeconds = Math.max(0, totalSeconds - elapsed);

  // ── טיק הסשן ──────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      if (startedAtRef.current == null) return;
      const now = Date.now();
      const paused = pausedTotalRef.current + (pausedAtRef.current ? now - pausedAtRef.current : 0);
      const sec = Math.max(0, (now - startedAtRef.current - paused) / 1000);
      setElapsed(sec);

      if (sec >= totalSeconds) {
        if (!completedFiredRef.current) {
          completedFiredRef.current = true;
          setStatus('completed');
          vibrate(120);
          onCompleteRef.current?.({ cycles: derivePhase(totalSeconds)?.cyclesCompleted ?? 0, seconds: totalSeconds });
        }
        return;
      }

      // רטט עדין בכל מעבר שלב (רק במצב השלבים)
      if (phases.length) {
        const idx = derivePhase(sec)?.phaseIndex ?? -1;
        if (lastPhaseIdxRef.current !== -1 && idx !== lastPhaseIdxRef.current) {
          vibrate(45);
        }
        lastPhaseIdxRef.current = idx;
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [status, totalSeconds, phases.length, derivePhase]);

  // ── Wake Lock: המסך נשאר דלוק בזמן תרגול ───────────────────────
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    let cancelled = false;
    const release = () => {
      try { wakeLockRef.current?.release?.(); } catch {}
      wakeLockRef.current = null;
    };
    if (status === 'running' && typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      (navigator as any)
        .wakeLock.request('screen')
        .then((lock: any) => { if (cancelled) release(); else wakeLockRef.current = lock; })
        .catch(() => {});
    } else if (status !== 'running') {
      release();
    }
    return () => { cancelled = true; release(); };
  }, [status]);

  const reset = useCallback(() => {
    startedAtRef.current = null;
    pausedAtRef.current = null;
    pausedTotalRef.current = 0;
    lastPhaseIdxRef.current = -1;
    completedFiredRef.current = false;
    setElapsed(0);
    setBreathInSet(1);
    setSetsCompleted(0);
    setStatus('idle');
  }, []);

  const start = useCallback(() => {
    reset();
    startedAtRef.current = Date.now();
    setStatus('running');
    vibrate(45);
  }, [reset]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    pausedAtRef.current = Date.now();
    setStatus('paused');
  }, [status]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    if (pausedAtRef.current != null) {
      pausedTotalRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setStatus('running');
  }, [status]);

  const stop = useCallback(() => reset(), [reset]);

  // ── מצב המונה: הקשה לכל נשיפה ─────────────────────────────────
  const countBreath = useCallback(() => {
    vibrate(35);
    setBreathInSet((n) => {
      if (n >= 10) {
        setSetsCompleted((s) => s + 1);
        return 1;
      }
      return n + 1;
    });
  }, []);

  const lostCount = useCallback(() => {
    vibrate(25);
    setBreathInSet(1);
  }, []);

  return {
    // כללי
    status,
    elapsed,
    progress,
    remainingSeconds,
    totalSeconds,
    cyclesCompleted,
    // מצב שלבים
    currentPhase: current?.phase ?? null,
    phaseRemaining: current?.phaseRemaining ?? 0,
    phaseDuration: current?.phaseDuration ?? 0,
    // מצב מונה
    breathInSet,
    setsCompleted,
    countBreath,
    lostCount,
    // שליטה
    start,
    pause,
    resume,
    stop,
  };
}

/** פורמט mm:ss לתצוגת טיימר */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
