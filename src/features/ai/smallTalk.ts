// File: smallTalk.ts
// Path: src/features/ai/smallTalk.ts
//
// The chatty side of the assistant — all FREE, answered in the browser:
// greetings, "how are you", who are you, thanks, time / date, a joke, bye.
// "What do you think about this page / any suggestions / forecast" is detected
// here too and answered by /ai/insights (rule-based numbers, also free).
// Nothing here calls the AI model.

export type ChatAnswer =
  | { kind: 'say'; text: string; then?: 'mute' | 'help' }
  | { kind: 'insights'; page: 'clients' | 'spocs' | 'pipeline' | 'overview' };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"'.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const pick = <T,>(xs: T[]) => xs[Math.floor(Date.now() / 1000) % xs.length]!;

const dayPart = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const JOKES = [
  'Why did the sales rep bring a ladder? To close a higher deal.',
  'I asked the CRM for a date. It gave me a follow-up reminder.',
  'Our pipeline is like my coffee — it works best when it keeps flowing.',
  'Why do SPOCs love spreadsheets? They finally feel like they have cells of their own.',
];

const pageOf = (path: string): 'clients' | 'spocs' | 'pipeline' | 'overview' =>
  path.startsWith('/clients') || path.startsWith('/map')
    ? 'clients'
    : path.startsWith('/spocs') || path.startsWith('/approvals')
      ? 'spocs'
      : path.startsWith('/pipeline-runs')
        ? 'pipeline'
        : 'overview';

const INSIGHTS =
  /\b(what do you think|your (thoughts|opinion|view)|thoughts on|insights?|analy[sz]e|analysis|summar(y|ise|ize)|how (are we|am i|is it|is the business) doing|forecast|predict(ion)?|projection|suggestions?|suggest something|anything (interesting|important|i should know)|tips?|advice|recommend(ations?)?|what should i (do|focus on))\b/;

export const smallTalk = (raw: string, ctx: { path: string; firstName?: string | undefined }): ChatAnswer | null => {
  const t = norm(raw);
  if (!t) return null;
  const name = ctx.firstName ? `, ${ctx.firstName}` : '';

  if (INSIGHTS.test(t)) return { kind: 'insights', page: pageOf(ctx.path) };
  if (/^(hi|hello|hey|hii+|hey there|good (morning|afternoon|evening)|namaste|namaskara|yo)( jarvis| ai| there)?$/.test(t))
    return { kind: 'say', text: `${dayPart()}${name}! What would you like to see?` };
  if (/\b(how are (you|u)|how r u|how('s| is) it going|how do you do|how have you been|what'?s up|wassup|kaise ho|hegiddiya)\b/.test(t))
    return {
      kind: 'say',
      text: pick([
        `I'm doing great${name}, thanks for asking. Ready when you are.`,
        `All good here${name}. Your data is safe and I'm listening.`,
        `Running smoothly${name}. What shall we look at?`,
      ]),
    };
  if (/\b(who are you|what('s| is) your name|what are you|introduce yourself)\b/.test(t))
    return {
      kind: 'say',
      text: "I'm Jarvis, your CRM assistant. I open pages, find clients and SPOCs, and build reports. I can only read — I never change anything.",
    };
  if (/^(thanks|thank you|thank u|thx|great|awesome|nice|perfect|good job|well done|cool|super)( jarvis| ai)?$/.test(t))
    return { kind: 'say', text: pick(['Anytime.', "You're welcome.", 'Happy to help.']) };
  if (/^(what can you do|what can i (ask|say)|help me|how do i use you)$/.test(t))
    return {
      kind: 'say',
      text: 'Ask for a page, like open clients. Or a list, like active clients in Banking. Or a report, like top three clients by CSR budget. You can also ask what I think about this page.',
      then: 'help',
    };
  if (/\b(what time is it|what'?s the time|time now|current time)\b/.test(t))
    return { kind: 'say', text: `It's ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.` };
  if (/\b(what('s| is) (the )?date|today'?s date|what day is it)\b/.test(t))
    return { kind: 'say', text: `Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.` };
  if (/\b(joke|make me laugh|something funny)\b/.test(t)) return { kind: 'say', text: pick(JOKES) };
  if (/^(bye|goodbye|good night|see you|see ya|that'?s all|that is all|stop for now)( jarvis| ai)?$/.test(t))
    return { kind: 'say', text: `Bye${name}! I'll stay quiet — say Jarvis or clap twice when you need me.`, then: 'mute' };
  return null;
};

// ── credit guard ─────────────────────────────────────────────────────────────
// Always-on listening hears the room. Only speech that is clearly about the CRM
// is sent to the server; everything else is ignored (₹0).

const CRM_WORDS =
  /\b(clients?|compan(y|ies)|spocs?|contacts?|leads?|accounts?|runs?|pipeline|reports?|csr|budget|spent|spend|obligation|unspent|fy|financial year|approvals?|approved|pending|outreach|emails?|mails?|map|offices?|dashboard|users?|people|industry|industries|sectors?|business units?|bu|service lines?|sales|websites?|branch(es)?|canvas|chart|graph|figures|notifications?|assigned|handler|failed|programmes?|programs?|agency|agencies|state|city)\b/;

export const soundsLikeCrm = (text: string) => CRM_WORDS.test(norm(text));
