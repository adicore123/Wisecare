import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typings for the Web Speech API — it is not part of TypeScript's
// standard lib.dom definitions, and we only use this narrow surface.
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionCtor | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'אין הרשאת מיקרופון. אפשר לאפשר זאת בהגדרות הדפדפן ולנסות שוב.',
  'service-not-allowed': 'שירות התמלול חסום בדפדפן זה. אפשר לנסות ב-Chrome או ב-Edge.',
  'audio-capture': 'לא נמצא מיקרופון במכשיר זה.',
  'network': 'בעיית רשת — התמלול דורש חיבור לאינטרנט. כדאי לבדוק את החיבור ולנסות שוב.',
  'language-not-supported': 'הדפדפן לא תומך בתמלול עברית.'
};

export const DICTATION_UNSUPPORTED_MESSAGE =
  'הדפדפן הזה לא תומך בהכתבה קולית. אפשר להקליד רגיל, או לפתוח את המערכת ב-Chrome/Edge.';

export interface UseDictationResult {
  /** null until mounted (SSR-safe); false means the browser lacks Web Speech. */
  supported: boolean | null;
  listening: boolean;
  /** In-progress (not yet finalized) recognition preview. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * Hebrew speech-to-text over the browser's Web Speech API. Finalized spoken
 * segments are handed to `onChunk` in spoken order — nothing is recorded or
 * stored anywhere, only the recognized text leaves this hook.
 */
export function useDictation(onChunk: (chunk: string) => void): UseDictationResult {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  // Never leave a microphone session running after unmount or navigation.
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(prev => (prev === message ? null : prev)), 6000);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      showError(DICTATION_UNSUPPORTED_MESSAGE);
      return;
    }

    // A fresh instance per session — restarts are handled by onend below.
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = 'he-IL';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          const chunk = transcript.trim();
          if (chunk) onChunkRef.current(chunk);
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      if (event.error === 'no-speech') {
        // Chrome fires no-speech after a silent stretch; keep the session
        // alive (onend restarts it) and just clear the preview.
        setInterim('');
        return;
      }
      shouldListenRef.current = false;
      setListening(false);
      setInterim('');
      showError(ERROR_MESSAGES[event.error] || 'אירעה שגיאה בתמלול. נסה שוב.');
    };

    recognition.onend = () => {
      // Chrome ends the session after silence — transparently resume while
      // the user hasn't pressed stop.
      if (shouldListenRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // start() throws if it is already running — fall through to stop.
        }
      }
      setListening(false);
      setInterim('');
    };

    shouldListenRef.current = true;
    setError(null);
    setInterim('');
    setListening(true);
    try {
      recognition.start();
    } catch {
      shouldListenRef.current = false;
      setListening(false);
    }
  }, [showError]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }
    setListening(false);
    setInterim('');
  }, []);

  return { supported, listening, interim, error, start, stop };
}
