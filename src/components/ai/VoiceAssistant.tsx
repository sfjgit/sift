// File: VoiceAssistant.tsx
// Path: src/components/ai/VoiceAssistant.tsx
//
// The AI assistant — one floating, voice-first element (no dialog box, no dim
// backdrop): a three.js orb with an editable line of text under it.
//
//   • Listens by default (the browser asks for the mic once). "mute" stops it;
//     "unmute", a name ("Jarvis", "AI", "Rahul", "Claude") or a double clap
//     brings it back.
//   • What you say is typed into the line. It sends by itself 2.5 s after you
//     stop talking (a bar counts down). Say "wait" to get 10 s to edit (typing
//     resets it); "go" sends at once; "cancel" / "clear" / "option 2" work too.
//   • Cheapest path first — most things cost nothing:
//       1. browser: pages by name, back / scroll / dark mode, repeats, small talk;
//       2. "what do you think about this page" → /ai/insights (rules, no AI);
//       3. speech that isn't about the CRM is ignored (never sent);
//       4. numbers / totals / top-N / trends → AI Canvas;
//       5. everything else → /ai/command (learned templates are free too).
//   • Ctrl/⌘+J (or "Ask AI" in the top bar) opens the same element for typing.
//   • Read-only like all of the AI here: it opens pages and builds reports only.

'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { ArrowUp, BarChart3, Mic, MicOff, MousePointerClick, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { APPLY_URL_EVENT } from '@/components/data-table/useTableState';
import { useVisibleNav } from '@/components/shell/Sidebar';
import { aiApi } from '@/lib/api/endpoints';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { fmtInr } from '@/lib/format';
import { useUi } from '@/stores/ui';
import { useBrowserValue } from '@/hooks/useBrowserValue';
import { invalidateAiMe, quotaLabel, useAiMe, useRefreshAiMe } from '@/features/ai/useAi';
import {
  fixCrmWords,
  askMicPermission,
  AI_CANCEL_EVENT,
  AI_DOCK_CLOSE_EVENT,
  AI_PREV_CANVAS_EVENT,
  CANVAS_FOCUS_EVENT,
  CANVAS_RESULT_EVENT,
  PAGE_STATS_EVENT,
  VOICE_DRAFT_EVENT,
  aiPending,
  canvasFocus,
  openAiDock,
  canSpeak,
  getSpeechCtor,
  micPermissionState,
  onNextGesture,
  speak,
  stopSpeaking,
  type SpeechRecognizer,
} from '@/features/ai/speech';
import { isAnalytic, isCanvasFollowUp, matchSuggestions, type Suggestion } from '@/features/ai/suggestions';
import { buildPageIndex, rememberCommand, resolveLocal, type LocalAnswer } from '@/features/ai/localIntents';
import { smallTalk, soundsLikeCrm, type ChatAnswer } from '@/features/ai/smallTalk';
import { startClapDetector } from '@/features/ai/clap';
import { useReport } from '@/features/support/ReportProblem';
import { useAuth } from '@/features/auth/AuthProvider';
import { JarvisSphere } from './JarvisSphere';
import type { OrbMood } from './AssistantOrb3D';
import type { AiCanvasResult, AiCommandResult } from '@/types/ai';

// three.js only in the browser
const AssistantOrb3D = dynamic(() => import('./AssistantOrb3D').then(m => m.AssistantOrb3D), { ssr: false });

// ── remembered per browser ───────────────────────────────────────────────────

interface VoicePrefs {
  on: boolean; // mic on, listening for the wake word
  muted: boolean; // asleep — only "AI on" / "unmute" wakes it
  talk: boolean; // speak replies
  set: (p: Partial<Omit<VoicePrefs, 'set'>>) => void;
}
export const useVoicePrefs = create<VoicePrefs>()(
  persist(set => ({ on: true, muted: false, talk: true, set: p => set(p) }), { name: 'crm:ai-voice-v3' }) // v2 could be stuck "off" after a fresh browser start
);

type Phase = 'off' | 'idle' | 'dictating' | 'holding' | 'processing' | 'speaking' | 'muted';

const STATUS_TEXT: Record<Phase, string> = {
  off: 'Type, or turn voice on (bottom-left)',
  idle: 'Listening — just say what you want',
  dictating: 'Sending when you stop — say “wait” to edit',
  holding: 'Waiting — edit, then it sends (or say “go”)',
  processing: 'Processing…',
  speaking: 'Speaking…',
  muted: 'Muted — say “unmute”, “Jarvis”, or clap twice',
};

