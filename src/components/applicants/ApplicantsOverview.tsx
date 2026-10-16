// File: ApplicantsOverview.tsx
// Path: src/components/applicants/ApplicantsOverview.tsx

'use client';

import { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  ChevronRight,
  Search,
  UserCheck,
  Users,
  UserX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ALL_TAB,
  REQUIREMENTS_TAB,
  chartColor,
  chartTint,
  toStatusLabel,
} from '@/components/applicants/utils';
import type { ApplicantSummary } from '@/types/applicant';

// icon per assignment bucket — unknown keys fall back to Users
const BUCKET_ICONS: Record<string, LucideIcon> = {
  UNASSIGNED: UserX,
  ASSIGNED: UserCheck,
};

const ALL_CLIENTS = 'ALL';
const STAT_SKELETONS = 5;
const HEAD = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

interface Props {
  summary?: ApplicantSummary;
  statusKeys: string[];
  onSelectTab: (tab: string) => void; // card click → switch tab on the same page
}

export function ApplicantsOverview({ summary, statusKeys, onSelectTab }: Props) {
  const [clientsOpen, setClientsOpen] = useState(false);
  const [clientId, setClientId] = useState(ALL_CLIENTS);
  const [search, setSearch] = useState('');

  const clients = summary?.clients ?? [];

  // client dropdown + search (client name, req code, req title)
  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients
      .filter(c => clientId === ALL_CLIENTS || c.id === clientId)
      .map(c => {
        if (!term || c.name.toLowerCase().includes(term)) return c;
        const requirements = c.requirements.filter(
          r => r.reqCode.toLowerCase().includes(term) || r.title.toLowerCase().includes(term)
        );
        return { ...c, requirements };
      })
      .filter(c => c.requirements.length > 0);
  }, [clients, clientId, search]);

  const hasFilters = clientId !== ALL_CLIENTS || !!search;

  const resetFilters = () => {
    setClientId(ALL_CLIENTS);
    setSearch('');
  };

  if (!summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: STAT_SKELETONS }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const total = summary.totalApplicants;
  const requirementsSeries = statusKeys.length + 2; // colour index after total + buckets
  const clientsSeries = requirementsSeries + 1;

  const stats: {
    label: string;
    value: number;
    hint: string;
    icon: LucideIcon;
    series: number;
    onClick: () => void;
  }[] = [
    {
      label: 'Total applicants',
      value: total,
      hint: `Across ${summary.requirementsWithApplicants} requirement(s)`,
      icon: Users,
      series: 1,
      onClick: () => onSelectTab(ALL_TAB),
    },
    ...statusKeys.map((k, i) => {
      const n = summary.counts[k] ?? 0;
      return {
        label: toStatusLabel(k),
        value: n,
        hint: total ? `${Math.round((n / total) * 100)}% of applicants` : 'No applicants yet',
        icon: BUCKET_ICONS[k] ?? Users,
        series: i + 2,
        onClick: () => onSelectTab(k),
      };
    }),
    {
      label: 'Requirements',
      value: summary.totalRequirements,
      hint: `${summary.requirementsWithApplicants} with applicants`,
      icon: Briefcase,
      series: requirementsSeries,
      onClick: () => onSelectTab(REQUIREMENTS_TAB),
    },
    {
      label: 'Clients',
      value: summary.clientsWithApplicants,
      hint: `${total} applicant(s) across ${summary.clientsWithApplicants} client(s)`,
      icon: Building2,
      series: clientsSeries,
      onClick: () => setClientsOpen(true),
    },
  ];

  return (
    <>
      {/* stats — every card is a link */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(s => (
          <Card
            key={s.label}
            className="group cursor-pointer gap-0 py-0 transition-colors hover:bg-muted/50"
            onClick={s.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && s.onClick()}
          >
            <div className="flex items-center gap-3 p-4">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                style={{ color: chartColor(s.series), backgroundColor: chartTint(s.series) }}
              >
                <s.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold leading-tight">{s.value.toLocaleString()}</p>
                <p className="truncate text-[11px] text-muted-foreground underline-offset-2 group-hover:text-primary group-hover:underline">
                  {s.hint}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Card>
        ))}
      </div>

      {/* clients → requirements → applicant counts */}
      <Dialog
        open={clientsOpen}
        onOpenChange={o => {
          setClientsOpen(o);
          if (!o) resetFilters();
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-base">Applicants by client</DialogTitle>
            <DialogDescription className="text-[13px]">
              {total} applicant(s) across {summary.clientsWithApplicants} client(s) ·{' '}
              {clients.length} client(s) in scope
            </DialogDescription>
          </DialogHeader>

          {/* filters */}
          <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-9 w-60 text-[13px]">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLIENTS}>All clients</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.applicantCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search client, req code or title…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 pl-8 text-[13px]"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            )}
          </div>

          {/* list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <p className="py-12 text-center text-[13px] text-muted-foreground">
                No clients or requirements match these filters.
              </p>
            ) : (
              filteredClients.map(c => (
                <div key={c.id} className="border-b last:border-0">
                  {/* client header */}
                  <div className="flex items-center justify-between gap-3 bg-muted/50 px-5 py-2.5">
                    <p className="truncate text-[13px] font-semibold">{c.name}</p>
                    <div className="flex shrink-0 items-center gap-2 text-[12px] text-muted-foreground">
                      <span>{c.requirements.length} req(s)</span>
                      <Badge variant={c.applicantCount > 0 ? 'default' : 'secondary'}>
                        {c.applicantCount} applicant(s)
                      </Badge>
                    </div>
                  </div>

                  {/* requirement rows */}
                  <div className="flex items-center gap-3 px-5 pt-2">
                    <span className={cn(HEAD, 'flex-1')}>Requirement</span>
                    <span className={cn(HEAD, 'w-24')}>Status</span>
                    <span className={cn(HEAD, 'w-32 text-right')}>Applicants</span>
                  </div>
                  {c.requirements.map(r => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 border-b border-border/40 px-5 py-2 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{r.title}</p>
                        <p className="text-[12px] text-muted-foreground">{r.reqCode}</p>
                      </div>
                      <div className="w-24">
                        <Badge variant="outline" className="font-normal">
                          {toStatusLabel(r.status)}
                        </Badge>
                      </div>
                      <div className="w-32 text-right">
                        <p className="text-[13px] font-semibold">{r.count}</p>
                        {r.count > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            {statusKeys
                              .map(k => `${r.counts[k] ?? 0} ${toStatusLabel(k).toLowerCase()}`)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
