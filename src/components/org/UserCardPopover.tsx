'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import type { UserCardData } from './types';
import { userColor, userInitials } from './org.utils';
// import { userColor, userInitials } from './utils';

function priorityColor(p: string) {
  if (p === 'HIGH') return 'text-destructive border-destructive/40';
  if (p === 'MEDIUM') return 'text-amber-600 border-amber-300';
  return 'text-muted-foreground';
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 w-72">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-20 shrink-0 pt-px">
        {label}
      </span>
      <span className="text-xs text-foreground">{value}</span>
    </div>
  );
}

function CardContent({ userId }: { userId: string }) {
  const axios = useAxios();
  const { data, isLoading } = useSWR<{ data: UserCardData }>(
    `/users/${userId}/card`,
    url => axios.get(url).then(r => r.data),
    { revalidateOnFocus: false }
  );

  if (isLoading) return <CardSkeleton />;
  if (!data?.data) return <div className="p-4 text-sm text-muted-foreground">Failed to load</div>;

  const u = data.data;
  const color = userColor(u.id);
  const initials = userInitials(u.firstName, u.lastName);

  return (
    <div className="flex flex-col w-72">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${color}`}
        >
          {initials}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {u.firstName} {u.lastName}
            </span>
            {!u.isActive && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{u.role.name}</span>
          {u.employeeId && (
            <span className="text-[10px] font-mono text-muted-foreground">{u.employeeId}</span>
          )}
        </div>
      </div>

      <Separator />

      {/* Meta */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <MetaItem label="Email" value={u.email} />
        <MetaItem label="Phone" value={u.phone} />
        <MetaItem label="Dept" value={u.department?.name} />
        <MetaItem label="Location" value={u.workingLocation} />
        <MetaItem
          label="Joined"
          value={u.dateOfJoin ? format(new Date(u.dateOfJoin), 'dd MMM yyyy') : null}
        />
        <MetaItem
          label="Reports to"
          value={u.reportingTo ? `${u.reportingTo.firstName} ${u.reportingTo.lastName}` : null}
        />
        <MetaItem
          label="Team lead"
          value={u.teamLead ? `${u.teamLead.firstName} ${u.teamLead.lastName}` : null}
        />
      </div>

      {/* Counts */}
      <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-y">
        {[
          { label: 'Reportees', value: u._count.subordinates },
          { label: 'Active reqs', value: u._count.assignmentsReceived },
          { label: 'Clients', value: u.clientSpocs.length },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center">
            <span className="text-sm font-bold tabular-nums">{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Active assignments */}
      {u.assignmentsReceived.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Active Requirements
            </span>
          </div>
          <div className="flex flex-col gap-1 px-4 pb-3 max-h-40 overflow-y-auto">
            {u.assignmentsReceived.map(a => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-2 py-1.5 border-b border-border/40 last:border-0"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-medium truncate">{a.requirement.title}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="font-mono">{a.requirement.reqCode}</span>
                    <span>·</span>
                    <span>{a.requirement.client.name}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${priorityColor(a.requirement.priority)}`}
                >
                  {a.requirement.priority}
                </Badge>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Client SPOCs */}
      {u.clientSpocs.length > 0 && (
        <>
          <Separator />
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Client SPOCs
            </span>
          </div>
          <div className="flex flex-col gap-1 px-4 pb-3">
            {u.clientSpocs.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{s.client.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {s.isPrimary && (
                    <Badge variant="outline" className="text-[10px]">
                      Primary
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">{s.serviceLine.name}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function UserCardPopover({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="p-0 w-auto shadow-lg border rounded-xl overflow-hidden"
        side="right"
        align="start"
        sideOffset={8}
      >
        <CardContent userId={userId} />
      </PopoverContent>
    </Popover>
  );
}
