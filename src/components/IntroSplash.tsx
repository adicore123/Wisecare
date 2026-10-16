'use client';

import React, { useEffect, useRef, useState } from 'react';

interface IntroSplashProps {
  /** מפתח אחסון נפרד לכל עמוד — שלא יסומן "נראה" בכוח בעמוד אחר */
  storageKey: string;
  /** התגית שמופיעה מתחת לשם המותג */
  tagline: string;
  durationMs?: number;
  /** פרמטר URL שמכריח הצגה מחדש (ברירת מחדל: replay) */
  replayParam?: string;
  onDone?: () => void;
}

/**
 * אנימציית הפתיחה של Wisecare (להקשיב. להבין. להתקדם. ביחד.) — רכיב עצמאי
 * שנפתח בעמוד הבית ובעמוד השיווקי, כל אחד עם מפתח אחסון משלו.
 * מדלג אוטומטית למי שכבר ראה / תנועה-מופחתת / עדיין לא סימן שראה.
 */
export default function IntroSplash({
  storageKey, tagline, durationMs = 4700, replayParam = 'replay', onDone
}: IntroSplashProps) {
  const [show, setShow] = useState<boolean | null>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    try { localStorage.setItem(storageKey, 'true'); } catch {}
    setShow(false);
    onDone?.();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceReplay = params.has(replayParam);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === 'true'; } catch {}

    // Skip silently — כמו במקור: לא מסמנים "נראה" בדילוג (חוץ מהשלמה רגילה)
    if (reduceMotion || (!forceReplay && seen)) {
      doneRef.current = true;
      setShow(false);
      onDone?.();
      return;
    }

    setShow(true);
    const timer = setTimeout(finish, durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (show !== true) return null;

  return (
    <div className="intro-splash" id="intro">
      <button
        className="intro-splash__skip"
        onClick={finish}
        type="button"
        aria-label="דלג על אנימציית הפתיחה"
      >
        דלג
      </button>

      <div className="intro-splash__words" aria-hidden="true">
        <span className="intro-splash__word">להקשיב.</span>
        <span className="intro-splash__word">להבין.</span>
        <span className="intro-splash__word">להתקדם.</span>
        <span className="intro-splash__word intro-splash__word--together">ביחד.</span>
      </div>

      <div className="intro-splash__brand" aria-hidden="true">
        <img src="/pwa-icon.svg" alt="Wisecare" />
        <span>Wisecare</span>
        <small>{tagline}</small>
      </div>
    </div>
  );
}
