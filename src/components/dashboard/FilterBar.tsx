'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useBusinessUnits,
  useDepartments,
  useServiceLines,
  useClientOptions,
} from '@/hooks/useDashboard';
import type { BU } from '@/types/dashboard';
import { cn } from '@/lib/utils';

function flattenBUs(bus: BU[], depth = 0): { id: string; name: string; depth: number }[] {
  return bus.flatMap(bu => [
    { id: bu.id, name: bu.name, depth },
    ...flattenBUs(bu.children ?? [], depth + 1),
  ]);
}

function buildBUTree(flat: BU[]): BU[] {
  const map = new Map<string, BU & { children: BU[] }>();
  flat.forEach(b => map.set(b.id, { ...b, children: [] }));
  const roots: BU[] = [];
  flat.forEach(b => {
    if (b.parentBUId && map.has(b.parentBUId)) {
      map.get(b.parentBUId)!.children!.push(map.get(b.id)!);
    } else {
      roots.push(map.get(b.id)!);
    }
  });
  return roots;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: '🔴 High' },
  { value: 'MEDIUM', label: '🟡 Medium' },
  { value: 'LOW', label: '⚪ Low' },
];

interface FilterBarProps {
  showBU?: boolean;
  showDept?: boolean;
  showServiceLine?: boolean;
  showClient?: boolean;
  showStatus?: boolean;
  showPriority?: boolean;
}

export function FilterBar({
  showBU = true,
  showDept = true,
  showServiceLine = true,
  showClient = true,
  showStatus = true,
  showPriority = true,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const buId = searchParams.get('buId') ?? undefined;

  const { data: busFlat, isLoading: buLoading } = useBusinessUnits();
  const { data: depts, isLoading: deptLoading } = useDepartments();
  const { data: sls, isLoading: slLoading } = useServiceLines();
  const { data: clients, isLoading: clientLoading } = useClientOptions(buId);

  const flatBUs = flattenBUs(buildBUTree(busFlat ?? []));

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'ALL') {
        params.set(key, value);
        if (key === 'buId') params.delete('clientId');
      } else {
        params.delete(key);
      }
      params.delete('page');
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const activeFilters = [
    'buId',
    'deptId',
    'serviceLineId',
    'clientId',
    'status',
    'priority',
  ].filter(k => searchParams.has(k));
  const hasFilters = activeFilters.length > 0;

  const FilterSkeleton = () => <Skeleton className="h-8 w-[150px] rounded-md" />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filter</span>
        {hasFilters && (
          <span
            className={cn(
              'inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold',
              'bg-primary text-primary-foreground'
            )}
          >
            {activeFilters.length}
          </span>
        )}
      </div>

      {/* BU */}
      {showBU &&
        (buLoading ? (
          <FilterSkeleton />
        ) : (
          <Select
            value={searchParams.get('buId') ?? 'ALL'}
            onValueChange={v => setParam('buId', v)}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Business Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Business Units</SelectItem>
              {flatBUs.map(bu => (
                <SelectItem key={bu.id} value={bu.id}>
                  <span className="flex items-center gap-1">
                    {bu.depth > 0 && (
                      <span className="text-muted-foreground/40 text-xs">
                        {'└ '.repeat(bu.depth)}
                      </span>
                    )}
                    {bu.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

      {/* Department */}
      {showDept &&
        (deptLoading ? (
          <FilterSkeleton />
        ) : (
          <Select
            value={searchParams.get('deptId') ?? 'ALL'}
            onValueChange={v => setParam('deptId', v)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {(depts ?? []).map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

      {/* Service Line */}
      {showServiceLine &&
        (slLoading ? (
          <FilterSkeleton />
        ) : (
          <Select
            value={searchParams.get('serviceLineId') ?? 'ALL'}
            onValueChange={v => setParam('serviceLineId', v)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Service Line" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Service Lines</SelectItem>
              {(sls ?? []).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

      {/* Client */}
      {showClient &&
        (clientLoading ? (
          <FilterSkeleton />
        ) : (
          <Select
            value={searchParams.get('clientId') ?? 'ALL'}
            onValueChange={v => setParam('clientId', v)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Clients</SelectItem>
              {(clients ?? []).map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

      {/* Status */}
      {showStatus && (
        <Select
          value={searchParams.get('status') ?? 'ALL'}
          onValueChange={v => setParam('status', v)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Priority */}
      {showPriority && (
        <Select
          value={searchParams.get('priority') ?? 'ALL'}
          onValueChange={v => setParam('priority', v)}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map(p => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => startTransition(() => router.push(pathname))}
          disabled={isPending}
        >
          <X className="h-3 w-3 mr-1" />
          Clear {activeFilters.length > 1 ? `(${activeFilters.length})` : ''}
        </Button>
      )}

      {isPending && (
        <span className="text-xs text-muted-foreground animate-pulse">Filtering...</span>
      )}
    </div>
  );
}
