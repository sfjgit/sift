// File: recorder.ts
// Path: src/features/support/recorder.ts
//
// The flight recorder behind "Report a problem" (16 Nov 2026). Always on, kept
// small, so a bug can be seen even when the reporter can't describe it:
//   • the last 60 browser errors / warnings, API calls and clicks (labels only —
//     never what was typed)
//   • a rolling screen replay of the last ~2 minutes (rrweb), loaded once the
//     page is idle; passwords are always masked, anything marked
//     `data-private` / class "rr-block" is blanked
//   • on demand, a longer recording while the user shows the steps again
// Nothing leaves the browser until the user presses Send.

import type { AxiosInstance } from 'axios';

export interface NetCall {
  method: string;
  url: string;
  status: number;
  ms: number;
  at: string;
  requestId?: string;
  message?: string;
}
export interface ConsoleLine {
  level: 'error' | 'warn';
  msg: string;
  stack?: string;
  at: string;
}
export interface Crumb {
  at: string;
  type: 'click' | 'nav' | 'input' | 'key' | 'submit';
  label: string;
  path?: string;
}
type RrEvent = { timestamp: number; type: number; data?: unknown };

const KEEP = 60;
const SEGMENT_MS = 60_000; // a full snapshot every minute; keep the last two minutes
const now = () => new Date().toISOString();
const push = <T>(arr: T[], v: T) => {
  arr.push(v);
  if (arr.length > KEEP) arr.splice(0, arr.length - KEEP);
};

const net: NetCall[] = [];
const logs: ConsoleLine[] = [];
const crumbs: Crumb[] = [];
let segments: RrEvent[][] = [[]];
let repro: RrEvent[] | null = null;
let reproStarted = 0;
let stopRolling: (() => void) | null = null;
let installed = false;

const text = (v: unknown) => {
  if (v instanceof Error) return v.message;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

/** a readable name for what was clicked — aria-label, title, text; never input values */
const labelOf = (el: Element | null): string | null => {
  const target = el?.closest(
    'button,a,[role=button],[role=menuitem],[role=tab],[role=option],label,th,td,input,select,textarea,summary'
  );
  if (!target) return null;
  // the report form itself is not a step of the problem
  if (target.closest('[data-support-ui]')) return null;
  if (target.closest('[data-private],.rr-block')) return '(private area)';
  if (target.tagName === 'TD') {
    const row = target.closest('tr');
    const first = [...(row?.cells ?? [])].map(c => (c.textContent ?? '').trim()).find(Boolean);
    const col = target
      .closest('table')
      ?.querySelector(`thead th:nth-child(${(target as HTMLTableCellElement).cellIndex + 1})`)
      ?.textContent?.trim();
    return `row “${(first ?? 'a row').slice(0, 50)}”${col ? ` › ${col.slice(0, 30)}` : ''}`;
  }
  const aria =
    target.getAttribute('aria-label') ??
    target.getAttribute('title') ??
    target.getAttribute('placeholder');
  if (aria) return aria.slice(0, 80);
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    const id =
      target.id && document.querySelector(`label[for="${CSS.escape(target.id)}"]`)?.textContent;
    return (id || target.name || target.type || 'field').slice(0, 80);
  }
  const t = (target.textContent ?? '').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, 80) : target.tagName.toLowerCase();
};

/** start once, as early as possible (AppShell) */
export const installRecorder = (http: AxiosInstance) => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // browser errors & warnings (still printed as before)
  for (const level of ['error', 'warn'] as const) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        const err = args.find(a => a instanceof Error) as Error | undefined;
        push(logs, {
          level,
          msg: args.map(text).join(' ').slice(0, 1000),
          stack: err?.stack?.slice(0, 2000),
          at: now(),
        });
      } catch {
        /* never break logging */
      }
      orig(...args);
    };
  }
  window.addEventListener('error', e =>
    push(logs, {
      level: 'error',
      msg: e.message || 'Script error',
      stack: (e.error as Error | undefined)?.stack?.slice(0, 2000),
      at: now(),
    })
  );
  window.addEventListener('unhandledrejection', e =>
    push(logs, {
      level: 'error',
      msg: `Unhandled: ${text(e.reason)}`.slice(0, 1000),
      stack: (e.reason as Error | undefined)?.stack?.slice(0, 2000),
      at: now(),
    })
  );

  // what was clicked / submitted / which field was used (not its value)
  document.addEventListener(
    'click',
    e => {
      const label = labelOf(e.target as Element);
      if (label) push(crumbs, { at: now(), type: 'click', label });
    },
    { capture: true, passive: true }
  );
  document.addEventListener(
    'change',
    e => {
      const label = labelOf(e.target as Element);
      if (label) push(crumbs, { at: now(), type: 'input', label });
    },
    { capture: true, passive: true }
  );
  document.addEventListener(
    'keydown',
    e => {
      if ((e.target as Element | null)?.closest?.('[data-support-ui]')) return;
      if (
        e.key === 'Enter' ||
        e.key === 'Escape' ||
        ((e.ctrlKey || e.metaKey) && e.key.length === 1)
      )
        push(crumbs, {
          at: now(),
          type: 'key',
          label: `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey && e.key.length === 1 ? 'Shift+' : ''}${e.key.length === 1 ? e.key.toUpperCase() : e.key}`,
        });
    },
    { capture: true, passive: true }
  );

  // every API call: method, path, status, time, the server's request id
  http.interceptors.request.use(cfg => {
    (cfg as { _t?: number })._t = performance.now();
    return cfg;
  });
  const record = (
    cfg: { method?: string; url?: string; _t?: number } | undefined,
    status: number,
    headers: unknown,
    message?: string
  ) => {
    if (!cfg?.url || cfg.url.startsWith('/tickets')) return;
    const h = headers as Record<string, string> | undefined;
    push(net, {
      method: (cfg.method ?? 'get').toUpperCase(),
      url: cfg.url.split('?')[0]!.slice(0, 300) + (cfg.url.includes('?') ? '?…' : ''),
      status,
      ms: Math.round(performance.now() - (cfg._t ?? performance.now())),
      at: now(),
      requestId: h?.['x-request-id'],
      message: message?.slice(0, 300),
    });
  };
  http.interceptors.response.use(
    res => {
      record(res.config, res.status, res.headers);
      return res;
    },
    err => {
      const e = err as {
        config?: { method?: string; url?: string; _t?: number };
        response?: { status: number; headers: unknown; data?: { message?: string } };
        message?: string;
      };
      record(
        e.config,
        e.response?.status ?? 0,
        e.response?.headers,
        e.response?.data?.message ?? e.message
      );
      return Promise.reject(err);
    }
  );

  // the rolling replay, once the page has settled
  const idle = (
    window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }
  ).requestIdleCallback;
  const start = () => void startRolling();
  if (idle) idle(start, { timeout: 8000 });
  else setTimeout(start, 3000);
};

