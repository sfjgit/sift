'use client';

import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  label: string;
  width?: string;
  render: (row: T) => React.ReactNode;
}

interface CompactTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  maxHeight?: string;
  emptyMessage?: string;
}

export function CompactTable<T>({
  columns,
  rows,
  maxHeight = '240px',
  emptyMessage = 'No records found.',
}: CompactTableProps<T>) {
  return (
    <div className="border border-border rounded-lg overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-xs border-collapse" style={{ minWidth: '100%' }}>
        <thead>
          <tr className="bg-muted/60 sticky top-0 z-10">
            {columns.map(col => (
              <th
                key={col.key}
                className="text-left font-medium text-muted-foreground px-3 py-2 border-b border-border whitespace-nowrap"
                style={{ width: col.width, minWidth: col.width ?? '80px' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                  i % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                )}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="px-3 py-1.5 text-foreground align-middle whitespace-nowrap"
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
