// File: page.tsx
// Path: src/app/(app)/admin/users/[id]/page.tsx
//
// One person's profile: who they are, where they sit in the org, and who
// reports to them. Actions reuse the same rules as the users list.

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ContactRound, LogIn, MoreHorizontal, Pencil, UserRoundX, Users, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { DetailList, Panel } from '@/components/common/Panel';
import { StatCard } from '@/components/common/StatCard';
import { ActiveBadge, Pill } from '@/components/common/badges';
import { PersonCell, UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState, ErrorState } from '@/components/common/states';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { UserActionsMenu, useUserActions } from '@/features/admin/userActions';
import { userHooks } from '@/hooks/queries';
import { ApiError } from '@/lib/api/client';
import { fmtDate, fmtDateTime, fullName } from '@/lib/format';
import type { UserPerson } from '@/types/org';

function PeopleList({ people, empty }: { people: UserPerson[]; empty: string }) {
  if (!people.length) return <p className="py-2 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="-mx-2 divide-y divide-border/60">
      {people.map(p => (
        <li key={p.id}>
          <Link
            href={`/admin/users/${p.id}`}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
          >
            <PersonCell person={p} />
            {p.employeeId && <span className="font-mono text-xs text-muted-foreground">{p.employeeId}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PersonLink({ person }: { person: UserPerson | null }) {
  if (!person) return null;
  return (
    <Link href={`/admin/users/${person.id}`} className="inline-flex hover:text-primary">
      <PersonCell person={person} size="xs" />
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading, error, refetch } = userHooks.useDetail(id);
  const actions = useUserActions();

  if (isLoading) return <DetailSkeleton />;
  if (error || !user) {
    if (error instanceof ApiError && error.status === 404)
      return (
        <EmptyState
          icon={UserRoundX}
          title="User not found"
          description="They may not exist, or they’re outside the people you can see."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/users">Back to users</Link>
            </Button>
          }
          className="min-h-[60vh]"
        />
      );
    return <ErrorState error={error} onRetry={() => refetch()} className="min-h-[60vh]" />;
  }

  const bus = user.businessUnits ?? [];
  const sls = user.serviceLines ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: 'Users', href: '/admin/users' }, { label: fullName(user) }]}
        icon={<UserAvatar person={user} size="xl" />}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {fullName(user)}
            <ActiveBadge active={user.isActive} />
            {user.isSuperAdmin && (
              <Pill tone="violet" dot={false}>
                Super admin
              </Pill>
            )}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{[user.designation?.name, user.role?.name].filter(Boolean).join(' · ')}</span>
            <span aria-hidden>·</span>
            <a href={`mailto:${user.email}`} className="hover:text-primary">
              {user.email}
            </a>
          </span>
        }
        actions={
          <>
            {actions.canImpersonate(user) && (
              <Button variant="outline" size="sm" onClick={() => void actions.impersonate(user)}>
                <LogIn /> Sign in as
              </Button>
            )}
            {actions.canEdit(user) && (
              <Button size="sm" onClick={() => actions.openEdit(user)}>
                <Pencil /> Edit
              </Button>
            )}
            <UserActionsMenu
              user={user}
              actions={actions}
              showOpen={false}
              trigger={
                <Button variant="outline" size="icon-sm" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              }
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="SPOCs handled"
          value={user._count?.spocsHandled ?? 0}
          icon={ContactRound}
          href={`/spocs?handlerId=${user.id}`}
          hint="Active contacts they own"
        />
        <StatCard
          label="Direct reports"
          value={user._count?.subordinates ?? 0}
          icon={Users}
          accent="info"
          hint="People reporting to them"
        />
        <StatCard
          label="Team size"
          value={user._count?.teamMembers ?? 0}
          icon={UsersRound}
          accent="violet"
          hint="People they lead as team lead"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Profile">
            <DetailList
              items={[
                { label: 'First name', value: user.firstName },
                { label: 'Last name', value: user.lastName },
                { label: 'Middle name', value: user.middleName, hidden: !user.middleName },
                { label: 'Display name', value: user.displayName, hidden: !user.displayName },
                {
                  label: 'Employee ID',
                  value: user.employeeId && <span className="font-mono text-[13px]">{user.employeeId}</span>,
                },
                { label: 'Email', value: <a href={`mailto:${user.email}`} className="hover:text-primary">{user.email}</a> },
                { label: 'Phone', value: user.phone && <a href={`tel:${user.phone}`} className="hover:text-primary">{user.phone}</a> },
                { label: 'Working location', value: user.workingLocation },
                { label: 'Timezone', value: user.timezone },
                { label: 'Date of joining', value: user.dateOfJoin && fmtDate(user.dateOfJoin) },
                { label: 'Date of birth', value: user.dateOfBirth && fmtDate(user.dateOfBirth) },
              ]}
            />
          </Panel>

          <Panel title="Organisation">
            <DetailList
              items={[
                { label: 'Role', value: user.role?.name },
                { label: 'Department', value: user.department?.name },
                { label: 'Designation', value: user.designation?.name },
                { label: 'Reports to', value: <PersonLink person={user.reportingTo} /> },
                { label: 'Team lead', value: <PersonLink person={user.teamLead} /> },
                {
                  label: 'Business units',
                  wide: true,
                  value: bus.length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {bus.map(b => (
                        <Pill key={b.businessUnit.id} tone="primary" dot={false}>
                          {b.businessUnit.name}
                        </Pill>
                      ))}
                    </span>
                  ),
                },
                {
                  label: 'Service lines',
                  wide: true,
                  value: sls.length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {sls.map(s => (
                        <Pill key={s.serviceLine.id} tone="info" dot={false}>
                          {s.serviceLine.name}
                        </Pill>
                      ))}
                    </span>
                  ),
                },
              ]}
            />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Direct reports" description="People whose reporting manager is them">
            <PeopleList people={user.subordinates ?? []} empty="No one reports to them yet." />
          </Panel>
          <Panel title="Team members" description="People who have them as team lead">
            <PeopleList people={user.teamMembers ?? []} empty="They don’t lead a team." />
          </Panel>
          <Panel title="Record">
            <DetailList
              columns={1}
              items={[
                { label: 'Added', value: fmtDateTime(user.createdAt) },
                { label: 'Added by', value: user.createdBy && <PersonLink person={user.createdBy} /> },
                { label: 'Last updated', value: fmtDateTime(user.updatedAt) },
              ]}
            />
          </Panel>
        </div>
      </div>

      {actions.dialogs}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="users.read">
      <UserDetailPage />
    </RequirePermission>
  );
}