/** route changes (called from a component that sees the pathname) */
export const noteNavigation = (path: string) =>
  push(crumbs, { at: now(), type: 'nav', label: document.title || path, path });

const startRolling = async () => {
  if (stopRolling) return;
  const { record } = await import('rrweb');
  stopRolling =
    record({
      emit: (ev: RrEvent, isCheckout?: boolean) => {
        if (isCheckout) {
          segments.push([]);
          if (segments.length > 3) segments = segments.slice(-3);
        }
        segments[segments.length - 1]!.push(ev);
        repro?.push(ev);
      },
      checkoutEveryNms: SEGMENT_MS,
      maskInputOptions: { password: true },
      blockClass: 'rr-block',
      blockSelector: '[data-private]',
      sampling: { mousemove: 100, scroll: 150, input: 'last', media: 800 },
      recordCanvas: false,
      collectFonts: false,
      inlineImages: false,
    }) ?? null;
};

/** the minutes before now (starts with a full snapshot, so it can be played alone) */
export const replayBefore = (): RrEvent[] => {
  const evs = segments.slice(-3).flat();
  const first = evs.findIndex(e => e.type === 4); // Meta, followed by the full snapshot
  return first >= 0 ? evs.slice(first) : [];
};

export const isReproRecording = () => repro !== null;

/** start a longer recording while the user shows the steps */
export const startRepro = async () => {
  await startRolling();
  const { record } = await import('rrweb');
  repro = [];
  reproStarted = Date.now();
  // a fresh full snapshot so the recording stands alone
  record.takeFullSnapshot(true);
};

export const stopRepro = () => {
  const evs = repro ?? [];
  repro = null;
  const first = evs.findIndex(e => e.type === 4);
  return { events: first >= 0 ? evs.slice(first) : evs, ms: Date.now() - reproStarted };
};

const browser = () => {
  const ua = navigator.userAgent;
  const m = /(Edg|Chrome|Firefox|Safari)\/(\d+)/.exec(ua);
  return m ? `${m[1] === 'Edg' ? 'Edge' : m[1]} ${m[2]}` : ua.slice(0, 60);
};

/** everything except the replay — sent with the ticket */
export const snapshotContext = (since?: number) => {
  const after = (at: string) => !since || new Date(at).getTime() >= since;
  return {
    env: {
      browser: browser(),
      platform:
        (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
        navigator.platform,
      screen: `${screen.width}×${screen.height}`,
      window: `${innerWidth}×${innerHeight}`,
      zoom: Math.round(devicePixelRatio * 100) / 100,
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    },
    page: { url: location.pathname + location.search, title: document.title },
    network: net.filter(n => after(n.at)),
    console: logs.filter(l => after(l.at)),
    crumbs: crumbs.filter(c => after(c.at)),
  };
};

/** short counts for the dialog ("2 errors, 1 failed request, 14 clicks") */
export const evidenceCounts = () => ({
  errors: logs.filter(l => l.level === 'error').length,
  failed: net.filter(n => n.status === 0 || n.status >= 400).length,
  steps: crumbs.length,
});

// ── packing ─────────────────────────────────────────────────────────────────

const toB64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** events → gzip → base64 (a few hundred KB for two minutes) */
export const packEvents = async (events: RrEvent[]) => {
  const stream = new Blob([JSON.stringify(events)])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return toB64(await new Response(stream).arrayBuffer());
};

export const unpackEvents = async (gz: ArrayBuffer): Promise<RrEvent[]> => {
  const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text()) as RrEvent[];
};

/** a JPEG of the page as it is now (support UI excluded) */
export const takeScreenshot = async () => {
  const { toJpeg } = await import('html-to-image');
  const url = await toJpeg(document.body, {
    // what is on screen, not the whole scrolled page
    width: innerWidth,
    height: innerHeight,
    style: { transform: `translate(${-scrollX}px, ${-scrollY}px)` },
    quality: 0.7,
    pixelRatio: Math.min(1, devicePixelRatio),
    cacheBust: false,
    skipFonts: true,
    filter: n =>
      !(
        n instanceof HTMLElement &&
        (n.dataset.supportUi !== undefined || n.dataset.private !== undefined)
      ),
  });
  return url.replace(/^data:image\/jpeg;base64,/, '');
};
