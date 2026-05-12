'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  PauseCircle,
} from 'lucide-react';
import {
  usePipelines,
  usePipelineStats,
  usePipelineStages,
  useServiceLines,
  PipelineFilters,
} from './usePipeline';
import PipelineCard from './PipelineCard';
import AddToPipelineDialog from './AddToPipelineDialog';
import { cn } from '@/lib/utils';

type View = 'kanban' | 'list';

const STAGE_COL_COLORS: Record<string, string> = {
  '01': 'border-t-slate-400',
  '02': 'border-t-blue-400',
  '03': 'border-t-indigo-400',
  '04': 'border-t-violet-400',
  '05': 'border-t-purple-400',
  '06': 'border-t-fuchsia-400',
  '07A': 'border-t-pink-400',
  '07B': 'border-t-pink-400',
  '08': 'border-t-rose-400',
  '09': 'border-t-orange-400',
  '10': 'border-t-green-400',
};

type InitialFilters = {
  requirementId?: string;
  stageCode?: string;
  recruiterId?: string;
  clientId?: string;
};

type Props = {
  initialFilters?: InitialFilters;
};

export default function PipelineClient({ initialFilters }: Props) {
  const [view, setView] = useState<View>('kanban');
  const [showAdd, setShowAdd] = useState(false);

  // ── initialise filters from URL params passed by server component
  const [filters, setFilters] = useState<PipelineFilters>({
    page: 1,
    limit: 50,
    requirementId: initialFilters?.requirementId,
    stageCode: initialFilters?.stageCode,
    recruiterId: initialFilters?.recruiterId,
    clientId: initialFilters?.clientId,
  });

  const [search, setSearch] = useState('');
  const [selectedServiceLineId, setSelectedServiceLineId] = useState<string>('');

  const { data: serviceLines = [] } = useServiceLines();
  const { data: stages = [] } = usePipelineStages(selectedServiceLineId || undefined);
  const { data: stats } = usePipelineStats({
    requirementId: filters.requirementId,
    recruiterId: filters.recruiterId,
    clientId: filters.clientId,
  });

  const activeFilters = { ...filters, ...(search ? { search } : {}) };
  const { data, isLoading } = usePipelines(activeFilters);

  const pipelines = data?.data ?? [];
  const meta = data?.meta;

  const setFilter = useCallback((key: keyof PipelineFilters, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = () => {
    setFilters({ page: 1, limit: 50 });
    setSearch('');
    setSelectedServiceLineId('');
  };

  const hasActiveFilters =
    search ||
    filters.stageCode ||
    filters.isRejected ||
    filters.isWithdrawn ||
    filters.isOnHold ||
    filters.requirementId ||
    filters.recruiterId ||
    filters.clientId ||
    selectedServiceLineId;

  // group by stage for kanban
  const byStage = stages.reduce<Record<string, typeof pipelines>>((acc, stage) => {
    acc[stage.code] = pipelines.filter(p => p.currentStage.code === stage.code);
    return acc;
  }, {});

  return (
    // Fixed viewport — page never scrolls vertically
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header — fixed */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filters.requirementId
              ? 'Filtered by requirement'
              : 'All candidates across active requirements'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md p-0.5">
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setView('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add to Pipeline
          </Button>
        </div>
      </div>

      {/* ── Stats bar — fixed */}
      {stats && (
        <div className="flex items-center gap-4 px-6 py-2.5 border-b bg-muted/30 shrink-0 overflow-x-auto">
          <StatChip icon={<Users className="h-3.5 w-3.5" />} label="Active" value={stats.total} />
          <StatChip
            icon={<UserX className="h-3.5 w-3.5 text-destructive" />}
            label="Rejected"
            value={stats.rejected}
            muted
          />
          <StatChip
            icon={<UserX className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Withdrawn"
            value={stats.withdrawn}
            muted
          />
          <StatChip
            icon={<PauseCircle className="h-3.5 w-3.5 text-amber-500" />}
            label="On Hold"
            value={stats.onHold}
            muted
          />
          <div className="h-4 w-px bg-border mx-1 shrink-0" />
          {stats.byStage.map(s => (
            <StatChip key={s.stageId} label={s.label} value={s.count} code={s.code} />
          ))}
        </div>
      )}

      {/* ── Filters — fixed */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b shrink-0 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-48 text-sm"
            placeholder="Search candidate..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={selectedServiceLineId || 'all'}
          onValueChange={v => {
            const val = v === 'all' ? '' : v;
            setSelectedServiceLineId(val);
            setFilter('stageCode', undefined);
          }}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Service line" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All service lines</SelectItem>
            {serviceLines.map(sl => (
              <SelectItem key={sl.id} value={sl.id}>
                {sl.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.stageCode || 'all'}
          onValueChange={v => setFilter('stageCode', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {stages.map(s => (
              <SelectItem key={s.id} value={s.code}>
                {s.code} — {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            filters.isRejected === 'true'
              ? 'rejected'
              : filters.isWithdrawn === 'true'
                ? 'withdrawn'
                : filters.isOnHold === 'true'
                  ? 'hold'
                  : 'active'
          }
          onValueChange={v => {
            setFilter('isRejected', v === 'rejected' ? 'true' : undefined);
            setFilter('isWithdrawn', v === 'withdrawn' ? 'true' : undefined);
            setFilter('isOnHold', v === 'hold' ? 'true' : undefined);
          }}
        >
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
            <SelectItem value="hold">On Hold</SelectItem>
          </SelectContent>
        </Select>

        {/* Show active requirement filter pill if coming from requirements page */}
        {filters.requirementId && (
          <Badge variant="secondary" className="h-8 px-3 gap-1.5 text-xs">
            Req filter active
            <button
              onClick={() => setFilter('requirementId', undefined)}
              className="ml-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Clear all
          </Button>
        )}

        {meta && (
          <span className="ml-auto text-xs text-muted-foreground shrink-0">
            {meta.total} candidate{meta.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Scrollable content — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <LoadingSkeleton view={view} />
        ) : pipelines.length === 0 ? (
          <EmptyState />
        ) : view === 'kanban' ? (
          <KanbanView stages={stages} byStage={byStage} />
        ) : (
          <ListView pipelines={pipelines} />
        )}
      </div>

      {/* ── Pagination — pinned bottom, list view only */}
      {view === 'list' && meta && meta.pages > 1 && (
        <div className="flex items-center justify-between px-6 py-2.5 border-t shrink-0">
          <span className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.pages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={meta.page <= 1}
              onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) - 1 }))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={meta.page >= meta.pages}
              onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) + 1 }))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AddToPipelineDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

// ── Kanban view
function KanbanView({ stages, byStage }: { stages: any[]; byStage: Record<string, any[]> }) {
  return (
    <div className="flex gap-4 p-5 h-full min-w-max">
      {stages.map(stage => {
        const cards = byStage[stage.code] ?? [];
        const colColor = STAGE_COL_COLORS[stage.code] ?? 'border-t-slate-300';
        return (
          <div
            key={stage.id}
            className={cn(
              'flex flex-col w-72 shrink-0 bg-muted/40 rounded-xl border border-t-2 overflow-hidden',
              colColor
            )}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b bg-background/60 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{stage.code}</span>
                <span className="text-sm font-medium">{stage.label}</span>
              </div>
              <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-[20px] justify-center">
                {cards.length}
              </Badge>
            </div>
            {/* Column cards scroll independently */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {cards.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No candidates</p>
              ) : (
                cards.map((p: any) => <PipelineCard key={p.id} pipeline={p} stages={stages} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── List view
function ListView({ pipelines }: { pipelines: any[] }) {
  return (
    <div className="p-5">
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Candidate', 'Requirement', 'Stage', 'Recruiter', 'Status', 'Updated'].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {pipelines.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{p.snapshot.fullName}</p>
                  <p className="text-xs text-muted-foreground">{p.snapshot.email}</p>
                  {p.snapshot.currentTitle && (
                    <p className="text-xs text-muted-foreground">{p.snapshot.currentTitle}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium">{p.requirement.reqCode}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {p.requirement.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.requirement.client?.name}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">
                    {p.currentStage.code} {p.currentStage.label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {p.recruiter.firstName} {p.recruiter.lastName}
                </td>
                <td className="px-4 py-3">
                  {p.isRejected && (
                    <Badge variant="destructive" className="text-xs">
                      Rejected
                    </Badge>
                  )}
                  {p.isWithdrawn && (
                    <Badge variant="outline" className="text-xs">
                      Withdrawn
                    </Badge>
                  )}
                  {p.isOnHold && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                    >
                      On Hold
                    </Badge>
                  )}
                  {!p.isRejected && !p.isWithdrawn && !p.isOnHold && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700 border-green-200"
                    >
                      Active
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {timeAgo(new Date(p.stageUpdatedAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── helpers
function StatChip({
  icon,
  label,
  value,
  muted,
  code,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  muted?: boolean;
  code?: string;
}) {
  return (
    <div
      className={cn('flex items-center gap-1.5 text-xs shrink-0', muted && 'text-muted-foreground')}
    >
      {icon}
      <span className={cn(muted ? 'text-muted-foreground' : 'text-foreground')}>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function LoadingSkeleton({ view }: { view: View }) {
  if (view === 'kanban') {
    return (
      <div className="flex gap-4 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-2.5">
            <Skeleton className="h-9 w-full rounded-lg" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <UserCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">No candidates in pipeline</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Add a candidate to get started</p>
    </div>
  );
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  return `${mins}m ago`;
}
