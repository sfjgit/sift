'use client';

import Link from 'next/link';
import { Client } from '@/types/core.types';
import { PaginationMeta } from '@/types/clients.types';
import ClientTableSkeleton from './Clienttableskeleton';
import ClientRowActions from './Clientrowactions';
import ClientsPagination from './Clientspagination';
import ClientStatusBadge from './Clientstatusbadge';

interface Props {
  data: Client[];
  isLoading: boolean;
  isError: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope?: string | null;
  pagination?: PaginationMeta;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
}

const COLUMNS = [
  { key: 'id', label: 'Client Id', w: '80px' },
  { key: 'name', label: 'Client Name', w: '180px' },
  { key: 'phone', label: 'Company Contact Number', w: '170px' },
  { key: 'website', label: 'Website', w: '200px' },
  { key: 'industry', label: 'Industry', w: '180px' },
  { key: 'status', label: 'Status', w: '100px' },
  { key: 'category', label: 'Category', w: '110px' },
  { key: 'primaryOwner', label: 'Primary Owner', w: '140px' },
  { key: 'businessUnit', label: 'Business Unit', w: '140px' },
  { key: 'createdBy', label: 'Created by', w: '110px' },
  { key: 'createdAt', label: 'Created At', w: '90px' },
];

function SortIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="ml-1 inline-block flex-shrink-0 opacity-40"
    >
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
    </svg>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function ClientsTable({
  data,
  isLoading,
  isError,
  canEdit,
  canDelete,
  scope,
  pagination,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: Props) {
  const totalCols = COLUMNS.length + (canEdit || canDelete ? 1 : 0);

  return (
    <>
      {/* Scrollable area — fills all remaining height */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-[#F0F4F8]">
              {/* Checkbox col */}
              <th className="w-20 border-r border-gray-200 px-3 py-2.5 text-left">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-[#0066CC]"
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    #
                  </span>
                </div>
              </th>

              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  style={{ minWidth: col.w }}
                  className="border-r border-gray-200 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 last:border-r-0 whitespace-nowrap"
                >
                  {col.label}
                  <SortIcon />
                </th>
              ))}

              {(canEdit || canDelete) && (
                <th className="w-16 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              <ClientTableSkeleton cols={totalCols} />
            ) : isError ? (
              <tr>
                <td colSpan={totalCols} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-sm font-medium">Failed to load clients</p>
                    <p className="text-xs">Please refresh and try again</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                    <p className="text-sm font-medium">No clients found</p>
                    <p className="text-xs">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((client, idx) => {
                const primaryContact =
                  client.contacts?.find(c => c.isPrimary) ?? client.contacts?.[0];
                const primaryHandler = client.handlers?.find(h => h.role === 'PRIMARY');
                const rowNum = (page - 1) * limit + idx + 1;

                return (
                  <tr
                    key={client.id}
                    className="group cursor-pointer transition-colors hover:bg-blue-50/50"
                  >
                    {/* Row number + checkbox */}
                    <td className="border-r border-gray-100 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-[#0066CC] opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex gap-1">
                          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-[#0066CC]/10 px-1 text-[10px] font-bold text-[#0066CC]">
                            {rowNum}
                          </span>
                          {client.contacts.length > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0066CC] text-[10px] font-bold text-white">
                              {client.contacts.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="border-r border-gray-100 px-3 py-2">
                      <span className="font-mono text-xs text-gray-500">{rowNum + 100}</span>
                    </td>

                    {/* Name */}
                    <td className="border-r border-gray-100 px-3 py-2">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="font-medium text-[#0066CC] hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {client.name}
                      </Link>
                    </td>

                    {/* Phone */}
                    <td className="border-r border-gray-100 px-3 py-2 text-gray-600 text-xs">
                      {primaryContact?.phone ?? <span className="text-gray-300">—</span>}
                    </td>

                    {/* Website */}
                    <td className="border-r border-gray-100 px-3 py-2">
                      {client.website ? (
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noreferrer"
                          className="block max-w-[180px] truncate text-xs text-[#0066CC] hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {client.website}
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Industry */}
                    <td className="border-r border-gray-100 px-3 py-2 text-xs text-gray-600">
                      {client.industry ?? <span className="text-gray-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="border-r border-gray-100 px-3 py-2">
                      <ClientStatusBadge status={client.status} />
                    </td>

                    {/* Category */}
                    <td className="border-r border-gray-100 px-3 py-2 text-xs text-gray-600">
                      {client.category ?? <span className="text-gray-300">—</span>}
                    </td>

                    {/* Primary Owner */}
                    <td className="border-r border-gray-100 px-3 py-2 text-xs text-gray-600">
                      {primaryHandler ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700">
                            {primaryHandler.userId.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-mono">{primaryHandler.userId.slice(0, 8)}…</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Business Unit */}
                    <td className="border-r border-gray-100 px-3 py-2 text-xs">
                      {client.businessUnit ? (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                          {client.businessUnit.name}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Created By */}
                    <td className="border-r border-gray-100 px-3 py-2 text-xs text-gray-500 font-mono">
                      {client.createdById.slice(0, 8)}…
                    </td>

                    {/* Created At */}
                    <td className="border-r border-gray-100 px-3 py-2 text-xs text-gray-500">
                      {formatDate(client.createdAt)}
                    </td>

                    {/* Actions */}
                    {(canEdit || canDelete) && (
                      <td className="px-2 py-2 text-center">
                        <ClientRowActions
                          clientId={client.id}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky pagination — never scrolls */}
      {pagination && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          <ClientsPagination
            pagination={pagination}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </div>
      )}
    </>
  );
}
