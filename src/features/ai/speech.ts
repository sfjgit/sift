// File: speech.ts
// Path: src/features/ai/speech.ts
//
// The browser's own speech engines — free, no API calls from us:
//   • listening: Web Speech API SpeechRecognition (Chrome / Edge; Safari partly).
//     Chrome sends the audio to Google's speech service to turn it into text.
//   • talking back: speechSynthesis (every modern browser, voices from the OS).

export interface SpeechAlternative {
  transcript: string;
}
export interface SpeechResult {
  isFinal: boolean;
  0: SpeechAlternative;
}
export interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
export interface SpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type SpeechCtor = new () => SpeechRecognizer;

export const getSpeechCtor = (): SpeechCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** ask for the microphone up front, so the browser's permission prompt shows now */
export const askMicPermission = async (): Promise<'granted' | 'denied' | 'unavailable'> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'unavailable';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return 'granted';
  } catch {
    return 'denied';
  }
};

/** the site's microphone permission without asking: 'prompt' means Chrome will
 *  only switch the mic on after a click / key press on the page */
export const micPermissionState = async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
  try {
    const st = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return st.state;
  } catch {
    return 'unknown';
  }
};

/** run once on the next click / key press anywhere (browsers start audio only then) */
export const onNextGesture = (fn: () => void) => {
  const run = () => {
    window.removeEventListener('pointerdown', run, true);
    window.removeEventListener('keydown', run, true);
    fn();
  };
  window.addEventListener('pointerdown', run, true);
  window.addEventListener('keydown', run, true);
  return () => {
    window.removeEventListener('pointerdown', run, true);
    window.removeEventListener('keydown', run, true);
  };
};

// an Indian-English voice first, then British, then any English
const pickVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang === 'en-IN') ??
    voices.find(v => v.lang === 'en-GB' && /male|daniel|george|arthur/i.test(v.name)) ??
    voices.find(v => v.lang === 'en-GB') ??
    voices.find(v => v.lang.startsWith('en')) ??
    null
  );
};

/** say something; resolves when finished (or at once when speech isn't available) */
export const speak = (text: string): Promise<void> =>
  new Promise(resolve => {
    if (!canSpeak() || !text.trim()) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else u.lang = 'en-IN';
    u.rate = 1.05;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
    // Chrome sometimes never fires onend — don't hang the assistant
    window.setTimeout(resolve, Math.min(15_000, 1_500 + text.length * 90));
  });

export const stopSpeaking = () => {
  if (canSpeak()) window.speechSynthesis.cancel();
};

/** fired by the AI Canvas page with every result (or error) — the voice assistant speaks it */
export const CANVAS_RESULT_EVENT = 'crm:canvas-result';
