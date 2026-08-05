// File: TicketBadges.tsx
// Path: src/components/tickets/TicketBadges.tsx

'use client';

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-gray-100 text-gray-600 border-gray-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-gray-50 text-gray-500 border-gray-200',
  REOPENED: 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'bg-gray-50 text-gray-600 border-gray-200',
  MEDIUM: 'bg-sky-50 text-sky-700 border-sky-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  URGENT: 'bg-red-50 text-red-700 border-red-200',
};

const base =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap';

const label = (v: string) => v.replace(/_/g, ' ');

export const StatusBadge = ({ value }: { value: string }) => (
  <span className={`${base} ${STATUS_STYLE[value] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
    {label(value)}
  </span>
);

export const PriorityBadge = ({ value }: { value: string }) => (
  <span
    className={`${base} ${PRIORITY_STYLE[value] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
  >
    {label(value)}
  </span>
);
