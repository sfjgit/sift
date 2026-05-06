/* eslint-disable @typescript-eslint/no-explicit-any */
// components/requirements/RequirementsFilters.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { STATUS_OPTIONS } from './constants';
import type { RequirementFilters } from './types';

interface Props {
  filters: RequirementFilters;
  setFilter: <K extends keyof RequirementFilters>(k: K, v: RequirementFilters[K]) => void;
  onClear: () => void;
  activeCount: number;
  clients: { id: string; name: string }[];
  businessUnits: { id: string; name: string }[];
}

export function RequirementsFilters({
  filters,
  setFilter,
  onClear,
  activeCount,
  clients,
  businessUnits,
}: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          Filters
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
            <Select
              value={filters.status || '_'}
              onValueChange={v => setFilter('status', v === '_' ? '' : (v as any))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All statuses</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Priority
            </Label>
            <Select
              value={filters.priority || '_'}
              onValueChange={v => setFilter('priority', v === '_' ? '' : (v as any))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All priorities</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Job type
            </Label>
            <Select
              value={filters.jobType || '_'}
              onValueChange={v => setFilter('jobType', v === '_' ? '' : (v as any))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All types</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="PERMANENT">Permanent</SelectItem>
                <SelectItem value="CONTRACT_TO_HIRE">Contract to hire</SelectItem>
                <SelectItem value="FREELANCE">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Remote type
            </Label>
            <Select
              value={filters.remoteType || '_'}
              onValueChange={v => setFilter('remoteType', v === '_' ? '' : (v as any))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All</SelectItem>
                <SelectItem value="ONSITE">Onsite</SelectItem>
                <SelectItem value="REMOTE">Remote</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Client</Label>
            <Select
              value={filters.clientId || '_'}
              onValueChange={v => setFilter('clientId', v === '_' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All clients</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Business unit
            </Label>
            <Select
              value={filters.buId || '_'}
              onValueChange={v => setFilter('buId', v === '_' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All BUs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All BUs</SelectItem>
                {businessUnits.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {(['respondBy', 'startDate', 'created'] as const).map(key => {
            const fromKey = `${key}From` as keyof RequirementFilters;
            const toKey = `${key}To` as keyof RequirementFilters;
            const labels: Record<string, string> = {
              respondBy: 'Respond by',
              startDate: 'Start date',
              created: 'Created',
            };
            return (
              <div key={key} className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  {labels[key]}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">From</span>
                    <Input
                      type="date"
                      className="h-9"
                      value={filters[fromKey] as string}
                      onChange={e => setFilter(fromKey, e.target.value as any)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">To</span>
                    <Input
                      type="date"
                      className="h-9"
                      value={filters[toKey] as string}
                      onChange={e => setFilter(toKey, e.target.value as any)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <Separator />

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Quick filters
            </Label>
            <div className="flex flex-col gap-2">
              {[
                { key: 'assignedToMe' as const, label: 'Assigned to me', variant: 'primary' },
                { key: 'breached' as const, label: 'Breached only', variant: 'destructive' },
              ].map(({ key, label, variant }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key, !filters[key] as any)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                    filters[key]
                      ? variant === 'destructive'
                        ? 'border-destructive bg-destructive/5 text-destructive'
                        : 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-foreground hover:bg-muted/50'
                  }`}
                >
                  {label}
                  {filters[key] && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <SheetFooter className="px-5 py-4 border-t">
          {activeCount > 0 && (
            <Button variant="outline" className="w-full" onClick={onClear}>
              Clear all filters
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
