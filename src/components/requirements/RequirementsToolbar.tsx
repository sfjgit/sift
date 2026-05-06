/* eslint-disable @typescript-eslint/no-explicit-any */
// components/requirements/RequirementsToolbar.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { RequirementsFilters } from './RequirementsFilters';
import { FilterChip } from './FilterChip';
import { STATUS_OPTIONS } from './constants';
import { countActiveFilters, humanize } from './utils';
import type { RequirementFilters } from './types';

interface Props {
  filters: RequirementFilters;
  setFilter: <K extends keyof RequirementFilters>(k: K, v: RequirementFilters[K]) => void;
  onClear: () => void;
  clients: { id: string; name: string }[];
  businessUnits: { id: string; name: string }[];
}

export function RequirementsToolbar({
  filters,
  setFilter,
  onClear,
  clients,
  businessUnits,
}: Props) {
  const activeCount = countActiveFilters(filters);

  return (
    <div className="flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search title, code, skills…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            className="h-9 pr-8"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status inline */}
        <Select
          value={filters.status || '_'}
          onValueChange={v => setFilter('status', v === '_' ? '' : (v as any))}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Status" />
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

        {/* Priority inline */}
        <Select
          value={filters.priority || '_'}
          onValueChange={v => setFilter('priority', v === '_' ? '' : (v as any))}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">All priorities</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={`${filters.sortBy}:${filters.sortDir}`}
          onValueChange={v => {
            const [by, dir] = v.split(':') as [RequirementFilters['sortBy'], 'asc' | 'desc'];
            setFilter('sortBy', by);
            setFilter('sortDir', dir);
          }}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest first</SelectItem>
            <SelectItem value="createdAt:asc">Oldest first</SelectItem>
            <SelectItem value="respondBy:asc">Respond by ↑</SelectItem>
            <SelectItem value="respondBy:desc">Respond by ↓</SelectItem>
            <SelectItem value="priority:desc">Priority high–low</SelectItem>
            <SelectItem value="startDate:asc">Start date ↑</SelectItem>
            <SelectItem value="updatedAt:desc">Recently updated</SelectItem>
          </SelectContent>
        </Select>

        {/* Full filter sheet */}
        <RequirementsFilters
          filters={filters}
          setFilter={setFilter}
          onClear={onClear}
          activeCount={activeCount}
          clients={clients}
          businessUnits={businessUnits}
        />

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.status && (
            <FilterChip
              label={`Status: ${STATUS_OPTIONS.find(s => s.value === filters.status)?.label}`}
              onRemove={() => setFilter('status', '')}
            />
          )}
          {filters.priority && (
            <FilterChip
              label={`Priority: ${humanize(filters.priority)}`}
              onRemove={() => setFilter('priority', '')}
            />
          )}
          {filters.jobType && (
            <FilterChip
              label={`Type: ${humanize(filters.jobType)}`}
              onRemove={() => setFilter('jobType', '')}
            />
          )}
          {filters.remoteType && (
            <FilterChip
              label={`Remote: ${humanize(filters.remoteType)}`}
              onRemove={() => setFilter('remoteType', '')}
            />
          )}
          {filters.clientId && (
            <FilterChip
              label={`Client: ${clients.find(c => c.id === filters.clientId)?.name ?? 'Selected'}`}
              onRemove={() => setFilter('clientId', '')}
            />
          )}
          {filters.buId && (
            <FilterChip
              label={`BU: ${businessUnits.find(b => b.id === filters.buId)?.name ?? 'Selected'}`}
              onRemove={() => setFilter('buId', '')}
            />
          )}
          {filters.assignedToMe && (
            <FilterChip label="Assigned to me" onRemove={() => setFilter('assignedToMe', false)} />
          )}
          {filters.breached && (
            <FilterChip label="Breached" onRemove={() => setFilter('breached', false)} />
          )}
          {(filters.respondByFrom || filters.respondByTo) && (
            <FilterChip
              label={`Respond by: ${filters.respondByFrom || '…'} → ${filters.respondByTo || '…'}`}
              onRemove={() => {
                setFilter('respondByFrom', '');
                setFilter('respondByTo', '');
              }}
            />
          )}
          {(filters.startDateFrom || filters.startDateTo) && (
            <FilterChip
              label={`Start: ${filters.startDateFrom || '…'} → ${filters.startDateTo || '…'}`}
              onRemove={() => {
                setFilter('startDateFrom', '');
                setFilter('startDateTo', '');
              }}
            />
          )}
          {(filters.createdFrom || filters.createdTo) && (
            <FilterChip
              label={`Created: ${filters.createdFrom || '…'} → ${filters.createdTo || '…'}`}
              onRemove={() => {
                setFilter('createdFrom', '');
                setFilter('createdTo', '');
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
