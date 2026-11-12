// File: localIntents.ts
// Path: src/features/ai/localIntents.ts
//
// The FREE tier of the assistant — answered in the browser, no AI call:
//   • pages by name: "open clients", "go to SPOCs", "show the office map",
//     "take me to dashboard" … (only pages this user can see in the sidebar)
//   • controls: back / forward / scroll up, down, top, bottom / dark / light mode
//   • repeats: a command that worked before is replayed from this browser's
//     memory (same words → same page), so popular commands stop costing money.
// Each local answer is still logged to the server at ₹0 (aiApi.logLocal), so
// the usage dashboard shows the assistant getting cheaper month by month.

import type { NavItem } from '@/config/navigation';

export type LocalAnswer =
  | { kind: 'page'; url: string; spoken: string }
  | { kind: 'repeat'; url: string; spoken: string }
  | { kind: 'control'; action: 'back' | 'forward' | 'up' | 'down' | 'top' | 'bottom' | 'dark' | 'light'; spoken: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"'.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const LEAD = /^(?:(?:please|pls|can you|could you|just|now)\s+)*(?:open|go to|goto|show|show me|take me to|navigate to|switch to|launch|display|bring up|jump to|move to|visit)?\s*(?:the)?\s*/;
const TAIL = /\s*(?:page|screen|tab|section|list|module|please)$/;

// extra words people use for pages (href → names)
const ALIASES: Record<string, string[]> = {
  '/dashboard': ['home', 'dashboard', 'overview', 'main page', 'homepage'],
  '/clients': ['clients', 'client', 'companies', 'accounts', 'leads', 'client list'],
  '/spocs': ['spocs', 'spoc', 'contacts', 'people at clients', 'spoc list'],
  '/map': ['map', 'office map', 'offices', 'client map'],
  '/approvals': ['approvals', 'approval', 'approval queue', 'pending approvals'],
  '/pipeline-runs': ['pipeline', 'pipeline runs', 'runs', 'jobs'],
  '/ai-canvas': ['canvas', 'ai canvas', 'report builder'],
  '/notifications': ['notifications', 'alerts for me', 'inbox'],
  '/help': ['help', 'help center', 'help centre', 'faq', 'faqs'],
  '/settings': ['settings', 'my settings', 'profile', 'preferences'],
};

/** page name → page, from what the sidebar shows this user */
export const buildPageIndex = (items: NavItem[]) => {
  const index = new Map<string, NavItem>();
  for (const it of items) {
    const names = [it.label, ...(ALIASES[it.href] ?? []), ...(it.keywords ?? [])];
    for (const n of names) {
      const k = norm(n);
      if (k && !index.has(k)) index.set(k, it);
    }
  }
  return index;
};

const CONTROLS: [RegExp, Extract<LocalAnswer, { kind: 'control' }>['action'], string][] = [
  [/^(go )?back$|^previous page$/, 'back', 'Going back.'],
  [/^(go )?forward$|^next page$/, 'forward', 'Going forward.'],
  [/^scroll up$|^up$|^page up$/, 'up', ''],
  [/^scroll down$|^down$|^page down$/, 'down', ''],
  [/^(scroll to |go to )?(the )?top$/, 'top', ''],
  [/^(scroll to |go to )?(the )?bottom$/, 'bottom', ''],
  [/^(dark mode|dark theme|night mode|turn on dark mode)$/, 'dark', 'Dark mode.'],
  [/^(light mode|light theme|day mode|turn on light mode)$/, 'light', 'Light mode.'],
];

// ── repeats: remembered successful commands (this browser only) ──────────────

const CACHE_KEY = 'crm:ai-repeats';
const CACHE_MAX = 150;
const CACHE_TTL = 14 * 24 * 3600_000;

type Remembered = { url: string; spoken: string; at: number; uses: number };
const readCache = (): Record<string, Remembered> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, Remembered>;
  } catch {
    return {};
  }
};

/** remember a command that opened a page (not canvas — that needs fresh numbers) */
export const rememberCommand = (text: string, url: string, spoken: string) => {
  if (url.startsWith('/ai-canvas')) return;
  try {
    const all = readCache();
    const k = norm(text);
    all[k] = { url, spoken, at: Date.now(), uses: (all[k]?.uses ?? 0) + 1 };
    const keep = Object.entries(all)
      .filter(([, v]) => Date.now() - v.at < CACHE_TTL)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, CACHE_MAX);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch {
    /* storage off — just not remembered */
  }
};

/** the free answer for this text, or null → ask the server */
export const resolveLocal = (raw: string, pages: Map<string, NavItem>): LocalAnswer | null => {
  const t = norm(raw);
  if (!t) return null;

  for (const [re, action, spoken] of CONTROLS) if (re.test(t)) return { kind: 'control', action, spoken };

  // page by name — the WHOLE request must be a page name (filters go to the server)
  const name = t.replace(LEAD, '').replace(TAIL, '').trim();
  const page = pages.get(name);
  if (page) return { kind: 'page', url: page.href, spoken: `Opening ${page.label}.` };

  const hit = typeof window === 'undefined' ? undefined : readCache()[t];
  if (hit && Date.now() - hit.at < CACHE_TTL) return { kind: 'repeat', url: hit.url, spoken: hit.spoken };
  return null;
};
