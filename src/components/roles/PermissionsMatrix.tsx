'use client';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  type PermissionRowPayload,
  type PermissionScope,
  SCOPE_OPTIONS,
  formatModule,
} from '@/types/role.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  modules: string[];
  rows: PermissionRowPayload[];
  readOnly?: boolean;
  onChange?: (rows: PermissionRowPayload[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope styles
// ─────────────────────────────────────────────────────────────────────────────

const SCOPE_STYLES: Record<PermissionScope, { badge: string; desc: string }> = {
  OWN: {
    badge:
      'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
    desc: 'Own records only',
  },
  TEAM: {
    badge:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400',
    desc: 'Team records',
  },
  MANAGER: {
    badge:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400',
    desc: 'Manager + team records',
  },
  BU: {
    badge:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400',
    desc: 'Entire BU',
  },
  ALL: {
    badge:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400',
    desc: 'All records',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRow(rows: PermissionRowPayload[], module: string): PermissionRowPayload {
  return (
    rows.find(r => r.module === module) ?? {
      module,
      canView: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
      scope: 'OWN',
    }
  );
}

function hasAnyPermission(row: PermissionRowPayload) {
  return row.canView || row.canAdd || row.canEdit || row.canDelete;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read-only tick
// ─────────────────────────────────────────────────────────────────────────────

function Tick({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50">
        <svg
          className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 6.5L4.5 9L10 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/60">
      <svg className="h-3 w-3 text-muted-foreground/40" viewBox="0 0 12 12" fill="none">
        <path d="M3 9L9 3M3 3l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function PermissionsMatrix({ modules, rows, readOnly = false, onChange }: Props) {
  function updateRow(module: string, patch: Partial<PermissionRowPayload>) {
    if (!onChange) return;
    const existing = rows.find(r => r.module === module);
    if (existing) {
      onChange(rows.map(r => (r.module === module ? { ...r, ...patch } : r)));
    } else {
      onChange([...rows, { ...getRow(rows, module), ...patch }]);
    }
  }

  function handleModuleToggle(module: string, enabled: boolean) {
    if (enabled) {
      updateRow(module, { canView: true });
    } else {
      updateRow(module, { canView: false, canAdd: false, canEdit: false, canDelete: false });
    }
  }

  function handleViewChange(module: string, checked: boolean) {
    if (!checked) {
      updateRow(module, { canView: false, canAdd: false, canEdit: false, canDelete: false });
    } else {
      updateRow(module, { canView: true });
    }
  }

  function handleActionChange(
    module: string,
    key: 'canAdd' | 'canEdit' | 'canDelete',
    checked: boolean
  ) {
    const row = getRow(rows, module);
    const patch: Partial<PermissionRowPayload> = { [key]: checked };
    if (checked && !row.canView) patch.canView = true;
    updateRow(module, patch);
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!modules.length) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        No modules available
      </div>
    );
  }

  // ── Read-only ─────────────────────────────────────────────────────────────

  if (readOnly) {
    const activeRows = modules.map(m => getRow(rows, m)).filter(hasAnyPermission);
    const inactiveModules = modules.filter(m => !hasAnyPermission(getRow(rows, m)));

    return (
      <div className="space-y-1">
        {activeRows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No permissions granted</p>
        )}
        {activeRows.map(row => (
          <div
            key={row.module}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border/50 bg-card"
          >
            <span className="text-sm font-medium w-40 shrink-0">{formatModule(row.module)}</span>
            <div className="flex items-center gap-2 flex-1">
              {(['canView', 'canAdd', 'canEdit', 'canDelete'] as const).map(key => (
                <span key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tick checked={row[key] as boolean} />
                  {key.replace('can', '')}
                </span>
              ))}
            </div>
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', SCOPE_STYLES[row.scope].badge)}
            >
              {row.scope}
            </Badge>
          </div>
        ))}
        {inactiveModules.length > 0 && (
          <div className="pt-2">
            <p className="text-[11px] text-muted-foreground mb-1.5 px-1">No access</p>
            <div className="flex flex-wrap gap-1.5">
              {inactiveModules.map(m => (
                <Badge
                  key={m}
                  variant="outline"
                  className="text-[10px] text-muted-foreground/60 border-muted"
                >
                  {formatModule(m)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className="grid grid-cols-[200px_48px_repeat(4,_56px)_120px] gap-2 px-3 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Module
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">
          On
        </span>
        {['View', 'Add', 'Edit', 'Delete'].map(l => (
          <span
            key={l}
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center"
          >
            {l}
          </span>
        ))}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Scope
        </span>
      </div>

      {/* Rows */}
      {modules.map(module => {
        const row = getRow(rows, module);
        const active = hasAnyPermission(row);

        return (
          <div
            key={module}
            className={cn(
              'grid grid-cols-[200px_48px_repeat(4,_56px)_120px] gap-2 items-center px-3 py-2.5 rounded-lg border transition-all',
              active ? 'border-border bg-card shadow-sm' : 'border-border/40 bg-muted/20'
            )}
          >
            <div>
              <p className={cn('text-sm font-medium', !active && 'text-muted-foreground')}>
                {formatModule(module)}
              </p>
            </div>

            {/* Master toggle */}
            <div className="flex justify-center">
              <Switch
                checked={active}
                onCheckedChange={v => handleModuleToggle(module, v)}
                className="scale-75"
              />
            </div>

            {/* canView */}
            <div className="flex justify-center">
              <Checkbox
                checked={row.canView}
                disabled={!active}
                onCheckedChange={c => handleViewChange(module, !!c)}
                className={cn(!active && 'opacity-30')}
              />
            </div>

            {/* canAdd, canEdit, canDelete */}
            {(['canAdd', 'canEdit', 'canDelete'] as const).map(key => (
              <div key={key} className="flex justify-center">
                <Checkbox
                  checked={row[key] as boolean}
                  disabled={!row.canView}
                  onCheckedChange={c => handleActionChange(module, key, !!c)}
                  className={cn(!row.canView && 'opacity-30')}
                />
              </div>
            ))}

            {/* Scope */}
            <div>
              <Select
                value={row.scope}
                disabled={!active}
                onValueChange={v => updateRow(module, { scope: v as PermissionScope })}
              >
                <SelectTrigger className={cn('h-7 w-full text-xs', !active && 'opacity-40')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      <div>
                        <span>{o.label}</span>
                        <span className="ml-1.5 text-muted-foreground text-[10px]">
                          — {SCOPE_STYLES[o.value as PermissionScope].desc}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
