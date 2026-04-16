'use client';

import { CLIENT_STATUS_LABELS } from '@/constants/modules';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
}

export default function ClientsFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex items-center overflow-hidden rounded-md border border-gray-300 bg-white text-sm shadow-sm">
        {/* <select className="border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 focus:outline-none">
          <option>Search Any</option>
          <option>Client Name</option>
          <option>Industry</option>
          <option>City</option>
        </select> */}
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Type to search…"
          className="w-52 px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none"
        />
        <button className="border-l border-gray-200 px-2.5 py-1.5 text-gray-400 hover:text-[#0066CC]">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      <select
        value={statusFilter}
        onChange={e => onStatusChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-600 shadow-sm focus:border-[#0066CC] focus:outline-none"
      >
        <option value="">All Status</option>
        {Object.entries(CLIENT_STATUS_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <div className="flex-1" />

      <button className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Columns
      </button>

      <button className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filter
      </button>
    </div>
  );
}
