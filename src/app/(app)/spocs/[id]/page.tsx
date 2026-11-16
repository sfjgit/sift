// File: page.tsx
// Path: src/app/(app)/spocs/[id]/page.tsx
//
// One SPOC, laid out like a CRM record page (Zoho-style):
//  - header: who, where, status (editable in place), key actions
//  - left rail: jump list of the field blocks and related lists
//  - field blocks: label/value rows — click a value to edit it right there
//  - related lists: activity, emails, data quality, ownership, pipeline runs
// No edit dialog: every field saves on its own.

'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRightLeft,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  IdCard,
  ListTodo,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Building2,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Contact,
  Copy,
  FileText,
  Info,
  Linkedin,
  Mail,
  MinusCircle,
  MoreHorizontal,
  Phone,
  PlayCircle,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { ApprovalBadge, BandBadge, EmailStatusBadge } from '@/components/common/badges';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { Combobox } from '@/components/pickers/Combobox';
import { LookupPicker, MasterPicker } from '@/components/pickers/pickers';
import {
  Empty,
  FieldGrid,
  FieldRow,
  InlineBool,
  InlinePick,
  InlineText,
} from '@/components/record/InlineField';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { OutreachList } from '@/features/clients/detail/OutreachList';
import { RunsList } from '@/features/clients/detail/RunsList';
import { DataFlagPills, ProjectTags, SpocKeyStar } from '@/features/marks/SalesMarks';
import { AssignDialog } from '@/features/spocs/AssignDialog';
import { WorkPanel, useWorkTasks, type ComposeMode } from '@/features/work/WorkPanel';
import { clientHooks, spocHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { clientsApi, spocsApi } from '@/lib/api/endpoints';
import { fmtDate, fmtDateTime, fmtRelative, fullName, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/lib/api/client';
import type {
  SpocApprovalStatus,
  SpocDetail,
  SpocInput,
} from '@/types/crm';

// ── layout pieces ────────────────────────────────────────────────────────────

type BlockId =
  | 'info'
  | 'contact'
  | 'location'
  | 'business'
  | 'profile'
  | 'marks'
  | 'description'
  | 'system'
  | 'activity'
  | 'emails'
  | 'quality'
  | 'ownership'
  | 'runs';

/** one white card; `id` is the jump target from the left rail */
function Block({
  id,
  title,
  icon: Icon,
  count,
  actions,
  children,
  flush,
}: {
  id: BlockId;
  title: string;
  icon: typeof Info;
  count?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** no inner padding (lists that bring their own) */
  flush?: boolean;
}) {
  return (
    <section id={`b-${id}`} className="scroll-mt-4 rounded-xl border bg-card shadow-card">
      <header className="flex items-center gap-2.5 border-b px-4 py-2.5">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {count !== undefined && count !== null && (
          <span className="rounded-full bg-muted px-2 py-px text-xs font-medium text-muted-foreground tabular">
            {count}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">{actions}</div>
      </header>
      <div className={flush ? undefined : 'px-4 pt-1 pb-3'}>{children}</div>
    </section>
  );
}

/** left rail: highlights the block on screen; click scrolls to it */
function Rail({
  groups,
}: {
  groups: { title: string; items: { id: BlockId; label: string; count?: number | null }[] }[];
}) {
  const ids = groups.flatMap(g => g.items.map(i => i.id));
  const [active, setActive] = useState<BlockId>(ids[0] ?? 'info');
  const key = ids.join(',');
  useEffect(() => {
    const els = key
      .split(',')
      .map(id => document.getElementById(`b-${id}`))
      .filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      entries => {
        const top = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.slice(2) as BlockId);
      },
      { rootMargin: '0px 0px -65% 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [key]);

  return (
    <nav className="hidden self-start lg:sticky lg:top-4 lg:block">
      {groups.map(g => (
        <div key={g.title} className="mb-4">
          <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {g.title}
          </p>
          <ul>
            {g.items.map(i => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`b-${i.id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className={cn(
                    'flex w-full items-center justify-between rounded-md border-l-2 px-3 py-1.5 text-left text-[13.5px] transition-colors',
                    active === i.id
                      ? 'border-primary bg-primary/8 font-medium text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {i.label}
                  {i.count ? <span className="text-xs tabular">{i.count}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function CopyBtn({ value }: { value: string }) {
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={() => navigator.clipboard.writeText(value).then(() => toast.success('Copied'))}
      className="ml-1 inline-flex rounded p-0.5 align-middle text-muted-foreground hover:bg-background hover:text-foreground"
    >
      <Copy className="size-3.5" />
    </button>
  );
}

// ── data quality ─────────────────────────────────────────────────────────────

const CHECK_LABELS: Record<string, string> = {
  v_name: 'Name matches',
  v_designation: 'Designation confirmed',
  v_email: 'Email deliverable',
  v_linkedin: 'LinkedIn profile found',
  v_phone: 'Phone verified',
};

function Quality({ spoc }: { spoc: SpocDetail }) {
  const checks = (spoc.validationChecks ?? {}) as Record<string, unknown>;
  const entries = Object.entries(checks).filter(([k]) => k !== 'suggestion');
  const score = spoc.validationScore;
  const icon = (v: unknown) => {
    const val =
      typeof v === 'object' && v !== null && 'pass' in v ? (v as { pass: unknown }).pass : v;
    if (val === true || val === 'pass' || val === 'PASS')
      return <CheckCircle2 className="size-4 text-success" />;
    if (val === false || val === 'fail' || val === 'FAIL')
      return <XCircle className="size-4 text-destructive" />;
    if (val === null || val === undefined)
      return <CircleDashed className="size-4 text-muted-foreground" />;
    return <MinusCircle className="size-4 text-warning" />;
  };
  return (
    <div className="grid gap-4 py-2 md:grid-cols-[200px_1fr]">
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0">
          <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3.5" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke={
                spoc.validationBand === 'READY'
                  ? 'var(--success)'
                  : spoc.validationBand === 'REVIEW'
                    ? 'var(--warning)'
                    : 'var(--destructive)'
              }
              strokeDasharray={`${((score ?? 0) / 100) * 97.4} 97.4`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular">
            {score ?? '–'}
          </span>
        </div>
        <div className="space-y-1">
          <BandBadge band={spoc.validationBand} />
          <p className="text-xs text-muted-foreground">
            {spoc.validatedAt ? `Checked ${fmtRelative(spoc.validatedAt)}` : 'Not checked yet'}
          </p>
        </div>
      </div>
      <div>
        {entries.length ? (
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {entries.map(([k, v]) => (
              <li key={k} className="flex items-center gap-2 text-[14px]">
                {icon(v)}
                <span className="truncate">{CHECK_LABELS[k] ?? titleCase(k.replace(/^v_/, ''))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run the LinkedIn / Apollo checks to score this contact. Ready ≥ 75 with no failed check.
          </p>
        )}
        {typeof checks.suggestion === 'string' && checks.suggestion && (
          <p className="mt-3 rounded-lg bg-surface p-2.5 text-xs">
            <span className="font-medium">Suggestion: </span>
            {checks.suggestion}
          </p>
        )}
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

function SpocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const { data: spoc, isLoading, error, refetch } = spocHooks.useDetail(id);
  const [assigning, setAssigning] = useState(false);

  // the client's offices for "Works at"
  const clientId = spoc?.client.id;
  const { data: client } = useQuery({
    queryKey: clientHooks.keys.detail(clientId ?? ''),
    queryFn: () => clientsApi.get(clientId!),
    enabled: !!clientId,
  });
  const locationOptions = (client?.locations ?? []).map(l => ({
    value: l.id,
    label: [l.name, l.city, l.state].filter(Boolean).join(', ') || 'Unnamed location',
    hint: [l.type?.label, l.isPrimary ? 'Primary' : null].filter(Boolean).join(' · '),
  }));

  const openTasks = (useWorkTasks(clientId, id).data ?? []).filter(t => t.status !== 'DONE').length;
  const [compose, setCompose] = useState<ComposeMode>('comment');
  /** header buttons: open the composer on that tab */
  const startCompose = (m: ComposeMode) => {
    setCompose(m);
    document.getElementById('b-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const decide = useAction((decision: SpocApprovalStatus) => spocsApi.decide([id], decision), {
    success: (_r, d) =>
      d === 'APPROVED' ? 'Approved for outreach' : d === 'REJECTED' ? 'Rejected' : 'Back to pending',
    invalidate: [spocHooks.keys.all],
  });
  const deactivate = useAction(() => spocsApi.remove(id), {
    success: 'SPOC deactivated',
    invalidate: [spocHooks.keys.all],
  });

  /** save one or more fields; the page shows the new value at once */
  const save = async (body: Partial<SpocInput>) => {
    const res = await spocsApi.update(id, body);
    qc.setQueryData<SpocDetail>(spocHooks.keys.detail(id), old => (old ? { ...old, ...res } : old));
    qc.invalidateQueries({ queryKey: spocHooks.keys.all });
    qc.invalidateQueries({ queryKey: ['client-activity', spoc?.client.id] });
  };
  const saveText = (field: keyof SpocInput) => (v: string | null) => save({ [field]: v });
  const saveYears = (field: 'totalExpYears' | 'currentOrgExpYears') => (v: string | null) => {
    const n = v === null ? null : Number(v);
    if (n !== null && (isNaN(n) || n < 0 || n >= 100)) throw new Error('Enter years between 0 and 99');
    return save({ [field]: n });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }
  if (error || !spoc) {
    const nf = (error as ApiError | null)?.status === 404;
    return (
      <ErrorState
        title={nf ? 'SPOC not found' : 'Couldn’t load this SPOC'}
        error={nf ? new Error('It may be outside your access scope.') : error}
        onRetry={nf ? undefined : () => refetch()}
        className="min-h-[50vh]"
      />
    );
  }

  const canEdit = can('spocs.update') && spoc.isActive;
  const contactHidden = !can('spocs.view_contact');
  const seeActivity = can('clients.read');
  const spocNotes = (client?.notes ?? []).filter(n => n.spoc?.id === spoc.id);
  const current = spoc.assignments?.find(a => !a.endedAt);
  const stamp = (who: { firstName: string; lastName: string | null } | null, at: string | null) =>
    who && at ? `${fullName(who)} · ${fmtDate(at)}` : undefined;

  const rail = [
    {
      title: 'Work',
      items: [
        ...(seeActivity ? [{ id: 'activity' as const, label: 'Activity & tasks', count: openTasks }] : []),
        ...(can('outreach.read') ? [{ id: 'emails' as const, label: 'Email drafts' }] : []),
      ],
    },
    {
      title: 'Details',
      items: [
        { id: 'info' as const, label: 'SPOC information' },
        { id: 'contact' as const, label: 'Contact' },
        { id: 'location' as const, label: 'Location' },
        { id: 'business' as const, label: 'Business' },
        { id: 'profile' as const, label: 'Additional details' },
        { id: 'marks' as const, label: 'Sales marks' },
        { id: 'description' as const, label: 'Description' },
        { id: 'system' as const, label: 'Record info' },
      ],
    },
    {
      title: 'Related',
      items: [
        { id: 'quality' as const, label: 'Data quality' },
        { id: 'ownership' as const, label: 'Ownership', count: spoc.assignments?.length },
        ...(can('step_runs.read') ? [{ id: 'runs' as const, label: 'Pipeline runs' }] : []),
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumbs
        crumbs={[
          { label: 'SPOCs', href: '/spocs' },
          { label: spoc.client.name, href: `/clients/${spoc.client.id}` },
          { label: fullName(spoc) },
        ]}
      />

      {/* ── header ── */}
      <div className="rounded-xl border bg-card px-5 py-4 shadow-card">
        <div className="flex flex-wrap items-start gap-4">
          <UserAvatar person={spoc} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{fullName(spoc)}</h1>
              <SpocKeyStar spoc={spoc} canEdit={canEdit} />
              {spoc.isPrimary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-px text-[11px] font-medium text-warning">
                  <Star className="size-2.5 fill-current" /> Primary
                </span>
              )}
              {!spoc.isActive && (
                <span className="rounded-full bg-muted px-2 py-px text-[11px] font-medium">Inactive</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {spoc.designation ?? 'No designation'} at{' '}
              <Link
                href={`/clients/${spoc.client.id}`}
                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
              >
                <Building2 className="size-3.5" /> {spoc.client.name}
              </Link>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              {contactHidden ? null : spoc.email ? (
                <a href={`mailto:${spoc.email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Mail className="size-3.5" /> {spoc.email}
                </a>
              ) : null}
              {!contactHidden && spoc.phone && (
                <a href={`tel:${spoc.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Phone className="size-3.5" /> {spoc.phone}
                </a>
              )}
              {spoc.linkedinUrl && (
                <a
                  href={spoc.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-primary"
                >
                  <Linkedin className="size-3.5" /> LinkedIn
                </a>
              )}
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-3.5" /> {fullName(spoc.handler)}
              </span>
              <span>Updated {fmtRelative(spoc.updatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {seeActivity && can('client_notes.create') && (
              <div className="flex overflow-hidden rounded-lg border">
                {(
                  [
                    ['call', 'Call', Phone],
                    ['email', 'Email', Mail],
                    ['whatsapp', 'WhatsApp', MessageCircle],
                    ['comment', 'Comment', MessageSquareText],
                    ['meeting', 'Meeting', CalendarClock],
                    ['task', 'Task', ListTodo],
                  ] as const
                ).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    title={`Log / add: ${label}`}
                    onClick={() => startCompose(m)}
                    className="inline-flex items-center gap-1.5 border-r px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground last:border-r-0 hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
            )}
            {can('spocs.approve') && spoc.isActive && spoc.approvalStatus !== 'APPROVED' && (
              <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate('APPROVED')}>
                <BadgeCheck /> Approve
              </Button>
            )}
            {can('spocs.approve') && spoc.isActive && spoc.approvalStatus === 'PENDING' && (
              <Button
                variant="outline"
                size="sm"
                disabled={decide.isPending}
                onClick={() => decide.mutate('REJECTED')}
              >
                <CircleSlash /> Reject
              </Button>
            )}
            {can('spocs.assign') && spoc.isActive && (
              <Button variant="outline" size="sm" onClick={() => setAssigning(true)}>
                <ArrowRightLeft /> Reassign
              </Button>
            )}
            {can('spocs.delete') && spoc.isActive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="More">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: `Deactivate ${fullName(spoc)}?`,
                          description: 'They leave active lists; history is kept.',
                          destructive: true,
                          confirmLabel: 'Deactivate',
                        })
                      )
                        deactivate.mutate(undefined, { onSuccess: () => router.push('/spocs') });
                    }}
                  >
                    <Trash2 /> Deactivate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* status strip: the four things a salesperson checks first */}
        <div className="mt-4 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card px-3 py-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Sales status
            </p>
            {canEdit ? (
              <LookupPicker
                type="SALES_STATUS"
                size="sm"
                value={spoc.salesStatus?.id ?? null}
                placeholder="Set status"
                className="mt-1 border-transparent px-1 font-medium hover:border-input"
                onChange={v =>
                  save({ salesStatusId: v }).then(
                    () => toast.success('Status updated'),
                    e => toast.error((e as ApiError).message)
                  )
                }
              />
            ) : (
              <p className="mt-1 text-sm font-medium">{spoc.salesStatus?.label ?? '—'}</p>
            )}
          </div>
          <div className="bg-card px-3 py-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Approval
            </p>
            <div className="mt-1.5">
              <ApprovalBadge status={spoc.approvalStatus} />
            </div>
          </div>
          <div className="bg-card px-3 py-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Data quality
            </p>
            <div className="mt-1.5">
              <BandBadge band={spoc.validationBand} score={spoc.validationScore} />
            </div>
          </div>
          <div className="bg-card px-3 py-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Email
            </p>
            <div className="mt-1.5">
              <EmailStatusBadge status={spoc.emailStatus} />
            </div>
          </div>
        </div>
        {spoc.reviewFlag && spoc.reviewReason && (
          <p className="mt-2 text-xs text-warning">Needs review: {spoc.reviewReason}</p>
        )}
      </div>

      {/* ── body ── */}
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
        <Rail groups={rail} />

        <div className="min-w-0 space-y-4">
          {seeActivity && (
            <Block id="activity" title="Activity & tasks" icon={Activity} count={openTasks ? `${openTasks} open` : undefined}>
              <WorkPanel
                clientId={spoc.client.id}
                spocId={spoc.id}
                notes={spocNotes}
                mode={compose}
                onModeChange={setCompose}
              />
            </Block>
          )}

          <Block id="info" title="SPOC information" icon={UserRound}>
            <FieldGrid>
              <InlineText label="First name" value={spoc.firstName} canEdit={canEdit} onSave={v => {
                if (!v) throw new Error('First name is required');
                return save({ firstName: v });
              }} />
              <InlineText label="Last name" value={spoc.lastName} canEdit={canEdit} onSave={saveText('lastName')} />
              <InlineText label="Designation" value={spoc.designation} canEdit={canEdit} onSave={saveText('designation')} placeholder="e.g. Head of CSR" />
              <InlineText label="Department" value={spoc.department} canEdit={canEdit} onSave={saveText('department')} />
              <InlinePick
                label="Seniority"
                value={spoc.seniority}
                display={spoc.seniority ?? undefined}
                canEdit={canEdit}
                onSave={saveText('seniority')}
                render={p => (
                  <Combobox
                    {...p}
                    options={['C-level', 'VP', 'Director', 'Head', 'Manager', 'Lead', 'Individual contributor'].map(
                      s => ({ value: s, label: s })
                    )}
                  />
                )}
              />
              <InlineBool
                label="Primary SPOC"
                value={spoc.isPrimary}
                canEdit={canEdit}
                onSave={v => save({ isPrimary: v })}
              />
              <InlineText
                label="Total experience"
                type="number"
                value={spoc.totalExpYears === null ? null : Number(spoc.totalExpYears)}
                display={spoc.totalExpYears !== null ? `${Number(spoc.totalExpYears)} yrs` : undefined}
                canEdit={canEdit}
                onSave={saveYears('totalExpYears')}
              />
              <InlineText
                label="At this org"
                type="number"
                value={spoc.currentOrgExpYears === null ? null : Number(spoc.currentOrgExpYears)}
                display={
                  spoc.currentOrgExpYears !== null ? `${Number(spoc.currentOrgExpYears)} yrs` : undefined
                }
                canEdit={canEdit}
                onSave={saveYears('currentOrgExpYears')}
              />
              <FieldRow label="Client">
                <Link href={`/clients/${spoc.client.id}`} className="inline-block py-1 font-medium hover:text-primary">
                  {spoc.client.name}
                </Link>
              </FieldRow>
              <FieldRow label="Handler">
                <div className="flex items-center gap-2 py-0.5">
                  <UserAvatar person={spoc.handler} size="sm" />
                  <span>{fullName(spoc.handler)}</span>
                  {can('spocs.assign') && spoc.isActive && (
                    <button
                      type="button"
                      onClick={() => setAssigning(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
              </FieldRow>
            </FieldGrid>
          </Block>

          <Block id="contact" title="Contact" icon={Contact}>
            <FieldGrid>
              <InlineText
                label="Email"
                type="email"
                value={spoc.email}
                locked={contactHidden}
                display={
                  spoc.email ? (
                    <span>
                      <a href={`mailto:${spoc.email}`} className="hover:text-primary">
                        {spoc.email}
                      </a>
                      <CopyBtn value={spoc.email} />
                    </span>
                  ) : undefined
                }
                canEdit={canEdit}
                onSave={saveText('email')}
              />
              <InlineText
                label="Mobile"
                type="tel"
                value={spoc.phone}
                locked={contactHidden}
                display={
                  spoc.phone ? (
                    <span>
                      <a href={`tel:${spoc.phone}`} className="hover:text-primary">
                        {spoc.phone}
                      </a>
                      <CopyBtn value={spoc.phone} />
                    </span>
                  ) : undefined
                }
                canEdit={canEdit}
                onSave={saveText('phone')}
              />
              <InlineText label="Mobile 2" type="tel" value={spoc.phone2} locked={contactHidden} canEdit={canEdit} onSave={saveText('phone2')} />
              <InlineText label="Mobile 3" type="tel" value={spoc.phone3} locked={contactHidden} canEdit={canEdit} onSave={saveText('phone3')} />
              <InlineText
                label="LinkedIn"
                type="url"
                value={spoc.linkedinUrl}
                placeholder="linkedin.com/in/…"
                display={
                  spoc.linkedinUrl ? (
                    <a
                      href={spoc.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {spoc.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </a>
                  ) : undefined
                }
                canEdit={canEdit}
                onSave={v =>
                  save({ linkedinUrl: v && !/^https?:\/\//i.test(v) ? `https://${v}` : v })
                }
              />
              <FieldRow label="Email status">
                <div className="py-0.5">
                  <EmailStatusBadge status={spoc.emailStatus} />
                </div>
              </FieldRow>
            </FieldGrid>
          </Block>

          <Block id="location" title="Location" icon={MapPin}>
            <FieldGrid>
              <InlineText label="State" value={spoc.state} canEdit={canEdit} onSave={saveText('state')} />
              <InlineText label="District" value={spoc.district} canEdit={canEdit} onSave={saveText('district')} />
              <InlineText label="City" value={spoc.city} canEdit={canEdit} onSave={saveText('city')} />
              <InlineText label="Pincode" value={spoc.pincode} canEdit={canEdit} onSave={saveText('pincode')} />
              <InlineText label="Address" wide multiline value={spoc.address} canEdit={canEdit} onSave={saveText('address')} />
            </FieldGrid>
          </Block>

          <Block id="business" title="Business" icon={Briefcase}>
            <FieldGrid>
              <InlinePick
                label="Business unit"
                value={spoc.businessUnit.id}
                display={spoc.businessUnit.name}
                canEdit={canEdit}
                onSave={v => {
                  if (!v) throw new Error('Business unit is required');
                  return save({ businessUnitId: v });
                }}
                render={p => <MasterPicker kind="business-units" {...p} clearable={false} />}
              />
              <InlinePick
                label="Service line"
                value={spoc.serviceLine.id}
                display={spoc.serviceLine.name}
                canEdit={canEdit}
                onSave={v => {
                  if (!v) throw new Error('Service line is required');
                  return save({ serviceLineId: v });
                }}
                render={p => <MasterPicker kind="service-lines" {...p} clearable={false} />}
              />
              <InlinePick
                label="Sales status"
                value={spoc.salesStatus?.id}
                display={spoc.salesStatus?.label}
                canEdit={canEdit}
                onSave={v => save({ salesStatusId: v })}
                render={p => <LookupPicker type="SALES_STATUS" {...p} />}
              />
              <InlinePick
                label="Works at"
                value={spoc.location?.id}
                display={
                  spoc.location
                    ? [spoc.location.name, spoc.location.city, spoc.location.state]
                        .filter(Boolean)
                        .join(', ')
                    : undefined
                }
                canEdit={canEdit}
                onSave={v => save({ locationId: v })}
                render={p => (
                  <Combobox
                    {...p}
                    options={locationOptions}
                    placeholder={locationOptions.length ? 'Select office' : 'No offices on this client'}
                  />
                )}
              />
              <InlinePick
                label="Source"
                value={spoc.source?.id}
                display={spoc.source?.label}
                canEdit={canEdit}
                onSave={v => save({ sourceId: v })}
                render={p => <LookupPicker type="SPOC_SOURCE" {...p} />}
              />
              <InlinePick
                label="Email source"
                value={spoc.emailSource?.id}
                display={spoc.emailSource?.label}
                canEdit={canEdit}
                onSave={v => save({ emailSourceId: v })}
                render={p => <LookupPicker type="EMAIL_SOURCE" {...p} />}
              />
              <InlineText
                label="ERP"
                value={spoc.erp}
                placeholder="e.g. SAP, Oracle"
                canEdit={canEdit}
                onSave={saveText('erp')}
              />
              <InlineBool
                label="Call connected"
                value={spoc.callConnected}
                canEdit={canEdit}
                yes="Connected"
                no="Not connected"
                onSave={v => save({ callConnected: v })}
              />
            </FieldGrid>
          </Block>

          <Block id="profile" title="Additional details" icon={IdCard}>
            <FieldGrid>
              <InlinePick
                label="Organization type"
                value={spoc.orgType?.id}
                display={spoc.orgType?.label}
                canEdit={canEdit}
                onSave={v => save({ orgTypeId: v })}
                render={p => <LookupPicker type="ORG_TYPE" {...p} />}
              />
              <InlinePick
                label="Role category"
                value={spoc.roleCategory?.id}
                display={spoc.roleCategory?.label}
                canEdit={canEdit}
                onSave={v => save({ roleCategoryId: v })}
                render={p => <LookupPicker type="SPOC_ROLE" {...p} />}
              />
              <InlinePick
                label="Decision authority"
                value={spoc.decisionAuthority?.id}
                display={spoc.decisionAuthority?.label}
                canEdit={canEdit}
                onSave={v => save({ decisionAuthorityId: v })}
                render={p => <LookupPicker type="DECISION_AUTHORITY" {...p} />}
              />
              <InlinePick
                label="SPOC revenue"
                value={spoc.revenueBand?.id}
                display={spoc.revenueBand?.label}
                canEdit={canEdit}
                onSave={v => save({ revenueBandId: v })}
                render={p => <LookupPicker type="REVENUE_BAND" {...p} />}
              />
            </FieldGrid>
          </Block>

          <Block id="marks" title="Sales marks" icon={Tags}>
            <FieldGrid>
              <FieldRow label="Key account">
                <div className="flex items-center gap-2 py-0.5">
                  <SpocKeyStar spoc={spoc} canEdit={canEdit} />
                  <span className="text-[13px] text-muted-foreground">
                    {spoc.keyAccountUser ? fullName(spoc.keyAccountUser) : 'Nobody yet'}
                  </span>
                </div>
              </FieldRow>
              <FieldRow label="Data flag">
                <div className="py-0.5">
                  <DataFlagPills spoc={spoc} canEdit={canEdit} />
                  {spoc.dataFlag && stamp(spoc.dataFlagBy, spoc.dataFlagAt) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {stamp(spoc.dataFlagBy, spoc.dataFlagAt)}
                    </p>
                  )}
                </div>
              </FieldRow>
              <FieldRow label="Projects">
                <div className="py-0.5">
                  <ProjectTags
                    ids={spoc.projectIds}
                    canEdit={canEdit}
                    setBy={stamp(spoc.projectSetBy, spoc.projectSetAt)}
                    onSave={next => save({ projectIds: next })}
                  />
                </div>
              </FieldRow>
            </FieldGrid>
          </Block>

          <Block id="description" title="Description" icon={FileText}>
            <FieldGrid>
              <InlineText
                label="Notes"
                wide
                multiline
                value={spoc.notes}
                placeholder="Context, preferences, how you met…"
                canEdit={canEdit}
                onSave={saveText('notes')}
              />
            </FieldGrid>
          </Block>

          <Block id="system" title="Record info" icon={Info}>
            <FieldGrid>
              <FieldRow label="Added by">
                <div className="py-1">{`${fullName(spoc.addedBy)} · ${fmtDate(spoc.createdAt)}`}</div>
              </FieldRow>
              <FieldRow label="Last updated">
                <div className="py-1" title={fmtDateTime(spoc.updatedAt)}>
                  {fmtRelative(spoc.updatedAt)}
                </div>
              </FieldRow>
              <FieldRow label="Approval">
                <div className="py-1">
                  {spoc.approvedBy && spoc.approvedAt
                    ? `${titleCase(spoc.approvalStatus)} by ${fullName(spoc.approvedBy)} · ${fmtDate(spoc.approvedAt)}`
                    : titleCase(spoc.approvalStatus)}
                </div>
              </FieldRow>
              <FieldRow label="Approval note">
                <div className="py-1">{spoc.approvalNote ?? <Empty />}</div>
              </FieldRow>
              <FieldRow label="Data came from" wide>
                <div className="py-1">
                  {spoc.fieldSources && Object.keys(spoc.fieldSources).length ? (
                    Object.entries(spoc.fieldSources)
                      .map(([f, src]) => `${titleCase(f.replace(/Url$/, ''))}: ${src}`)
                      .join(' · ')
                  ) : (
                    <Empty>Entered by hand</Empty>
                  )}
                </div>
              </FieldRow>
            </FieldGrid>
          </Block>

          {can('outreach.read') && (
            <Block id="emails" title="Email drafts" icon={Mail}>
              <div className="py-2">
                <OutreachList spocId={spoc.id} />
              </div>
            </Block>
          )}

          <Block id="quality" title="Data quality" icon={ShieldCheck}>
            <Quality spoc={spoc} />
          </Block>

          <Block
            id="ownership"
            title="Ownership"
            icon={Users}
            count={spoc.assignments?.length}
            actions={
              can('spocs.assign') &&
              spoc.isActive && (
                <Button variant="outline" size="sm" onClick={() => setAssigning(true)}>
                  <ArrowRightLeft /> Reassign
                </Button>
              )
            }
          >
            <ol className="divide-y">
              {(spoc.assignments?.length
                ? spoc.assignments
                : [
                    {
                      id: 'now',
                      assignedTo: spoc.handler,
                      assignedBy: spoc.addedBy,
                      assignedAt: spoc.createdAt,
                      endedAt: null,
                      reason: null,
                    },
                  ]
              ).map(a => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <UserAvatar person={a.assignedTo} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px]">
                      <span className="font-medium">{fullName(a.assignedTo)}</span>
                      <span className="text-muted-foreground"> · given by {fullName(a.assignedBy)}</span>
                    </p>
                    {a.reason && <p className="text-xs italic text-muted-foreground">“{a.reason}”</p>}
                  </div>
                  <span className="text-xs text-muted-foreground" title={fmtDateTime(a.assignedAt)}>
                    {fmtDate(a.assignedAt)} → {a.endedAt ? fmtDate(a.endedAt) : 'now'}
                  </span>
                  {!a.endedAt && (
                    <span className="rounded-full bg-primary/10 px-2 py-px text-[11px] font-medium text-primary">
                      {current || a.id === 'now' ? 'Current' : ''}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Block>

          {can('step_runs.read') && (
            <Block id="runs" title="Pipeline runs" icon={PlayCircle}>
              <div className="py-2">
                <RunsList spocId={spoc.id} />
              </div>
            </Block>
          )}
        </div>
      </div>

      <AssignDialog spocs={[spoc]} open={assigning} onOpenChange={setAssigning} />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="spocs.read">
      <SpocPage />
    </RequirePermission>
  );
}

