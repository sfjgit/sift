// File: page.tsx
// Path: src/app/(app)/help/pipeline/page.tsx
//
// Help → How the pipeline works. A visual guide for everyone using the
// pipeline: the journey from a client to a reply, what happens behind the
// scenes after "Run", each step, the statuses, everyday situations and where
// to look for what. Static content — keep it in step with features/pipeline.

'use client';

import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bot,
  Building2,
  ChevronRight,
  Coins,
  Eye,
  FileSearch,
  GitBranch,
  IndianRupee,
  Linkedin,
  Mail,
  MailCheck,
  MessageSquareReply,
  ScanSearch,
  Send,
  ShieldAlert,
  ShieldCheck,
  Table2,
  User,
  UserSearch,
  type LucideIcon,
  Gauge,
  Lock,
  Repeat,
  UserCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { OUTREACH_STATUS, Pill, STEP_STATUS } from '@/components/common/badges';
import { cn } from '@/lib/utils';
import type { OutreachStatus, StepRunStatus } from '@/types/crm';

// ── building blocks ──────────────────────────────────────────────────────────

type Who = 'auto' | 'you';

const WHO: Record<Who, { label: string; icon: LucideIcon; box: string; chip: string }> = {
  auto: {
    label: 'Pipeline',
    icon: Bot,
    box: 'border-primary/30 bg-primary/5',
    chip: 'bg-primary/10 text-primary',
  },
  you: {
    label: 'You',
    icon: User,
    box: 'border-warning/40 bg-warning/8',
    chip: 'bg-warning/15 text-warning',
  },
};

function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{lead}</p>
      </div>
      {children}
    </section>
  );
}

function Node({
  icon: Icon,
  title,
  line,
  who,
}: {
  icon: LucideIcon;
  title: string;
  line: string;
  who: Who;
}) {
  const w = WHO[who];
  return (
    <div className={cn('rounded-lg border p-3', w.box)}>
      <div className="flex items-center gap-2">
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-md', w.chip)}>
          <Icon className="size-4" />
        </span>
        <span className="text-[13px] leading-tight font-semibold">{title}</span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{line}</p>
    </div>
  );
}

const Down = () => (
  <div className="flex justify-center text-muted-foreground/60">
    <ArrowDown className="size-4" />
  </div>
);

function WhoKey() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {(Object.keys(WHO) as Who[]).map(k => {
        const w = WHO[k];
        return (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={cn('grid size-5 place-items-center rounded', w.chip)}>
              <w.icon className="size-3" />
            </span>
            {k === 'auto' ? 'The pipeline does it' : 'A person does it'}
          </span>
        );
      })}
    </div>
  );
}

// ── 1. the journey ───────────────────────────────────────────────────────────

const PHASES: {
  title: string;
  when: string;
  nodes: { icon: LucideIcon; title: string; line: string; who: Who }[];
}[] = [
  {
    title: '1 · Research the company',
    when: 'Steps 1–3',
    nodes: [
      {
        icon: FileSearch,
        title: 'Find CSR reports',
        line: 'Annual report, BRSR and CSR reports from the website',
        who: 'auto',
      },
      {
        icon: ScanSearch,
        title: 'SPOCs from reports',
        line: 'Named CSR contacts in those PDFs',
        who: 'auto',
      },
      {
        icon: IndianRupee,
        title: 'CSR figures & programs',
        line: 'Obligation, spend and the programmes funded',
        who: 'auto',
      },
    ],
  },
  {
    title: '2 · Find the right people',
    when: 'Steps 4–6',
    nodes: [
      {
        icon: Linkedin,
        title: 'LinkedIn & email search',
        line: 'Profiles and work emails for each SPOC',
        who: 'auto',
      },
      {
        icon: UserSearch,
        title: 'Apollo decision-makers',
        line: 'Verified emails and phones, or new CSR heads',
        who: 'auto',
      },
      {
        icon: BadgeCheck,
        title: 'Validate & score',
        line: '0–100 score per SPOC: Ready, Review or Not usable',
        who: 'auto',
      },
    ],
  },
  {
    title: '3 · Decide who to contact',
    when: 'Approvals page',
    nodes: [
      {
        icon: Eye,
        title: 'Check what was found',
        line: 'Differences and unsure figures wait for you on the run',
        who: 'you',
      },
      {
        icon: ShieldCheck,
        title: 'Approve SPOCs',
        line: 'Only approved SPOCs ever get emails',
        who: 'you',
      },
    ],
  },
  {
    title: '4 · Reach out',
    when: 'Step 7 + Outreach page',
    nodes: [
      {
        icon: Mail,
        title: 'Write emails',
        line: 'A first email + 5 follow-ups per approved SPOC',
        who: 'auto',
      },
      {
        icon: Eye,
        title: 'Review & edit',
        line: 'Read them, fix anything, mark the pack reviewed',
        who: 'you',
      },
      {
        icon: Send,
        title: 'Send from Outlook',
        line: 'Copy, send, then mark each email sent',
        who: 'you',
      },
      {
        icon: MessageSquareReply,
        title: 'Record the outcome',
        line: 'Replied, No reply or Bounced, with a note',
        who: 'you',
      },
    ],
  },
];