// ── phrases ──────────────────────────────────────────────────────────────────

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"'.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const WAKE = /^(?:(?:hey|hi|hello|ok|okay)\s+)?(?:ai|a i|jarvis|rahul|claude|cloud|clawed|hey i)\b\s*(.*)$/;
const MUTE = /^(mute|mute yourself|turn off|stop listening|sleep|go to sleep|shut up|be quiet|silence)$/;
const WAIT = /^(no |oh |hey )?(wait|hold on|hold|stop|let me edit|edit|one sec|one second|not yet|i am not done|i'm not done)( wait| edit| stop| please| a second| a minute| a sec| it| that| let me edit)*$/;
const ON = /^(on|unmute|turn on|wake up|listen|resume|you there|are you there|are you on)$/;
const STATUS = /^(status|quota|limit|how many left|how many commands left)$/;
const HELP = /^(help|what can you do|what can i say|what can i ask|options|suggestions)$/;
const GO = /^(go|go ahead|done|i am done|i'm done|send|submit|do it|ok go|okay go|yes go|run it)$/;
const CANCEL = /^(cancel|never ?mind|forget it|close|exit)$/;
const CLEAR = /^(clear|start over|reset|clear that|erase)$/;
const NUMS: Record<string, number> = { one: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
const PICK = /^(?:option|number|pick|choose|select)\s*(one|two|to|too|three|four|for|five|[1-5])$|^(one|two|three|four|five|[1-5])$/;

const AUTO_MS = 4_000; // silence before it sends by itself (an unfinished sentence)
const AUTO_FAST_MS = 2_400; // …when the sentence sounds finished
/** Chrome can sit on a sentence for seconds before calling it final — after this much quiet we take it ourselves */
const SETTLE_MS = 1_600;
/** a recogniser session is refreshed after this long (long sessions get slow), only while nobody is talking */
const REFRESH_MS = 50_000;
const TRAILING = /\b(and|or|but|by|for|with|of|the|a|an|in|on|to|from|show|me|my|is|are|that|which|where|than|per|top)$/i;
/** how long to wait before sending: short when it sounds complete, longer mid-thought */
const autoMs = (text: string) => {
  const t = text.trim();
  return t.split(/\s+/).length >= 3 && !TRAILING.test(t) ? AUTO_FAST_MS : AUTO_MS;
};
/** loose (default, dev): whatever you say is sent, and you always get an answer or a question back.
 *  strict (NEXT_PUBLIC_AI_STRICT=1, for UAT): speech that isn't about the CRM is dropped unsent. */
const STRICT = process.env.NEXT_PUBLIC_AI_STRICT === '1';
const joinText = (a: string, b: string) => [a.trimEnd(), b.trim()].filter(Boolean).join(' ');
const HOLD_MS = 10_000; // after "wait" (each edit restarts it)
const GREET_AFTER_MS = 10 * 60_000;
const LAST_KEY = 'crm:ai-last';
const strip = (s: string) => s.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

const lastActive = () => {
  try {
    return Number(localStorage.getItem(LAST_KEY) ?? 0);
  } catch {
    return 0;
  }
};
const touch = () => {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
};

/** a short, quiet two-note chime (Web Audio — free, no file) */
const chime = () => {
  try {
    const ctx = new AudioContext();
    [660, 990].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    /* no audio */
  }
};

/** what to say about a canvas */
const describeCanvas = (r: AiCanvasResult) => {
  if (r.type !== 'canvas') return r.message;
  const parts = [`Here is your report: ${r.spec.title}.`];
  const first = r.blocks.find(b => b.result);
  const res = first?.result;
  if (res?.kind === 'rows' && res.rows.length) {
    const col = res.columns.find(c => c.type === 'text')?.key;
    const names = col ? res.rows.slice(0, 3).map(x => String(x[col] ?? '')).filter(Boolean) : [];
    if (names.length) parts.push(`The top ${names.length === 1 ? 'one is' : `${names.length} are`} ${names.join(', ')}.`);
  } else if (res?.kind === 'single' && res.value !== null) {
    const v = res.format === 'money' ? fmtInr(res.value) : res.format === 'percent' ? `${res.value} percent` : String(res.value);
    parts.push(`${first!.title}: ${v}.`);
  }
  parts.push('Please check it out.');
  return parts.join(' ');
};

export function VoiceAssistant() {
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const { setTheme } = useTheme();
  const { user } = useAuth();
  const { data: me } = useAiMe();
  const refreshMe = useRefreshAiMe();
  const { sections, footer } = useVisibleNav();
  const { on, muted, talk, set } = useVoicePrefs();
  // a problem report is being written or its steps recorded: the assistant is off
  // (mic, clap detector, panel) so nothing said or clicked there reaches it — back on after
  const reporting = useReport(s => s.open || !!s.recording);
  const open = useUi(s => s.aiOpen);
  const setOpen = useUi(s => s.setAiOpen);
  const supported = useBrowserValue(() => !!getSpeechCtor(), false);
  const available = !!me?.active.command;
  const canvasOk = !!me?.allowed.canvas;

  const [phase, setPhase] = useState<Phase>('off');
  // a fresh browser: the mic starts only after the first click / key press on the page
  const [needsTap, setNeedsTap] = useState(false);
  const [draft, setDraft] = useState('');
  const [interim, setInterim] = useState('');
  const [reply, setReply] = useState('');
  const [countdown, setCountdown] = useState<{ ms: number; key: number } | null>(null);
  // the speech service dropped (network) — shown on the orb so it never just looks dead
  const [reconnecting, setReconnecting] = useState(false);

  const recRef = useRef<SpeechRecognizer | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const want = useRef(false);
  const speakingRef = useRef(false);
  const phaseRef = useRef<Phase>('off');
  const draftRef = useRef('');
  const caret = useRef<number | null>(null); // where spoken words go (null = end)
  const suggestionsRef = useRef<Suggestion[]>([]);
  const sendTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  const restarts = useRef<number[]>([]);
  const interimRef = useRef('');
  const settleTimer = useRef<number | undefined>(undefined);
  const micStartedAt = useRef(0);
  const sentRef = useRef('');
  const runRef = useRef(0);
  const waitingCanvas = useRef<number | undefined>(undefined);
  const pagesRef = useRef(buildPageIndex([]));
  const live = useRef({ muted, talk, me, canvasOk, path, firstName: user?.firstName });

  const suggestions = matchSuggestions(`${draft} ${interim}`, path, { canvas: canvasOk, limit: 4 });
  useEffect(() => {
    live.current = { muted, talk, me, canvasOk, path, firstName: user?.firstName };
    suggestionsRef.current = suggestions;
    pagesRef.current = buildPageIndex([...sections.flatMap(s => s.items), ...footer]);
  });

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const setDraftBoth = (v: string) => {
    draftRef.current = v;
    setDraft(v);
  };
  const rest = () => go(!want.current ? 'off' : live.current.muted ? 'muted' : 'idle');
  const stopTimer = () => {
    window.clearTimeout(sendTimer.current);
    setCountdown(null);
  };
  const show = () => {
    window.clearTimeout(hideTimer.current);
    setOpen(true);
  };
  const hide = () => {
    stopTimer();
    setOpen(false);
    setDraftBoth('');
    setInterim('');
    setReply('');
    caret.current = null;
  };
  const hideSoon = (ms = 2_500) => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!draftRef.current && phaseRef.current !== 'processing' && document.activeElement !== inputRef.current) hide();
    }, ms);
  };

  /** put spoken words where the cursor is (or at the end) */
  const insertSpoken = (words: string) => {
    const d = draftRef.current;
    const at = caret.current ?? d.length;
    const before = d.slice(0, at).trimEnd();
    const after = d.slice(at).trimStart();
    setDraftBoth([before, words, after].filter(Boolean).join(' '));
    caret.current = caret.current === null ? null : (before ? before.length + 1 : 0) + words.length;
  };

  // ── auto-send ──────────────────────────────────────────────────────────────

  /** send by itself after `ms` of quiet (2.5 s normally, 10 s after "wait") */
  const arm = (ms: number) => {
    window.clearTimeout(sendTimer.current);
    if (!draftRef.current.trim()) return setCountdown(null);
    setCountdown({ ms, key: Date.now() });
    sendTimer.current = window.setTimeout(() => void submit(true), ms);
  };

  // ── mic ────────────────────────────────────────────────────────────────────

  const stopMic = () => {
    want.current = false;
    window.clearTimeout(settleTimer.current);
    recRef.current?.abort();
    recRef.current = null;
  };

  const setInterimBoth = (v: string) => {
    interimRef.current = v;
    setInterim(v);
  };

  /**
   * Take the words on screen as said, without waiting for Chrome to call them
   * final. The session is dropped (so its late "final" can't arrive twice) and
   * a fresh one starts at once — which also keeps sessions short and quick.
   */
  const commitInterim = () => {
    window.clearTimeout(settleTimer.current);
    const heard = interimRef.current.trim();
    if (!heard) return;
    setInterimBoth('');
    recRef.current?.abort();
    onFinal(heard);
  };

  /** speak (mic paused so it doesn't hear itself), then go on in `after` */
  const say = async (text: string, after: Phase | null = null) => {
    setReply(text);
    if (live.current.talk && canSpeak()) {
      speakingRef.current = true;
      if (phaseRef.current !== 'processing') go('speaking');
      recRef.current?.abort();
      await speak(text);
      speakingRef.current = false;
      startMic();
    }
    if (after) go(after);
    else if (phaseRef.current === 'speaking' || phaseRef.current === 'processing') rest();
  };

  // ── running a request ──────────────────────────────────────────────────────

  const navigate = (url: string) => {
    router.push(url);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent(APPLY_URL_EVENT, { detail: url })), 60);
  };

  const finish = async (text: string) => {
    setDraftBoth('');
    caret.current = null;
    stopTimer();
    await say(text);
    rest();
    hideSoon();
  };

  const scrollTarget = () =>
    (document.querySelector('main div.overflow-auto:has(table)') as HTMLElement | null) ?? document.scrollingElement ?? document.documentElement;

  const doLocal = (a: LocalAnswer, text: string) => {
    void aiApi.logLocal(text, a.kind === 'control' ? null : a.url, a.kind).catch(() => undefined);
    if (a.kind === 'control') {
      // the assistant is open: "go back" = the previous report, filters / stats = change the report
      if (canvasFocus.on) {
        if (a.action === 'back') {
          window.dispatchEvent(new Event(AI_PREV_CANVAS_EVENT));
          return finish('Back to your previous report.');
        }
        if (a.action === 'clearFilters' || a.action === 'stats' || a.action === 'hideStats') {
          openAiDock(text);
          return awaitCanvas();
        }
      }
      const el = scrollTarget();
      const step = Math.round(window.innerHeight * 0.7);
      if (a.action === 'back') router.back();
      if (a.action === 'forward') window.history.forward();
      if (a.action === 'up') el.scrollBy({ top: -step, behavior: 'smooth' });
      if (a.action === 'down') el.scrollBy({ top: step, behavior: 'smooth' });
      if (a.action === 'top') el.scrollTo({ top: 0, behavior: 'smooth' });
      if (a.action === 'bottom') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      if (a.action === 'dark' || a.action === 'light') setTheme(a.action);
      if (a.action === 'reload') window.setTimeout(() => window.location.reload(), 600);
      if (a.action === 'clearFilters') navigate(window.location.pathname);
      if (a.action === 'stats') window.dispatchEvent(new CustomEvent(PAGE_STATS_EVENT));
      if (a.action === 'hideStats') window.dispatchEvent(new CustomEvent(PAGE_STATS_EVENT, { detail: false }));
      if (a.action === 'openAssistant') openAiDock();
      if (a.action === 'closeAssistant') window.dispatchEvent(new Event(AI_DOCK_CLOSE_EVENT));
      return finish(a.spoken || 'Done.');
    }
    navigate(a.url);
    return finish(a.spoken);
  };

  const doChat = async (c: ChatAnswer) => {
    show();
    if (c.kind === 'insights') {
      go('processing');
      setReply('Looking at the numbers…');
      try {
        const r = await aiApi.insights(c.page);
        return finish(r.lines.join(' '));
      } catch (e) {
        return finish(toApiError(e).message);
      }
    }
    if (c.then === 'mute') {
      await finish(c.text);
      return mute(true);
    }
    return finish(c.text);
  };

  const awaitCanvas = () => {
    window.clearTimeout(waitingCanvas.current);
    waitingCanvas.current = window.setTimeout(() => {
      if (phaseRef.current === 'processing') void finish('The report is taking a while. It will show up on the canvas.');
    }, 45_000);
  };

  /** auto = sent by the silence timer (credit guard applies); false = Enter / "go" */
  const submit = async (auto = false) => {
    const text = draftRef.current.trim();
    stopTimer();
    if (!text) return;
    touch();
    setInterim('');

    // 1. free, in the browser
    const local = resolveLocal(text, pagesRef.current);
    if (local) {
      go('processing');
      return doLocal(local, text);
    }
    const chat = smallTalk(text, { path: live.current.path, firstName: live.current.firstName });
    if (chat) {
      setDraftBoth('');
      return doChat(chat);
    }

    // 2. credit guard: always-on listening hears the room — only CRM talk is sent
    const forCanvas = isAnalytic(text) || isCanvasFollowUp(text) || (canvasFocus.on && soundsLikeCrm(text));
    // loose: only a lone stray word is dropped; everything else is sent and gets an answer or a question
    const stray = text.split(/\s+/).length < 2;
    if (auto && !soundsLikeCrm(text) && !forCanvas && (STRICT || stray)) {
      setDraftBoth('');
      setReply(stray ? '' : 'Ignored — that didn’t sound like a CRM request (nothing was sent).');
      // with the assistant workspace open this box is hidden — say it where it can be seen
      if (canvasFocus.on && !stray) toast.info('Ignored — that didn’t sound like a CRM request. Nothing was sent.');
      rest();
      return hideSoon(2_000);
    }

    go('processing');
    setReply('');
    sentRef.current = text;
    const run = ++runRef.current;
    if (live.current.talk) chime();
    const { me: m, canvasOk: cv } = live.current;

    // 3. the assistant (one brain): it filters the page, shows stats, explains or builds a report.
    //    Words answers come back in a small card; the workspace opens only for a report.
    if (cv) {
      try {
        if (!m?.active.canvas) {
          await aiApi.setPreference('CANVAS');
          await invalidateAiMe(qc);
        }
      } catch (e) {
        return finish(toApiError(e).message);
      }
      awaitCanvas();
      // stay on this page: the side panel answers (on /ai-canvas, the page does)
      openAiDock(text);
      return;
    }

    // 4. the server (templates are free; the LLM only when needed)
    let r: AiCommandResult;
    try {
      r = await aiApi.command(text);
    } catch (e) {
      refreshMe();
      return finish(toApiError(e).message);
    }
    if (run !== runRef.current) return; // "wait" / "cancel" came in meanwhile
    refreshMe(r.quota);
    switch (r.type) {
      case 'navigate': {
        navigate(r.url);
        if (r.url.startsWith('/ai-canvas')) return awaitCanvas();
        const spoken = r.spoken ?? r.summary;
        rememberCommand(text, r.url, spoken);
        if (r.note) toast.info(r.note);
        return finish(r.note ? `${spoken} ${r.note}` : spoken);
      }
      case 'search': {
        const ui = useUi.getState();
        ui.setCommandSeed(r.q);
        ui.setCommandOpen(true);
        return finish(r.message ?? `I couldn't match a page, so I searched for ${r.q}.`);
      }
      case 'clarify':
        setDraftBoth(text);
        caret.current = null;
        go('holding');
        await say(`${r.message} Add it, and I'll send it.`, 'holding');
        return arm(HOLD_MS);
      case 'rejected':
        if (r.suggestion) {
          const url = r.suggestion.url;
          toast.info(r.message, { action: { label: 'Open', onClick: () => navigate(url) } });
        }
        return finish(r.message);
      default:
        return finish(r.message);
    }
  };

  // while the assistant workspace is on screen it owns the typing box — this floating one stays hidden
  const [canvasOn, setCanvasOn] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setCanvasOn(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(CANVAS_FOCUS_EVENT, on);
    return () => window.removeEventListener(CANVAS_FOCUS_EVENT, on);
  }, []);

  // the workspace has its own box: what is being said shows up there, live
  useEffect(() => {
    if (!canvasOn) return;
    window.dispatchEvent(
      new CustomEvent(VOICE_DRAFT_EVENT, { detail: { text: joinText(draft, interim), sendInMs: interim ? null : (countdown?.ms ?? null), key: countdown?.key ?? 0 } })
    );
  }, [canvasOn, draft, interim, countdown]);

  // canvas results → speak them
  useEffect(() => {
    const onCanvas = (e: Event) => {
      if (phaseRef.current !== 'processing') return;
      window.clearTimeout(waitingCanvas.current);
      void finish(describeCanvas((e as CustomEvent<AiCanvasResult>).detail));
    };
    window.addEventListener(CANVAS_RESULT_EVENT, onCanvas);
    return () => window.removeEventListener(CANVAS_RESULT_EVENT, onCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── mute / wake ────────────────────────────────────────────────────────────

  const mute = (quiet = false) => {
    set({ muted: true });
    live.current.muted = true;
    hide();
    go('muted');
    if (!quiet) {
      toast('Jarvis muted', { description: 'Say “unmute”, “Jarvis”, or clap twice to wake it.' });
      void say('Muted.', 'muted');
    }
  };
  const unmute = (then = '') => {
    set({ muted: false });
    live.current.muted = false;
    go('idle');
    if (then) {
      show();
      insertSpoken(then);
      return arm(autoMs(draftRef.current));
    }
    show();
    if (Date.now() - lastActive() > GREET_AFTER_MS) void say('Yes, I am on. How can I help?', 'idle');
    else chime();
    touch();
    hideSoon(4_000);
  };

  // ── what was heard ─────────────────────────────────────────────────────────

  const onFinal = (raw: string) => {
    const t = norm(fixCrmWords(raw));
    window.clearTimeout(settleTimer.current);
    setInterimBoth('');
    if (!t) return;
    // an action card is asking "do it?" — yes / no / cancel answer it (not Jarvis's own go / cancel)
    if (aiPending.action && /^(yes|yeah|yep|ok|okay|confirm|do it|go ahead|go|sure|proceed|haan|no|nope|cancel|stop|never ?mind|leave it)( please| it| do it)?$/.test(t)) {
      openAiDock(t);
      return;
    }

    // "wait" / "cancel" after it already went: stop it, drop the answer, give the words back
    if (phaseRef.current === 'processing' && (WAIT.test(t) || CANCEL.test(t))) {
      runRef.current++;
      window.clearTimeout(waitingCanvas.current);
      window.dispatchEvent(new Event(AI_CANCEL_EVENT));
      if (CANCEL.test(t)) {
        hide();
        return rest();
      }
      setDraftBoth(sentRef.current);
      caret.current = null;
      show();
      go('holding');
      setReply('Stopped. Edit it — it sends when you say “go” or pause.');
      inputRef.current?.focus();
      return arm(HOLD_MS);
    }
    if (speakingRef.current) {
      if (/^(stop|quiet|enough|jarvis stop|ai stop)$/.test(t)) stopSpeaking();
      return;
    }
    const wake = WAKE.exec(t);
    const named = wake ? wake[1]!.trim() : null; // text after a name, '' = just the name
    const body = named ?? t;

    // asleep: "unmute", a name, or "<name> on" wakes it (and keeps what followed)
    if (live.current.muted) {
      if (t === 'unmute' || (named !== null && (ON.test(named) || !named))) unmute();
      else if (named) unmute(named);
      return;
    }
    if (MUTE.test(body)) return mute();
    if (named === '' || (named !== null && ON.test(named))) {
      show();
      chime();
      return;
    }

    const hasDraft = !!draftRef.current.trim();
    if (hasDraft) {
      if (GO.test(body)) return void submit(false);
      if (WAIT.test(body)) {
        go('holding');
        inputRef.current?.focus();
        return arm(HOLD_MS);
      }
      if (CANCEL.test(body)) {
        hide();
        return rest();
      }
      if (CLEAR.test(body)) {
        setDraftBoth('');
        caret.current = null;
        return stopTimer();
      }
      const pick = PICK.exec(body);
      if (pick) {
        const s = suggestionsRef.current[(NUMS[pick[1] ?? pick[2]!] ?? 0) - 1];
        if (s) {
          setDraftBoth(strip(s.text));
          caret.current = null;
          return arm(phaseRef.current === 'holding' ? HOLD_MS : AUTO_MS);
        }
      }
    } else {
      // a fresh sentence: free answers right away, no countdown
      if (STATUS.test(body)) {
        const q = live.current.me?.quota.command;
        show();
        return void finish(!q || q.max == null ? 'You have unlimited commands.' : `You have used ${q.used} of ${q.max} commands ${q.period === 'DAY' ? 'today' : 'this period'}.`);
      }
      // the screen itself ("go back", "reset filters", "show stats"): at once, no waiting for a pause
      const control = resolveLocal(body, pagesRef.current);
      if (control?.kind === 'control') {
        show();
        go('processing');
        return void doLocal(control, body);
      }
      if (HELP.test(body)) {
        show();
        go('idle');
        return void say('Here are some things you can ask.', 'idle');
      }
      const chat = smallTalk(body, { path: live.current.path, firstName: live.current.firstName });
      if (chat) return void doChat(chat);
      if (GO.test(body) || WAIT.test(body) || CANCEL.test(body)) return;
    }

    // dictation: type it in, then send after the quiet gap
    show();
    insertSpoken(body);
    const holding = phaseRef.current === 'holding';
    go(holding ? 'holding' : 'dictating');
    arm(holding ? HOLD_MS : AUTO_MS);
  };

  // the recogniser reads refs, so it always sees the latest state
  const startMic = () => {
    const Ctor = getSpeechCtor();
    if (!Ctor || !want.current || recRef.current || speakingRef.current) return;
    const rec = new Ctor();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => {
      micStartedAt.current = Date.now();
      setReconnecting(false);
    };
    rec.onresult = e => {
      if (recRef.current !== rec) return; // a session we already dropped
      let heard = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) onFinal(res[0].transcript);
        else heard += fixCrmWords(res[0].transcript);
      }
      if (heard && !live.current.muted) {
        setInterimBoth(heard);
        window.clearTimeout(sendTimer.current); // still talking — wait
        setCountdown(null);
        if (heard.trim().length > 3) show();
        // quiet for a moment with words on screen → they're said; don't wait for Chrome
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(commitInterim, SETTLE_MS);
      } else if (heard) {
        // muted: still listen for the wake word in what is being said
        interimRef.current = heard;
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(commitInterim, SETTLE_MS);
      }
    };
    rec.onerror = ev => {
      if (ev.error === 'network') return setReconnecting(true); // onend follows and reconnects
      if (ev.error === 'audio-capture') {
        want.current = false;
        go('off');
        return void toast.error('No microphone found', { description: 'Plug one in or pick it in the browser, then turn voice on again.' });
      }
      if (ev.error !== 'not-allowed' && ev.error !== 'service-not-allowed') return; // no-speech / aborted: normal
      // "not allowed" is usually just "no click on the page yet" — wait for one.
      // Only a real Block in the browser stops it (and even that is not saved:
      // allowing the mic later and reloading brings voice back).
      void micPermissionState().then(st => {
        if (st === 'denied') {
          want.current = false;
          go('off');
          toast.error('Microphone blocked', {
            description: 'Allow the microphone for this site (lock icon in the address bar), then reload.',
          });
        } else {
          setNeedsTap(true);
          go('off');
        }
      });
    };
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      if (!want.current || speakingRef.current) return;
      // reconnect at once; only a real storm of drops (bad network) is slowed, and only to 1 s
      const now = Date.now();
      restarts.current = [...restarts.current.filter(x => now - x < 10_000), now];
      const storm = restarts.current.length > 12;
      if (storm) setReconnecting(true);
      window.setTimeout(startMic, storm ? 1_000 : 0);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
    }
  };

  // mic runs by default while: voice on + command mode active + tab visible
  useEffect(() => {
    const sync = () => {
      const should = on && !reporting && available && supported && document.visibilityState === 'visible';
      if (should) {
        want.current = true;
        // not allowed yet: Chrome asks only after a click — wait for one instead of failing
        void micPermissionState().then(st => {
          if (!want.current) return;
          if (st === 'prompt') return setNeedsTap(true);
          startMic();
          if (phaseRef.current === 'off') rest();
        });
      } else {
        stopMic();
        stopSpeaking();
        if (phaseRef.current !== 'processing') go('off');
      }
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, reporting, available, supported]);

  useEffect(() => () => stopMic(), []);

  // reporting a problem: close the panel too (it would show in the screen replay)
  useEffect(() => {
    if (!reporting) return;
    if (useUi.getState().aiOpen) setOpen(false);
    if (on) toast('AI assistant paused while you report the problem', { description: 'It switches back on when you send or close the report.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reporting]);

  // waiting for a click: the first click / key press anywhere starts the mic
  useEffect(() => {
    if (!needsTap) return;
    return onNextGesture(() => {
      setNeedsTap(false);
      if (!want.current) return;
      startMic();
      if (phaseRef.current === 'off') rest();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsTap]);

  // watchdog: a mic that should be on but isn't is restarted within 2 s; an idle
  // session older than REFRESH_MS is swapped for a fresh one (long ones get slow)
  useEffect(() => {
    if (!on || reporting || !available || !supported) return;
    const id = window.setInterval(() => {
      if (!want.current || speakingRef.current || document.visibilityState !== 'visible') return;
      if (!recRef.current) return startMic();
      const idle = !interimRef.current && phaseRef.current !== 'dictating' && phaseRef.current !== 'holding';
      if (idle && micStartedAt.current && Date.now() - micStartedAt.current > REFRESH_MS) {
        micStartedAt.current = Date.now();
        recRef.current.abort(); // onend starts the next one
      }
    }, 2_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, reporting, available, supported]);

  // double clap: wakes it when muted, opens it when listening
  useEffect(() => {
    if (!on || reporting || !available || !supported) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    startClapDetector(() => {
      if (speakingRef.current) return;
      if (live.current.muted) unmute();
      else {
        show();
        chime();
      }
    })
      .then(s => (cancelled ? s() : (stop = s)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, reporting, available, supported]);

  // Ctrl/⌘+J — open for typing (the top bar auto-hides, so the key matters)
  useEffect(() => {
    if (!available) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (useUi.getState().aiOpen) hide();
        else show();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  // opened from the "Ask AI" button / Ctrl+J → focus the line
  useEffect(() => {
    if (open && !draftRef.current) window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const turnOn = async () => {
    const perm = await askMicPermission();
    if (perm !== 'granted') {
      toast.error(perm === 'denied' ? 'Microphone permission was refused' : 'No microphone found', {
        description: 'Allow the microphone for this site (lock icon in the address bar) and try again.',
      });
      return;
    }
    set({ on: true, muted: false });
    touch();
    if (live.current.talk) void speak('I am listening.');
  };

  /** Enter / Send while words are still being heard: they count as typed (no voice commands read into them) */
  const takeHeard = () => {
    window.clearTimeout(settleTimer.current);
    const heard = interimRef.current.trim();
    if (!heard) return;
    setInterimBoth('');
    recRef.current?.abort();
    insertSpoken(heard);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      takeHeard();
      void submit(false);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
      rest();
    }
  };

  if (!available) return null;

  const mood: OrbMood =
    phase === 'processing' ? 'thinking' : phase === 'speaking' ? 'speaking' : phase === 'muted' ? 'muted' : interim ? 'hearing' : 'listening';
  const liveOrb = phase !== 'off' && phase !== 'muted';
  const statusText = needsTap
    ? 'Click anywhere on the page to switch the mic on'
    : reconnecting && phase !== 'off'
      ? 'Reconnecting the microphone…'
      : STATUS_TEXT[phase];
  const busy = phase === 'processing';

  return (
    <>
      <style>{`@keyframes aiv-count { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>

      {/* ── the floating assistant (no box, no backdrop) ── */}
      {open && !canvasOn && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+var(--mobile-nav-h))] z-[60] flex flex-col items-center gap-1 px-4 print:hidden" role="region" aria-label="AI assistant">
          <div className="pointer-events-none -mb-6 drop-shadow-[0_0_30px_rgba(255,140,40,0.35)]">
            <AssistantOrb3D mood={mood} size={190} />
          </div>

          <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-500/25 bg-background/70 shadow-[0_8px_40px_-8px_rgba(255,140,40,0.45)] backdrop-blur-xl">
            <div className="flex items-end gap-2 p-2">
              <textarea
                ref={inputRef}
                value={interim ? joinText(draft, interim) : draft}
                rows={1}
                maxLength={me?.maxInputChars ?? 500}
                onChange={e => {
                  // typing over words still being heard: keep what is on screen, drop the pending audio
                  if (interimRef.current) {
                    window.clearTimeout(settleTimer.current);
                    setInterimBoth('');
                    recRef.current?.abort();
                  }
                  setDraftBoth(e.target.value);
                  caret.current = e.target.selectionStart;
                  // editing = they want time: hold, and restart the hold on each edit
                  if (phaseRef.current !== 'off') {
                    go('holding');
                    arm(HOLD_MS);
                  } else stopTimer();
                }}
                onSelect={e => {
                  const el = e.currentTarget;
                  caret.current = el.selectionStart >= el.value.length ? null : el.selectionStart;
                }}
                onKeyDown={onKeyDown}
                placeholder={phase === 'off' ? 'Type what you want to see… (Enter)' : 'Just talk — or type. It sends when you pause. Say “wait” to stop it.'}
                className="field-sizing-content max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-lg leading-snug outline-none placeholder:text-muted-foreground/70"
                aria-label="What you want"
                disabled={busy}
              />
              <Button
                size="icon"
                className="mb-0.5 shrink-0 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:opacity-90"
                onClick={() => {
                  takeHeard();
                  void submit(false);
                }}
                disabled={busy || !(draft.trim() || interim.trim())}
                aria-label="Send now"
                title="Send now (Enter, or say “go”)"
              >
                <ArrowUp />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="mb-0.5 shrink-0 rounded-full"
                onClick={() => {
                  hide();
                  rest();
                }}
                aria-label="Close (Esc, or say cancel)"
              >
                <X />
              </Button>
            </div>
            {/* countdown to auto-send */}
            {countdown && (
              <div className="h-1 bg-amber-500/10">
                <div
                  key={countdown.key}
                  className="h-full origin-left bg-gradient-to-r from-amber-400 to-orange-600"
                  style={{ animation: `aiv-count ${countdown.ms}ms linear forwards` }}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-xs text-muted-foreground">
              <span className={cn('font-medium', busy || liveOrb ? 'text-amber-600' : '')}>
                {countdown ? (phase === 'holding' ? `Sending in ${Math.round(countdown.ms / 1000)} s — say “go” to send now` : 'Sending… say “wait” to edit') : STATUS_TEXT[phase]}
              </span>
              {reply && <span className="text-foreground">{reply}</span>}
              <span className="ml-auto">{quotaLabel(me?.quota.command ?? null)} · read-only</span>
            </div>
          </div>

          {/* suggestions: what works, numbered for "option 2" */}
          {!busy && suggestions.length > 0 && (
            <div className="pointer-events-auto flex max-w-2xl flex-wrap justify-center gap-1.5 pt-1">
              {suggestions.map((s, i) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => {
                    setDraftBoth(strip(s.text));
                    caret.current = null;
                    inputRef.current?.focus();
                    if (phaseRef.current !== 'off') {
                      go('holding');
                      arm(HOLD_MS);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs shadow-sm backdrop-blur hover:border-amber-500/60"
                  title={s.mode === 'canvas' ? 'Builds a report in AI Canvas' : 'Opens the page with filters'}
                >
                  <span className="grid size-4 place-items-center rounded-full bg-amber-500/15 text-[10px] font-semibold text-amber-600">{i + 1}</span>
                  {s.text}
                  {s.mode === 'canvas' ? <BarChart3 className="size-3 text-fuchsia-500" /> : <MousePointerClick className="size-3 text-sky-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── the small orb (bottom-left): status light + settings ── */}
      <div className="pointer-events-none fixed bottom-[calc(1.25rem+var(--mobile-nav-h))] left-5 z-40 print:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`AI voice — ${statusText}`}
              title={statusText}
              className={cn(
                'pointer-events-auto relative grid size-12 place-items-center overflow-hidden rounded-full border shadow-lg',
                phase === 'off' && 'bg-card text-muted-foreground hover:text-foreground',
                phase === 'muted' && 'border-amber-400/60 bg-zinc-900 text-amber-500',
                liveOrb && 'border-amber-500/50 bg-black'
              )}
            >
              {liveOrb ? (
                <span className="absolute inset-0 grid place-items-center">
                  <JarvisSphere mood={mood} size={48} />
                </span>
              ) : (
                <MicOff className="size-5" />
              )}
              {reconnecting && phase !== 'off' && (
                <span className="absolute top-0.5 right-0.5 size-2.5 animate-pulse rounded-full bg-amber-400 ring-2 ring-black" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-80 space-y-3">
            <div>
              <p className="text-sm font-semibold">Jarvis — voice assistant</p>
              <p className="text-xs text-muted-foreground">
                {statusText}
              </p>
            </div>
            {!supported ? (
              <p className="text-xs text-muted-foreground">Voice needs Chrome or Edge. You can still type: Ctrl+J.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {on ? (
                    <Button size="sm" variant="outline" onClick={() => set({ on: false })}>
                      <MicOff /> Turn voice off
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void turnOn()}>
                      <Mic /> Turn voice on
                    </Button>
                  )}
                  {on && (
                    <Button size="sm" variant="outline" onClick={() => (muted ? unmute() : mute())}>
                      {muted ? 'Unmute' : 'Mute'}
                    </Button>
                  )}
                </div>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    {talk ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} Talk back
                  </span>
                  <Switch checked={talk} onCheckedChange={v => set({ talk: v })} />
                </label>
              </>
            )}
            <ul className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
              <li>
                Just talk — it types, then <b className="text-foreground">sends when you pause</b>.
              </li>
              <li>
                Screen: <b className="text-foreground">“go back”</b>, <b className="text-foreground">“reset filters”</b>,{' '}
                <b className="text-foreground">“show stats”</b>, <b className="text-foreground">“open / close assistant”</b>, “scroll down”,
                “refresh”.
              </li>
              <li>
                <b className="text-foreground">“wait”</b> = time to edit · <b className="text-foreground">“go”</b> = send now ·{' '}
                <b className="text-foreground">“cancel”</b>
              </li>
              <li>
                <b className="text-foreground">“mute”</b> · wake with <b className="text-foreground">“unmute”</b>, a name (Jarvis / AI / Rahul /
                Claude) or <b className="text-foreground">two claps</b>
              </li>
              <li>Chat: “how are you”, “what do you think about this page”, “any suggestions”.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Free: pages, chat, insights, mute, repeats. Talk that isn&apos;t about the CRM is ignored, never sent. Chrome turns speech
              into text with Google&apos;s speech service.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
