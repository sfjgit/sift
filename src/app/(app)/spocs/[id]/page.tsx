// File: page.tsx
// Path: src/app/(app)/spocs/[id]/page.tsx

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  CircleDashed,
  Copy,
  Linkedin,
  Lock,
  Mail,
  MinusCircle,
  Pencil,
  Phone,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { DetailList, Panel } from '@/components/common/Panel';
import { BandBadge, EmailStatusBadge, LookupBadge, Pill } from '@/components/common/badges';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { ActivityTimeline } from '@/features/activity/ActivityTimeline';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { OutreachList } from '@/features/clients/detail/OutreachList';
import { RunsList } from '@/features/clients/detail/RunsList';
import { AssignDialog } from '@/features/spocs/AssignDialog';
import { SpocFormDialog } from '@/features/spocs/SpocFormDialog';
import { spocHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { reportsApi, spocsApi } from '@/lib/api/endpoints';
import { fmtDate, fmtDateTime, fmtRelative, fullName, placeOf, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/lib/api/client';
import type { SpocDetail } from '@/types/crm';

function ContactRow({ icon: Icon, value, href, hidden }: { icon: typeof Mail; value: string | null; href?: string; hidden: boolean }) {
  if (!value)
    return (
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {hidden ? (
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" /> Hidden for your role
          </span>
        ) : (
          'Not set'
        )}
      </div>
    );
  return (
    <div className="group flex items-center gap-2.5 text-sm">
      <Icon className="size-4 text-muted-foreground" />
      <a href={href} className="truncate hover:text-primary">
        {value}
      </a>
      <button
        type="button"
        aria-label="Copy"
        onClick={() => navigator.clipboard.writeText(value).then(() => toast.success('Copied'))}
        className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

const CHECK_LABELS: Record<string, string> = {
  v_name: 'Name matches',
  v_designation: 'Designation confirmed',
  v_email: 'Email deliverable',
  v_linkedin: 'LinkedIn profile found',
  v_phone: 'Phone verified',
};

/** validationChecks is free-form JSON from the pipeline — render what we recognise. */
function ValidationPanel({ spoc }: { spoc: SpocDetail }) {
  const checks = (spoc.validationChecks ?? {}) as Record<string, unknown>;
  const score = spoc.validationScore;
  const entries = Object.entries(checks).filter(([k]) => k !== 'suggestion');
  const icon = (v: unknown) => {
    const val = typeof v === 'object' && v !== null && 'pass' in v ? (v as { pass: unknown }).pass : v;
    if (val === true || val === 'pass' || val === 'PASS') return <CheckCircle2 className="size-4 text-success" />;
    if (val === false || val === 'fail' || val === 'FAIL') return <XCircle className="size-4 text-destructive" />;
    if (val === null || val === undefined) return <CircleDashed className="size-4 text-muted-foreground" />;
    return <MinusCircle className="size-4 text-warning" />;
  };
  return (
    <Panel title="Data quality" description={spoc.validatedAt ? `Validated ${fmtRelative(spoc.validatedAt)}` : 'Not validated yet'}>
      <div className="flex items-center gap-4">
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
              stroke={spoc.validationBand === 'READY' ? 'var(--success)' : spoc.validationBand === 'REVIEW' ? 'var(--warning)' : 'var(--destructive)'}
              strokeDasharray={`${((score ?? 0) / 100) * 97.4} 97.4`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular">{score ?? '–'}</span>
        </div>
        <div className="space-y-1.5">
          <BandBadge band={spoc.validationBand} />
          <p className="text-xs text-muted-foreground">
            Ready ≥ 75 with no failed check · Review needs a human look · Not usable shouldn’t be contacted.
          </p>
        </div>
      </div>
      {entries.length > 0 && (
        <ul className="mt-4 space-y-2 border-t pt-4">
          {entries.map(([k, v]) => (
            <li key={k} className="flex items-center gap-2 text-[13px]">
              {icon(v)}
              <span className="flex-1">{CHECK_LABELS[k] ?? titleCase(k.replace(/^v_/, ''))}</span>
              {typeof v === 'object' && v !== null && 'note' in v && (
                <span className="truncate text-xs text-muted-foreground">{String((v as { note: unknown }).note)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {typeof checks.suggestion === 'string' && checks.suggestion && (
        <p className="mt-3 rounded-lg bg-surface p-2.5 text-xs">
          <span className="font-medium">Suggestion: </span>
          {checks.suggestion}
        </p>
      )}
    </Panel>
  );
}

function SpocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const { data: spoc, isLoading, error, refetch } = spocHooks.useDetail(id);
  const [editing, setEditing] = useState(() => !!new URLSearchParams(window.location.search).get('edit'));
  const [assigning, setAssigning] = useState(false);
  const [tab, setTab] = useState('activity');

  const activity = useQuery({
    queryKey: ['spoc-activity', id],
    queryFn: () => reportsApi.activities({ spocId: id, limit: 40 }),
    enabled: !!spoc && can('clients.read'),
  });

  const deactivate = useAction(() => spocsApi.remove(id), {
    success: 'SPOC deactivated',
    invalidate: [spocHooks.keys.all],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
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

  const contactHidden = !can('spocs.view_contact');
  const current = spoc.assignments?.find(a => !a.endedAt);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        crumbs={[
          { label: 'SPOCs', href: '/spocs' },
          { label: spoc.client.name, href: `/clients/${spoc.client.id}` },
          { label: fullName(spoc) },
        ]}
      />

      <div className="rounded-xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start gap-4">
          <UserAvatar person={spoc} size="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold sm:text-2xl">{fullName(spoc)}</h1>
              {spoc.isPrimary && (
                <Pill tone="warning" dot={false}>
                  <Star className="size-2.5 fill-current" /> Primary
                </Pill>
              )}
              {!spoc.isActive && <Pill>Inactive</Pill>}
            </div>
            <p className="text-sm text-muted-foreground">
              {spoc.designation ?? 'No designation'}
              {spoc.department && ` · ${spoc.department}`} at{' '}
              <Link href={`/clients/${spoc.client.id}`} className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary">
                <Building2 className="size-3.5" /> {spoc.client.name}
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <BandBadge band={spoc.validationBand} score={spoc.validationScore} />
              <EmailStatusBadge status={spoc.emailStatus} />
              {spoc.salesStatus && <LookupBadge lookup={spoc.salesStatus} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {can('spocs.assign') && spoc.isActive && (
              <Button variant="outline" size="sm" onClick={() => setAssigning(true)}>
                <ArrowRightLeft /> Reassign
              </Button>
            )}
            {can('spocs.update') && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {can('spocs.delete') && spoc.isActive && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Deactivate SPOC"
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
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(300px,1fr)_2fr]">
        <div className="space-y-4">
          <Panel title="Contact">
            <div className="space-y-3">
              <ContactRow icon={Mail} value={spoc.email} href={spoc.email ? `mailto:${spoc.email}` : undefined} hidden={contactHidden} />
              <ContactRow icon={Phone} value={spoc.phone} href={spoc.phone ? `tel:${spoc.phone}` : undefined} hidden={contactHidden} />
              <ContactRow icon={Linkedin} value={spoc.linkedinUrl ? 'LinkedIn profile' : null} href={spoc.linkedinUrl ?? undefined} hidden={false} />
            </div>
          </Panel>
          <ValidationPanel spoc={spoc} />
          <Panel title="Handler">
            <div className="flex items-center gap-3">
              <UserAvatar person={spoc.handler} size="lg" />
              <div>
                <p className="text-sm font-medium">{fullName(spoc.handler)}</p>
                <p className="text-xs text-muted-foreground">
                  {current ? `Since ${fmtDate(current.assignedAt)}` : 'Current owner'}
                </p>
              </div>
            </div>
            {spoc.assignments && spoc.assignments.length > 1 && (
              <ol className="mt-4 space-y-3 border-t pt-4">
                {spoc.assignments.map(a => (
                  <li key={a.id} className="flex gap-2.5 text-[13px]">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', a.endedAt ? 'bg-muted-foreground/40' : 'bg-primary')} />
                    <div>
                      <p>
                        <span className="font-medium">{fullName(a.assignedTo)}</span>
                        <span className="text-muted-foreground"> · by {fullName(a.assignedBy)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground" title={fmtDateTime(a.assignedAt)}>
                        {fmtDate(a.assignedAt)} → {a.endedAt ? fmtDate(a.endedAt) : 'now'}
                      </p>
                      {a.reason && <p className="mt-0.5 text-xs italic text-muted-foreground">“{a.reason}”</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Details">
            <DetailList
              columns={3}
              items={[
                { label: 'Business unit', value: spoc.businessUnit.name },
                { label: 'Service line', value: spoc.serviceLine.name },
                { label: 'Sales status', value: spoc.salesStatus?.label },
                { label: 'Seniority', value: spoc.seniority },
                { label: 'Total experience', value: spoc.totalExpYears && `${Number(spoc.totalExpYears)} yrs` },
                { label: 'At this org', value: spoc.currentOrgExpYears && `${Number(spoc.currentOrgExpYears)} yrs` },
                { label: 'Works at', value: spoc.location && `${spoc.location.name ? `${spoc.location.name}, ` : ''}${placeOf(spoc.location)}` },
                { label: 'Source', value: spoc.source?.label },
                { label: 'Email source', value: spoc.emailSource?.label },
                { label: 'Added by', value: `${fullName(spoc.addedBy)} · ${fmtDate(spoc.createdAt)}` },
                { label: 'Last updated', value: fmtRelative(spoc.updatedAt) },
                { label: 'Notes', value: spoc.notes && <span className="whitespace-pre-line">{spoc.notes}</span>, wide: true },
              ]}
            />
          </Panel>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line" className="h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="activity" className="flex-none px-3">Activity</TabsTrigger>
              <TabsTrigger value="outreach" className="flex-none px-3">Outreach</TabsTrigger>
              {can('step_runs.read') && <TabsTrigger value="pipeline" className="flex-none px-3">Pipeline</TabsTrigger>}
            </TabsList>
            <div className="pt-4">
              <TabsContent value="activity">
                <Panel>
                  <ActivityTimeline items={activity.data?.data} loading={activity.isLoading} emptyText="No activity on this SPOC yet" />
                </Panel>
              </TabsContent>
              <TabsContent value="outreach">{tab === 'outreach' && <OutreachList spocId={spoc.id} />}</TabsContent>
              <TabsContent value="pipeline">{tab === 'pipeline' && <RunsList spocId={spoc.id} />}</TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <SpocFormDialog spoc={spoc} open={editing} onOpenChange={setEditing} />
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
