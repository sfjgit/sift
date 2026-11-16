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

/**
 * Chrome's speech engine doesn't know CRM words and ignores vocabulary hints, so
 * we correct what it typically hears instead: "spokes" → "SPOCs", "s p o c" →
 * "SPOC", "c s r" → "CSR". Plain English is left alone ("I spoke to him").
 */
const PERSON = '(?:i|we|he|she|they|you|who|just|already|never)';
export const fixCrmWords = (text: string) =>
  text
    .replace(/\bs\s*\.?\s*p\s*\.?\s*o\s*\.?\s*c\.?('?s)?\b/gi, (_m, pl) => (pl ? 'SPOCs' : 'SPOC'))
    .replace(/\b(spokes|spocks|spock's|spokes'|spox|spocs|spox's|sparks of|spots)\b/gi, 'SPOCs')
    .replace(/\b(spock|spoc|spoke's)\b/gi, 'SPOC')
    .replace(new RegExp(`\\b(?<!\\b${PERSON}\\s)spoke\\b(?!\\s+(to|with|about|of)\\b)`, 'gi'), 'SPOC')
    .replace(/\bc\s*\.?\s*s\s*\.?\s*r\b/gi, 'CSR')
    .replace(/\b(see ss are|c s are|csr's)\b/gi, 'CSR')
    .replace(/\bf\s*\.?\s*y\b(?=\s*\d)/gi, 'FY');

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
    // Chrome sometimes never fires onend — don't keep the mic off waiting for it.
    // ~15 characters a second at this rate, plus a little room.
    window.setTimeout(resolve, Math.min(12_000, 800 + text.length * 70));
  });

export const stopSpeaking = () => {
  if (canSpeak()) window.speechSynthesis.cancel();
};

/** fired by the AI Canvas page with every result (or error) — the voice assistant speaks it */
export const CANVAS_RESULT_EVENT = 'crm:canvas-result';

/**
 * True while a canvas conversation is on screen (the side panel is open, or the
 * /ai-canvas page). Then whatever you say next is a follow-up for it — "make it
 * a pie", "explain this", "no, I meant last year" — not a new page command.
 */
export const canvasFocus = { on: false };

/** an AI action card is waiting for “yes” / “no” — those single words go to it */
export const aiPending = { action: false };

/** ask the assistant panel (AiDock) — on /ai-canvas the page itself answers */
export const AI_ASK_EVENT = 'crm:ai-ask';
export const AI_DOCK_CLOSE_EVENT = 'crm:ai-dock-close';
/** the assistant workspace came on / went off screen — the floating voice box hides meanwhile */
export const CANVAS_FOCUS_EVENT = 'crm:ai-canvas-focus';
/** what is being dictated right now — the assistant workspace shows it in its own box while it is open */
export const VOICE_DRAFT_EVENT = 'crm:ai-voice-draft';
/** "wait" / "cancel" while a request is on its way: whatever comes back is dropped */
export const AI_CANCEL_EVENT = 'crm:ai-cancel';
/** "go back" / "previous canvas" while the assistant is open: back to the report before this one */
export const AI_PREV_CANVAS_EVENT = 'crm:ai-prev-canvas';
/** "show stats": the page opens its own stats view (detail false = hide it) */
export const PAGE_STATS_EVENT = 'crm:page-stats';
/** open the assistant panel; with a prompt it is asked straight away */
export const openAiDock = (prompt?: string) =>
  window.dispatchEvent(new CustomEvent(AI_ASK_EVENT, { detail: { prompt: prompt ?? '' } }));
