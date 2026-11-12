// File: suggestions.ts
// Path: src/features/ai/suggestions.ts
//
// What the assistant can actually answer — shown as numbered suggestions while
// the user speaks (voice) so they know the combinations that work. Pure
// client-side matching: free, instant, no AI call.
//   mode "command" → opens a page with filters (Clients, SPOCs, Pipeline …)
//   mode "canvas"  → builds a report in AI Canvas (counts, totals, top-N, trends)
// [brackets] = say your own value ("clients in [industry]" → "clients in Banking").

export type SuggestionMode = 'command' | 'canvas';
export interface Suggestion {
  text: string;
  mode: SuggestionMode;
  /** pages where it is most useful (path prefixes) */
  pages?: string[];
}

const C = (text: string, pages?: string[]): Suggestion => ({ text, mode: 'command', pages });
const R = (text: string, pages?: string[]): Suggestion => ({ text, mode: 'canvas', pages });
const CL = ['/clients'];
const SP = ['/spocs', '/approvals'];
const RUN = ['/pipeline-runs'];
const CV = ['/ai-canvas', '/dashboard', '/reports'];

export const SUGGESTIONS: Suggestion[] = [
  // clients (lists)
  C('show my clients', CL),
  C('active clients', CL),
  C('clients pending approval', CL),
  C('unassigned clients', CL),
  C('clients added this month', CL),
  C('new clients this week', CL),
  C('clients in [industry]', CL),
  C('clients of [person]', CL),
  C('clients without website', CL),
  C('clients with no SPOCs', CL),
  C('clients with no CSR figures', CL),
  C('clients never run in the pipeline', CL),
  C('clients with failed runs', CL),
  C('clients with branch offices', CL),
  C('clients sorted by CSR spent, highest first', CL),
  C('open [client name]', CL),
  // SPOCs
  C('my SPOCs', SP),
  C('SPOCs pending approval', SP),
  C('approved SPOCs', SP),
  C('SPOCs with bad emails', SP),
  C('SPOCs ready for outreach', SP),
  C('SPOCs of [client name]', SP),
  // pipeline
  C('failed pipeline runs', RUN),
  C('running pipeline runs', RUN),
  C('pipeline runs for [client name]', RUN),
  // pages
  C('open dashboard'),
  C('open approvals'),
  C('open office map'),
  C('open reports'),
  C('open outreach'),
  C('open notifications'),
  // canvas reports
  R('top 3 clients by CSR budget', CV),
  R('top 10 clients by CSR spent', CV),
  R('CSR spent by FY', CV),
  R('total CSR spent this FY', CV),
  R('how many active clients', CV),
  R('clients by industry', CV),
  R('clients by business unit', CV),
  R('new clients per month this year', CV),
  R('SPOCs by sales status', CV),
  R('SPOCs by approval status', CV),
  R('pipeline runs per day last 30 days', CV),
  R('pipeline runs by status', CV),
  R('outreach by status', CV),
];

/** numbers / totals / rankings / trends → AI Canvas; everything else → command */
const ANALYTIC =
  /\b(top|how many|count|number of|total|sum|average|avg|trend|per (day|week|month|year)|by (fy|industry|status|business unit|bu|sales status|approval|approval status|month|step|category|role)|compare|comparison|chart|graph|report|breakdown|split|rank(ing)?|lowest|least|most|highest|biggest|largest)\b/;
export const isAnalytic = (text: string) => {
  const t = text.toLowerCase();
  if (/\bsort(ed)?\b/.test(t)) return false; // "clients sorted by CSR spent" = a list
  return ANALYTIC.test(t);
};

const STOP = new Set(['the', 'and', 'with', 'for', 'show', 'open', 'give', 'me', 'all', 'of', 'in', 'my', 'a', 'an', 'to', 'by', 'ai', 'jarvis', 'please']);
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 1 && !STOP.has(w));

/** best suggestions for what is being said, on this page */
export const matchSuggestions = (said: string, path: string, opts: { canvas: boolean; limit?: number }) => {
  const want = words(said);
  const pool = SUGGESTIONS.filter(s => opts.canvas || s.mode === 'command');
  const scored = pool.map((s, i) => {
    const have = words(s.text);
    const hits = want.filter(w => have.some(h => h.startsWith(w) || w.startsWith(h))).length;
    const onPage = s.pages?.some(p => path.startsWith(p)) ? 0.6 : 0;
    return { s, score: (want.length ? hits * 2 : 0) + onPage - i / 1000 };
  });
  return scored
    .filter(x => !want.length || x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 5)
    .map(x => x.s);
};
