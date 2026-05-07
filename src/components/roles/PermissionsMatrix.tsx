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
  EMPTY_PERMISSION,
} from '@/components/roles/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  modules: string[];
  rows: PermissionRowPayload[];
  readOnly?: boolean;
  onChange?: (rows: PermissionRowPayload[]) => void;
}

type ActionKey = 'canView' | 'canAdd' | 'canEdit' | 'canDelete';
type ScopeKey = 'canViewScope' | 'canAddScope' | 'canEditScope' | 'canDeleteScope';

const ACTION_TO_SCOPE: Record<ActionKey, ScopeKey> = {
  canView: 'canViewScope',
  canAdd: 'canAddScope',
  canEdit: 'canEditScope',
  canDelete: 'canDeleteScope',
};

const ACTIONS: { key: ActionKey; label: string }[] = [
  { key: 'canView', label: 'View' },
  { key: 'canAdd', label: 'Add' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Scope badge colours
// ─────────────────────────────────────────────────────────────────────────────

const SCOPE_BADGE: Record<PermissionScope, string> = {
  OWN: 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
  DEPARTMENT:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400',
  BU: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400',
  ALL: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRow(rows: PermissionRowPayload[], module: string): PermissionRowPayload {
  return rows.find(r => r.module === module) ?? EMPTY_PERMISSION(module);
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
      <svg className="h-3 w-3 text-muted-foreground/30" viewBox="0 0 12 12" fill="none">
        <path d="M3 9L9 3M3 3l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Read-only row
// ─────────────────────────────────────────────────────────────────────────────

function ReadOnlyRow({ row }: { row: PermissionRowPayload }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border/50 bg-card w-full">
      <span className="text-sm font-medium w-36 shrink-0">{formatModule(row.module)}</span>
      <div className="flex items-center gap-4 flex-1 flex-wrap">
        {ACTIONS.map(({ key, label }) => {
          const scopeKey = ACTION_TO_SCOPE[key];
          const enabled = row[key] as boolean;
          return (
            <span
              key={key}
              className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-[80px]"
            >
              <Tick checked={enabled} />
              <span>{label}</span>
              {enabled && (
                <Badge
                  variant="outline"
                  className={cn('text-[9px] px-1 py-0', SCOPE_BADGE[row[scopeKey]])}
                >
                  {row[scopeKey]}
                </Badge>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action cell — checkbox + scope select side by side
// ─────────────────────────────────────────────────────────────────────────────

interface ActionCellProps {
  actionKey: ActionKey;
  row: PermissionRowPayload;
  onActionChange: (key: ActionKey, checked: boolean) => void;
  onScopeChange: (scopeKey: ScopeKey, value: PermissionScope) => void;
}

function ActionCell({ actionKey, row, onActionChange, onScopeChange }: ActionCellProps) {
  const scopeKey = ACTION_TO_SCOPE[actionKey];
  const enabled = row[actionKey] as boolean;
  const disabled = actionKey === 'canView' ? !hasAnyPermission(row) && !row.canView : !row.canView;

  return (
    <div className="flex items-center gap-2 w-full">
      <Checkbox
        checked={enabled}
        disabled={disabled}
        onCheckedChange={c => onActionChange(actionKey, !!c)}
        className={cn('shrink-0', disabled && 'opacity-30')}
      />
      <Select
        value={row[scopeKey]}
        disabled={!enabled}
        onValueChange={v => onScopeChange(scopeKey, v as PermissionScope)}
      >
        <SelectTrigger
          className={cn('h-7 text-xs flex-1 min-w-0', !enabled && 'opacity-30 pointer-events-none')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCOPE_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              <span className="font-medium">{o.label}</span>
              <span className="ml-1.5 text-muted-foreground">— {o.desc}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
      onChange([...rows, { ...EMPTY_PERMISSION(module), ...patch }]);
    }
  }

  function handleModuleToggle(module: string, enabled: boolean) {
    if (enabled) {
      updateRow(module, { canView: true });
    } else {
      updateRow(module, { canView: false, canAdd: false, canEdit: false, canDelete: false });
    }
  }

  function handleActionChange(module: string, key: ActionKey, checked: boolean) {
    const row = getRow(rows, module);
    const patch: Partial<PermissionRowPayload> = { [key]: checked };
    if (key === 'canView' && !checked) {
      patch.canAdd = false;
      patch.canEdit = false;
      patch.canDelete = false;
    }
    if (key !== 'canView' && checked && !row.canView) {
      patch.canView = true;
    }
    updateRow(module, patch);
  }

  function handleScopeChange(module: string, scopeKey: ScopeKey, value: PermissionScope) {
    updateRow(module, { [scopeKey]: value });
  }

  // ── Empty ───────────────────────────────────────────────────────────────

  if (!modules.length) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        No modules available
      </div>
    );
  }

  // ── Read-only ───────────────────────────────────────────────────────────

  if (readOnly) {
    const activeRows = modules.map(m => getRow(rows, m)).filter(hasAnyPermission);
    const inactiveModules = modules.filter(m => !hasAnyPermission(getRow(rows, m)));

    return (
      <div className="space-y-1.5 w-full">
        {activeRows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No permissions granted</p>
        )}
        {activeRows.map(row => (
          <ReadOnlyRow key={row.module} row={row} />
        ))}
        {inactiveModules.length > 0 && (
          <div className="pt-3">
            <p className="text-[11px] text-muted-foreground mb-2 px-1">No access</p>
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

  // ── Edit ─────────────────────────────────────────────────────────────────
  // Full-width table layout using CSS grid: [module] [toggle] [view] [add] [edit] [delete]
  // Each action column = checkbox + scope select side-by-side, no truncation

  return (
    <div className="w-full space-y-1.5">
      {/* Header row */}
      <div
        className="grid w-full gap-3 px-4 pb-2"
        style={{ gridTemplateColumns: '160px 52px repeat(4, 1fr)' }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Module
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">
          On
        </span>
        {ACTIONS.map(({ label }) => (
          <span
            key={label}
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Module rows */}
      {modules.map(module => {
        const row = getRow(rows, module);
        const active = hasAnyPermission(row);

        return (
          <div
            key={module}
            className={cn(
              'grid w-full gap-3 items-center px-4 py-3 rounded-lg border transition-colors',
              active ? 'border-border bg-card shadow-sm' : 'border-border/40 bg-muted/20'
            )}
            style={{ gridTemplateColumns: '160px 52px repeat(4, 1fr)' }}
          >
            {/* Module name */}
            <p className={cn('text-sm font-medium truncate', !active && 'text-muted-foreground')}>
              {formatModule(module)}
            </p>

            {/* Master toggle */}
            <div className="flex justify-center">
              <Switch checked={active} onCheckedChange={v => handleModuleToggle(module, v)} />
            </div>

            {/* Action columns */}
            {ACTIONS.map(({ key }) => (
              <ActionCell
                key={key}
                actionKey={key}
                row={row}
                onActionChange={(k, c) => handleActionChange(module, k, c)}
                onScopeChange={(sk, v) => handleScopeChange(module, sk, v)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
