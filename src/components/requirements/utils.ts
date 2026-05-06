// components/requirements/utils.ts

import type { RequirementFilters, RequirementStatus, RequirementPriority } from './types';

export function humanize(str: string) {
  return str
    .split('_')
    .map(w => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

export function statusVariant(
  s: RequirementStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'ACTIVE':
      return 'default';
    case 'DRAFT':
    case 'PENDING_APPROVAL':
      return 'secondary';
    case 'CLOSED':
    case 'CANCELLED':
      return 'destructive';
    case 'ON_HOLD':
      return 'outline';
  }
}

export function priorityVariant(
  p: RequirementPriority
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (p) {
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function countActiveFilters(f: RequirementFilters): number {
  let n = 0;
  if (f.status) n++;
  if (f.priority) n++;
  if (f.jobType) n++;
  if (f.remoteType) n++;
  if (f.clientId) n++;
  if (f.buId) n++;
  if (f.createdById) n++;
  if (f.assignedToMe) n++;
  if (f.breached) n++;
  if (f.respondByFrom || f.respondByTo) n++;
  if (f.startDateFrom || f.startDateTo) n++;
  if (f.createdFrom || f.createdTo) n++;
  return n;
}

export function buildQueryString(filters: RequirementFilters, debouncedSearch: string): string {
  const p: Record<string, string> = {
    page: String(filters.page),
    limit: String(filters.limit),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  };
  if (debouncedSearch) p.search = debouncedSearch;
  if (filters.status) p.status = filters.status;
  if (filters.priority) p.priority = filters.priority;
  if (filters.jobType) p.jobType = filters.jobType;
  if (filters.remoteType) p.remoteType = filters.remoteType;
  if (filters.clientId) p.clientId = filters.clientId;
  if (filters.buId) p.buId = filters.buId;
  if (filters.createdById) p.createdById = filters.createdById;
  if (filters.assignedToMe) p.assignedToMe = 'true';
  if (filters.breached) p.breached = 'true';
  if (filters.respondByFrom) p.respondByFrom = new Date(filters.respondByFrom).toISOString();
  if (filters.respondByTo) p.respondByTo = new Date(filters.respondByTo).toISOString();
  if (filters.startDateFrom) p.startDateFrom = new Date(filters.startDateFrom).toISOString();
  if (filters.startDateTo) p.startDateTo = new Date(filters.startDateTo).toISOString();
  if (filters.createdFrom) p.createdFrom = new Date(filters.createdFrom).toISOString();
  if (filters.createdTo) p.createdTo = new Date(filters.createdTo).toISOString();
  return new URLSearchParams(p).toString();
}