function Journey() {
  return (
    <div className="space-y-3">
      <WhoKey />
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {PHASES.map((p, i) => (
          <div key={p.title} className="contents">
            <div className="flex flex-col rounded-xl border bg-card p-3 shadow-card">
              <div className="mb-3">
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.when}</p>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                {p.nodes.map((n, j) => (
                  <div key={n.title} className="space-y-1.5">
                    {j > 0 && <Down />}
                    <Node {...n} />
                  </div>
                ))}
              </div>
            </div>
            {i < PHASES.length - 1 && (
              <div className="flex items-center justify-center text-muted-foreground/60">
                <ArrowRight className="hidden size-5 lg:block" />
                <ArrowDown className="size-5 lg:hidden" />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Run all steps</span> does phases 1 and 2 in
        one go and stops before approval. Nothing is ever emailed by the CRM itself.
      </p>
    </div>
  );
}

// ── 2. behind the scenes ─────────────────────────────────────────────────────

type Lane = 'you' | 'crm' | 'engine';
const LANES: Record<Lane, { label: string; cls: string }> = {
  you: { label: 'You', cls: 'bg-warning/15 text-warning' },
  crm: { label: 'CRM', cls: 'bg-info/12 text-info' },
  engine: { label: 'Pipeline engine', cls: 'bg-primary/10 text-primary' },
};

const SCENES: { lane: Lane; title: string; detail: string; see: string }[] = [
  {
    lane: 'you',
    title: 'You click Run',
    detail: 'Pick options; paid ones show a coin.',
    see: 'Run dialog',
  },
  {
    lane: 'crm',
    title: 'Checks and records the run',
    detail: 'Is there input (reports, SPOCs)? Already running? Saves the run as Queued.',
    see: 'Card: Queued',
  },
  {
    lane: 'crm',
    title: 'Hands the job to the engine',
    detail: 'Sends the client, its SPOCs and reports.',
    see: 'Timeline: “Accepted…”',
  },
  {
    lane: 'engine',
    title: 'Does the work',
    detail:
      'Searches, reads PDFs, calls Apollo / Bright Data / Claude. Sends progress every few seconds.',
    see: 'Card: Running + live note',
  },
  {
    lane: 'engine',
    title: 'Sends the results back',
    detail: 'Everything it found, plus credits and cost used.',
    see: 'Timeline: “Results received”',
  },
  {
    lane: 'crm',
    title: 'Saves them safely',
    detail:
      'Fills blanks only. Different values and unsure figures are kept aside for you. New people start as pending.',
    see: 'Run: What this run produced',
  },
  {
    lane: 'crm',
    title: 'Tells you',
    detail: 'The card shows what was done; you get a notification.',
    see: 'Bell + card note',
  },
];

const NETS: { icon: LucideIcon; title: string; line: string }[] = [
  {
    icon: GitBranch,
    title: 'Lost message? Checked again',
    line: 'If no result arrives, the CRM asks the engine every 2 minutes and saves what it has.',
  },
  {
    icon: ShieldAlert,
    title: 'Engine down? Admins know',
    line: 'System alerts within minutes; it clears itself when the engine is back.',
  },
  {
    icon: Coins,
    title: 'Nothing to work on? Skipped',
    line: 'No reports or no SPOCs → the step is skipped with the reason, at no cost.',
  },
  {
    icon: ShieldCheck,
    title: 'Your data is never overwritten',
    line: 'A different phone or email is listed for you to review, not replaced.',
  },
];

function BehindTheScenes() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <ol className="relative space-y-2 rounded-xl border bg-card p-4 shadow-card">
        {SCENES.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[28px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="grid size-7 place-items-center rounded-full border bg-background text-xs font-semibold">
                {i + 1}
              </span>
              {i < SCENES.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', LANES[s.lane].cls)}
                >
                  {LANES[s.lane].label}
                </span>
                <span className="text-[13px] font-semibold">{s.title}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Where you see it: <span className="font-medium text-foreground">{s.see}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Safety nets</p>
        {NETS.map(n => (
          <div key={n.title} className="flex gap-3 rounded-xl border bg-card p-3 shadow-card">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-success/12 text-success">
              <n.icon className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.line}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. the steps ─────────────────────────────────────────────────────────────

const STEPS: {
  n: number;
  icon: LucideIcon;
  title: string;
  does: string;
  needs: string;
  paid: string;
  see: string;
  example: string;
}[] = [
  {
    n: 1,
    icon: FileSearch,
    title: 'Find CSR reports',
    does: 'Downloads the annual report, BRSR and CSR reports from the client’s website.',
    needs: 'The right website on the client',
    paid: 'Free',
    see: 'CSR tab → Documents',
    example: '“2 reports saved”',
  },
  {
    n: 2,
    icon: ScanSearch,
    title: 'SPOCs from reports',
    does: 'Reads the reports for named CSR contacts and adds them as SPOCs.',
    needs: 'Reports',
    paid: 'Free',
    see: 'SPOCs tab, as pending',
    example: '“2 new SPOCs to approve”',
  },
  {
    n: 3,
    icon: IndianRupee,
    title: 'CSR figures & programs',
    does: 'Reads CSR obligation, spend, unspent and the programmes the client funds.',
    needs: 'Reports',
    paid: 'Claude',
    see: 'CSR tab',
    example: '“2 years of figures to check · 18 programmes”',
  },
  {
    n: 4,
    icon: Linkedin,
    title: 'LinkedIn & email search',
    does: 'Finds each SPOC’s LinkedIn profile and a work email.',
    needs: 'SPOCs',
    paid: 'Bright Data, if switched on',
    see: 'SPOC page',
    example: '“1 SPOC updated”',
  },
  {
    n: 5,
    icon: UserSearch,
    title: 'Apollo decision-makers',
    does: 'Gets verified emails and phones; can also find new CSR / ESG heads.',
    needs: 'SPOCs, or “Find new”',
    paid: 'Apollo',
    see: 'SPOC page; new people in Approvals',
    example: '“3 SPOCs checked, nothing new”',
  },
  {
    n: 6,
    icon: BadgeCheck,
    title: 'Validate & score SPOCs',
    does: 'Checks name, designation, email, LinkedIn and phone; scores 0–100.',
    needs: 'SPOCs',
    paid: 'Bouncer, Claude',
    see: 'SPOCs list (Quality band), SPOC page',
    example: '“3 SPOCs scored”',
  },
  {
    n: 7,
    icon: Mail,
    title: 'Write outreach emails',
    does: 'Writes a first email and five follow-ups per SPOC, using only figures the CRM holds.',
    needs: 'Approved SPOCs',
    paid: 'Claude',
    see: 'Outreach tab and Outreach page',
    example: '“1 email pack written”',
  },
];

function Steps() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STEPS.map(s => (
        <div key={s.n} className="flex flex-col rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <s.icon className="size-4.5" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Step {s.n}</p>
              <p className="text-sm leading-tight font-semibold">{s.title}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{s.does}</p>
          <dl className="mt-3 space-y-1 border-t pt-3 text-xs">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-muted-foreground">Needs</dt>
              <dd className="font-medium">{s.needs}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-muted-foreground">Cost</dt>
              <dd className="inline-flex items-center gap-1 font-medium">
                {s.paid !== 'Free' && <Coins className="size-3 text-warning" />}
                {s.paid}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-muted-foreground">Results</dt>
              <dd className="font-medium">{s.see}</dd>
            </div>
          </dl>
          <p className="mt-auto pt-3 text-[11px] text-muted-foreground">
            Card says: <span className="text-foreground">{s.example}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

// ── 4. statuses ──────────────────────────────────────────────────────────────

const RUN_MEANING: Partial<Record<StepRunStatus, string>> = {
  QUEUED: 'Waiting its turn',
  RUNNING: 'Working now — the note shows progress',
  DONE: 'Finished; the note says what it added',
  EMPTY: 'Finished, nothing new — or skipped, with the reason',
  FAILED: 'A problem — open it for the reason and what to do',
  STOPPED: 'Someone pressed Stop',
  DISPATCH_FAILED: 'The engine could not be reached',
  TIMED_OUT: 'No result in time; admins are alerted',
};

function Statuses() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold">A step’s run</p>
        <ul className="space-y-2">
          {(Object.keys(RUN_MEANING) as StepRunStatus[]).map(s => (
            <li key={s} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0">
                <Pill tone={STEP_STATUS[s].tone}>{STEP_STATUS[s].label}</Pill>
              </span>
              <span className="text-muted-foreground">{RUN_MEANING[s]}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold">An email pack</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['DRAFT', 'REVIEWED', 'SENT'] as OutreachStatus[]).map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
              <Pill tone={OUTREACH_STATUS[s].tone}>{OUTREACH_STATUS[s].label}</Pill>
            </span>
          ))}
          <ChevronRight className="size-3.5 text-muted-foreground" />
          {(['REPLIED', 'NO_REPLY', 'BOUNCED'] as OutreachStatus[]).map(s => (
            <Pill key={s} tone={OUTREACH_STATUS[s].tone}>
              {OUTREACH_STATUS[s].label}
            </Pill>
          ))}
        </div>
        <ul className="mt-3 space-y-2">
          {(Object.keys(OUTREACH_STATUS) as OutreachStatus[]).map(s => (
            <li key={s} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0">
                <Pill tone={OUTREACH_STATUS[s].tone}>{OUTREACH_STATUS[s].label}</Pill>
              </span>
              <span className="text-muted-foreground">{OUTREACH_STATUS[s].hint}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          An email can be edited until it is marked sent; then its text is locked, so the CRM shows
          exactly what went out.
        </p>
      </div>
    </div>
  );
}

// ── 5. situations ────────────────────────────────────────────────────────────

const CASES: { title: string; icon: LucideIcon; steps: string[] }[] = [
  {
    title: 'A brand-new client',
    icon: Building2,
    steps: [
      'Check the website on the client is right',
      'Pipeline tab → Run all steps',
      'Approvals → approve the right people',
      'Run “Write outreach emails”',
    ],
  },
  {
    title: '“No reports for this client yet”',
    icon: FileSearch,
    steps: [
      'Find CSR reports found nothing',
      'Check the client’s website (wrong company?)',
      'Fix it, then run Find CSR reports again',
      'The skipped steps can then run',
    ],
  },
  {
    title: 'Sending the emails',
    icon: MailCheck,
    steps: [
      'Outreach → Draft tab → open the pack',
      'Read, edit if needed, Mark reviewed',
      'Copy each email into Outlook and send',
      'Mark sent; later record Replied / No reply',
    ],
  },
  {
    title: 'Refreshing an old client',
    icon: GitBranch,
    steps: [
      'A done step unlocks on its re-run date, or when something new came in',
      'Saved details are never overwritten',
      'Differences wait on the run under “To review”',
      'Must redo it now? An admin ticks “Run again anyway”',
    ],
  },
  {
    title: 'A run failed',
    icon: ShieldAlert,
    steps: [
      'Click the red status on the card',
      'Read “why” and “what to do”',
      'Fix it and press Run again',
      'Keeps failing? Admins see it in System alerts',
    ],
  },
];

function Situations() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {CASES.map(c => (
        <div key={c.title} className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <c.icon className="size-4 text-primary" />
            <p className="text-[13px] leading-tight font-semibold">{c.title}</p>
          </div>
          <ol className="mt-3 space-y-1.5">
            {c.steps.map((s, i) => (
              <li key={s} className="flex gap-2 text-xs">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

// ── 6. who sees what, how often ──────────────────────────────────────────────

const RULES: { icon: LucideIcon; title: string; points: string[] }[] = [
  {
    icon: UserCheck,
    title: 'Clients are assigned',
    points: [
      'A super admin (or a manager, for their own people) assigns each client to one or more people.',
      'You see the clients assigned to you, the ones you added, and the ones where you handle a SPOC.',
      'Clients list → filter “Assigned to me”. Assign many at once by ticking rows.',
    ],
  },
  {
    icon: Lock,
    title: 'Your SPOCs are yours',
    points: [
      'Whoever’s run finds a new person becomes that SPOC’s handler.',
      'Others on the same client don’t see your SPOCs, their emails or their outreach. Managers see their reporting line.',
      'A person who is already someone else’s SPOC is skipped: “Already a SPOC of Priya”.',
    ],
  },
  {
    icon: Repeat,
    title: 'No double work',
    points: [
      'Reports, SPOCs from reports and CSR figures are shared: once anyone has done them, they are not run again until the re-run date — unless new reports came in.',
      'LinkedIn, Apollo, Validate and Emails work on your own SPOCs: they unlock again when you have new (or not yet checked / emailed) SPOCs.',
      'The card says who did it and when. An admin can still “Run again anyway”.',
    ],
  },
  {
    icon: Gauge,
    title: 'Run slots',
    points: [
      'Admins can set how many runs people may start per day, week or month — per step or all steps together, for everyone, a role or one person.',
      'Failed runs, runs that found nothing and skipped steps don’t use a slot.',
      'The Run dialog shows what you have left. Super admins have no slots.',
    ],
  },
];

function Rules() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {RULES.map(r => (
        <div key={r.title} className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <r.icon className="size-4" />
            </span>
            <p className="text-[13px] leading-tight font-semibold">{r.title}</p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {r.points.map(pt => (
              <li key={pt} className="flex gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/60" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── 7. where to look ─────────────────────────────────────────────────────────

const PLACES: { icon: LucideIcon; title: string; line: string; href: string }[] = [
  {
    icon: Table2,
    title: 'Clients list',
    line: 'Who works each client, one column per step (Run / Done by whom), “Have” and “Missing”, filters like “Assigned to me”.',
    href: '/clients',
  },
  {
    icon: GitBranch,
    title: 'Client → Pipeline tab',
    line: 'Run steps; each card says what its last run did. Click it for the full story.',
    href: '/clients',
  },
  {
    icon: ShieldCheck,
    title: 'Approvals',
    line: 'New people waiting for a yes or no, best score first.',
    href: '/approvals',
  },
  {
    icon: Mail,
    title: 'Outreach',
    line: 'Every email pack by status: draft, reviewed, sent, replied.',
    href: '/outreach',
  },
  {
    icon: Bell,
    title: 'Notifications',
    line: 'Runs finished or failed, people to approve.',
    href: '/notifications',
  },
  {
    icon: ShieldAlert,
    title: 'System alerts (admins)',
    line: 'Engine down, repeated failures, server errors.',
    href: '/admin/alerts',
  },
];

function WhereToLook() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PLACES.map(p => (
        <Link
          key={p.title}
          href={p.href}
          className="group flex gap-3 rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary">
            <p.icon className="size-4.5" />
          </span>
          <div>
            <p className="text-[13px] font-semibold group-hover:text-primary">{p.title}</p>
            <p className="text-xs text-muted-foreground">{p.line}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function PipelineGuidePage() {
  return (
    <div className="space-y-10 pb-10">
      <PageHeader
        crumbs={[{ label: 'Help', href: '/help' }, { label: 'How the pipeline works' }]}
        title="How the pipeline works"
        description="From a company name to a reply: what the pipeline does for you, what you decide, what happens behind the scenes, and where to see every result."
      />

      <Section
        title="The journey"
        lead="The pipeline researches and drafts; people decide and send. Nobody is emailed until a person approves the SPOC, reviews the emails and sends them from Outlook."
      >
        <Journey />
      </Section>

      <Section
        title="Behind the scenes, after you click Run"
        lead="The CRM keeps the records and the history; the pipeline engine does the searching and reading. Every step below is logged on the run’s timeline."
      >
        <BehindTheScenes />
      </Section>

      <Section
        title="The seven steps"
        lead="Run them top to bottom: each step uses what the steps before it found. A greyed-out Run button tells you what is missing."
      >
        <Steps />
      </Section>

      <Section
        title="What the colours mean"
        lead="The same pills appear on step cards, run lists, the clients table and the Outreach page."
      >
        <Statuses />
      </Section>

      <Section
        title="Who sees what, and how often you can run"
        lead="Two people on one client never redo each other’s work, and never see each other’s contacts."
      >
        <Rules />
      </Section>

      <Section title="Everyday situations" lead="What to do, in order.">
        <Situations />
      </Section>

      <Section title="Where to look" lead="Every result has one home. Click to go there.">
        <WhereToLook />
      </Section>
    </div>
  );
}
