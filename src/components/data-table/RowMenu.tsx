// File: RowMenu.tsx
// Path: src/components/data-table/RowMenu.tsx
//
// One list of row actions, shown two ways: the "⋯" button in the last column
// and the right-click menu anywhere on the row (so nobody has to scroll right).

'use client';

import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface RowMenuItem {
  label: string;
  icon?: LucideIcon;
  iconClass?: string;
  onSelect: () => void;
  destructive?: boolean;
  /** draw a line above this item */
  separatorBefore?: boolean;
}

/** the actions of one row; falsy entries are skipped (permission checks inline) */
export type RowMenu<T> = (row: T) => (RowMenuItem | false | null | undefined)[];

export const menuItems = <T,>(menu: RowMenu<T> | undefined, row: T) =>
  (menu?.(row) ?? []).filter(Boolean) as RowMenuItem[];

/** the "⋯" button in the actions column */
export function RowActionsButton({ items, label }: { items: RowMenuItem[]; label: string }) {
  if (!items.length) return null;
  return (
    <div data-no-row-click>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${label}`}
            title="Actions — or right-click anywhere on the row"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {items.map(it => (
            <RowItemDropdown key={it.label} it={it} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function RowItemDropdown({ it }: { it: RowMenuItem }) {
  const Icon = it.icon;
  return (
    <>
      {it.separatorBefore && <DropdownMenuSeparator />}
      <DropdownMenuItem
        variant={it.destructive ? 'destructive' : 'default'}
        onSelect={() => it.onSelect()}
      >
        {Icon && <Icon className={it.iconClass} />} {it.label}
      </DropdownMenuItem>
    </>
  );
}
