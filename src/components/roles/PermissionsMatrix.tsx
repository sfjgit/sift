// File: PermissionsMatrix.tsx
// Path: src/components/roles/PermissionsMatrix.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type PermissionRowPayload,
  type PermissionScope,
  type ScopeOption,
  EMPTY_PERMISSION,
  formatModule,
} from '@/types/role.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  modules: string[];
  rows: PermissionRowPayload[];
  scopeOptions: ScopeOption[];
  scopeOptionsLoading?: boolean;
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
// Module icons — Lucide icon names matched to each module
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_META: Record<string, { icon: string; color: string }> = {
  requirements: {
    icon: 'FileText',
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  assignments: {
    icon: 'Users',
    color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  },
  clients: {
    icon: 'Building2',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  candidates: {
    icon: 'UserSearch',
    color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  },
  users: {
    icon: 'User',
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
  roles: { icon: 'Shield', color: 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
  'business-units': {
    icon: 'Network',
    color: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
  departments: {
    icon: 'Briefcase',
    color: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  'service-lines': {
    icon: 'Layers',
    color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  },
  'pipeline-stages': {
    icon: 'GitBranch',
    color: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  'audit-logs': {
    icon: 'ListChecks',
    color: 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
  },
  reports: {
    icon: 'BarChart2',
    color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  },
  settings: {
    icon: 'Settings',
    color: 'bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Scope pill colors — compact pill, each scope has a distinct color
// ─────────────────────────────────────────────────────────────────────────────

const SCOPE_PILL_CLS: Record<string, string> = {
  OWN: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  TEAM: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  REPORTING:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  REPORTING_LINE:
    'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800',
  DEPARTMENT:
    'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
  BU: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  ALL: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
};

function scopePillCls(scope: string) {
  return SCOPE_PILL_CLS[scope] ?? 'bg-muted text-muted-foreground border-border';
}

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
// Scope pill with dropdown — compact pill, opens inline popover on click
// No truncation issues — the pill shows just the scope name (short), the
// full description appears in the dropdown option only
// ─────────────────────────────────────────────────────────────────────────────

function ScopePill({
  value,
  disabled,
  scopeOptions,
  onChange,
}: {
  value: PermissionScope;
  disabled: boolean;
  scopeOptions: ScopeOption[];
  onChange: (v: PermissionScope) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentScope = scopeOptions?.find(s => s.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(p => !p)}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide transition-all',
          scopePillCls(value),
          disabled
            ? 'opacity-25 cursor-default pointer-events-none'
            : 'cursor-pointer hover:opacity-80'
        )}
      >
        {/* Show abbreviated label — no long text in the pill */}
        {value.replace('_', ' ')}
        {!disabled && (
          <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 4l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-56 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          {scopeOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors',
                opt.value === value && 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-semibold',
                  scopePillCls(opt.value)
                )}
              >
                {opt.value.replace('_', ' ')}
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkbox
// ─────────────────────────────────────────────────────────────────────────────

function Cb({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
        checked ? 'bg-primary border-primary' : 'bg-background border-border',
        disabled && 'opacity-25 cursor-default'
      )}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
          <path
            d="M1.5 5.5L3.5 7.5L8.5 2.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle switch
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex w-9 h-5 rounded-full border-2 border-transparent transition-colors shrink-0',
        checked ? 'bg-primary' : 'bg-muted-foreground/20'
      )}
    >
      <span
        className={cn(
          'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Read-only tick
// ─────────────────────────────────────────────────────────────────────────────

function Tick({ checked }: { checked: boolean }) {
  if (checked)
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
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
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border bg-card">
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
                <span
                  className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-semibold',
                    scopePillCls(row[scopeKey])
                  )}
                >
                  {row[scopeKey]}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function PermissionsMatrix({
  modules,
  rows,
  scopeOptions,
  scopeOptionsLoading = false,
  readOnly = false,
  onChange,
}: Props) {
  function updateRow(module: string, patch: Partial<PermissionRowPayload>) {
    if (!onChange) return;
    const existing = rows.find(r => r.module === module);
    if (existing) {
      onChange(rows.map(r => (r.module === module ? { ...r, ...patch } : r)));
    } else {
      onChange([...rows, { ...EMPTY_PERMISSION(module), ...patch }]);
    }
  }

  function handleToggle(module: string, enabled: boolean) {
    if (enabled) {
      updateRow(module, { canView: true });
    } else {
      updateRow(module, { canView: false, canAdd: false, canEdit: false, canDelete: false });
    }
  }

  function handleAction(module: string, key: ActionKey, checked: boolean) {
    const row = getRow(rows, module);
    const patch: Partial<PermissionRowPayload> = { [key]: checked };
    if (key === 'canView' && !checked) {
      patch.canAdd = false;
      patch.canEdit = false;
      patch.canDelete = false;
    }
    if (key !== 'canView' && checked && !row.canView) patch.canView = true;
    updateRow(module, patch);
  }

  function handleScope(module: string, scopeKey: ScopeKey, value: PermissionScope) {
    updateRow(module, { [scopeKey]: value });
  }

  if (!modules.length)
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        No modules available
      </div>
    );

  if (scopeOptionsLoading)
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );

  // ── Read-only ──────────────────────────────────────────────────────────────
  if (readOnly) {
    const activeRows = modules.map(m => getRow(rows, m)).filter(hasAnyPermission);
    const inactiveModules = modules.filter(m => !hasAnyPermission(getRow(rows, m)));
    return (
      <div className="space-y-1.5">
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

  // ── Edit ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-1.5">
      {/* Header */}
      <div
        className="grid gap-3 px-4 pb-2 border-b"
        style={{ gridTemplateColumns: '180px 56px repeat(4, 1fr)' }}
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

      {/* Rows */}
      {modules.map(module => {
        const row = getRow(rows, module);
        const active = hasAnyPermission(row);
        const meta = MODULE_META[module];

        return (
          <div
            key={module}
            className={cn(
              'grid gap-3 items-center px-4 py-3 rounded-xl border transition-all',
              active ? 'border-border bg-card shadow-sm' : 'border-border/40 bg-muted/20'
            )}
            style={{ gridTemplateColumns: '180px 56px repeat(4, 1fr)' }}
          >
            {/* Module name + icon */}
            <div className={cn('flex items-center gap-2.5 min-w-0', !active && 'opacity-50')}>
              {meta && (
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0',
                    meta.color
                  )}
                >
                  <span className="text-[13px]">
                    {/* icon placeholder — swap with your actual icon component */}
                    {module[0].toUpperCase()}
                  </span>
                </div>
              )}
              <p
                className={cn(
                  'text-sm font-medium truncate',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {formatModule(module)}
              </p>
            </div>

            {/* Master toggle */}
            <div className="flex justify-center">
              <Toggle checked={active} onChange={v => handleToggle(module, v)} />
            </div>

            {/* Action cells — checkbox + scope pill */}
            {ACTIONS.map(({ key }) => {
              const scopeKey = ACTION_TO_SCOPE[key];
              const checked = row[key] as boolean;
              const disabled = key === 'canView' ? false : !row.canView;
              return (
                <div key={key} className="flex items-center gap-2 min-w-0">
                  <Cb
                    checked={checked}
                    disabled={disabled}
                    onChange={c => handleAction(module, key, c)}
                  />
                  <ScopePill
                    value={row[scopeKey]}
                    disabled={!checked}
                    scopeOptions={scopeOptions}
                    onChange={v => handleScope(module, scopeKey, v)}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
