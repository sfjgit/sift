// components/requirements/constants.ts

import type { RequirementStatus } from './types';

export const STATUS_OPTIONS: { value: RequirementStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const VALID_TRANSITIONS: Record<RequirementStatus, RequirementStatus[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

export const DEFAULT_FILTERS = {
  search: '',
  status: '' as const,
  priority: '' as const,
  jobType: '' as const,
  remoteType: '' as const,
  clientId: '',
  buId: '',
  createdById: '',
  assignedToMe: false,
  breached: false,
  respondByFrom: '',
  respondByTo: '',
  startDateFrom: '',
  startDateTo: '',
  createdFrom: '',
  createdTo: '',
  page: 1,
  limit: 25,
  sortBy: 'createdAt' as const,
  sortDir: 'desc' as const,
};
