// File: PermissionGrid.tsx
// Path: src/features/admin/PermissionGrid.tsx
//
// The permission editor: one section per MODULES entry, one row per action.
// Value is a map of granted permission keys → scope. Unscoped actions carry
// 'ALL' internally (the backend ignores scope for them).

'use client';

import { Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MODULES, PERMISSION_SCOPES, SCOPE_LABELS, type PermissionScope } from '@/config/permissions';
import { cn } from '@/lib/utils';

export type GrantMap = Record<string, PermissionScope>;

interface ActionDef {
  label: string;
  scoped: boolean;
}

export const MODULE_LIST = Object.entries(MODULES)
  .map(([key, m]) => ({
    key,
    label: m.label,
    order: m.order,
    actions: Object.entries(m.actions as Record<string, ActionDef>).map(([action, def]) => ({
      key: `${key}.${action}`,
      action,
      ...def,
    })),
  }))
  .sort((a, b) => a.order - b.order);

const SCOPED = new Set(MODULE_LIST.flatMap(m => m.actions.filter(a => a.scoped).map(a => a.key)));
const KNOWN = new Set(MODULE_LIST.flatMap(m => m.actions.map(a => a.key)));

/** Default scope for a freshly ticked scoped action — least privilege. */
export const DEFAULT_SCOPE: PermissionScope = 'OWN';

/** Server grants → map (unknown keys dropped, unscoped normalised to ALL). */
export function grantsToMap(grants: { permissionKey: string; scope: PermissionScope }[]): GrantMap {
  const out: GrantMap = {};
  for (const g of grants) {
    if (!KNOWN.has(g.permissionKey)) continue;
    out[g.permissionKey] = SCOPED.has(g.permissionKey) ? g.scope : 'ALL';
  }
  return out;
}

export const mapToGrants = (map: GrantMap) =>
  Object.entries(map).map(([permissionKey, scope]) =>
    SCOPED.has(permissionKey) ? { permissionKey, scope } : { permissionKey }
  );

/** Number of rows that differ between two maps. */
export function diffCount(a: GrantMap, b: GrantMap) {
  let n = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) n++;
  return n;
}

export function PermissionGrid({
  value,
  onChange,
  readOnly,
  scopeDescriptions = {},
  baseline,
}: {
  value: GrantMap;
  onChange: (next: GrantMap) => void;
  readOnly?: boolean;
  scopeDescriptions?: Partial<Record<PermissionScope, string>>;
  /** saved state — changed rows get a subtle marker */
  baseline?: GrantMap;
}) {
  const set = (key: string, scope: PermissionScope | null) => {
    const next = { ...value };
    if (scope) next[key] = scope;
    else delete next[key];
    onChange(next);
  };

  const setModule = (keys: { key: string; scoped: boolean }[], grant: boolean) => {
    const next = { ...value };
    for (const a of keys) {
      if (!grant) delete next[a.key];
      else next[a.key] ??= a.scoped ? DEFAULT_SCOPE : 'ALL';
    }
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {MODULE_LIST.map(m => {
        const granted = m.actions.filter(a => value[a.key]).length;
        return (
          <section key={m.key} className="overflow-hidden rounded-xl border bg-card shadow-card" aria-labelledby={`perm-${m.key}`}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-surface px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h3 id={`perm-${m.key}`} className="text-sm font-semibold">
                  {m.label}
                </h3>
                <span className="tabular text-xs text-muted-foreground">
                  {granted} of {m.actions.length}
                </span>
              </div>
              {!readOnly && (
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10 disabled:opacity-40"
                    disabled={granted === m.actions.length}
                    onClick={() => setModule(m.actions, true)}
                  >
                    Grant all
                  </button>
                  <span className="text-border">|</span>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    disabled={granted === 0}
                    onClick={() => setModule(m.actions, false)}
                  >
                    Clear
                  </button>
                </div>
              )}
            </header>
            <ul className="divide-y divide-border/70">
              {m.actions.map(a => {
                const scope = value[a.key];
                const on = !!scope;
                const changed = baseline && baseline[a.key] !== scope;
                const id = `perm-${a.key}`;
                return (
                  <li
                    key={a.key}
                    className={cn(
                      'relative flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2',
                      changed && 'bg-primary/4'
                    )}
                  >
                    {changed && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />}
                    <label htmlFor={id} className={cn('flex min-w-0 items-center gap-3', !readOnly && 'cursor-pointer')}>
                      {readOnly ? (
                        <span
                          className={cn(
                            'flex size-4 items-center justify-center rounded-[4px] border',
                            on ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                          )}
                          aria-label={on ? 'Granted' : 'Not granted'}
                        >
                          {on && <Check className="size-3" />}
                        </span>
                      ) : (
                        <Checkbox
                          id={id}
                          checked={on}
                          onCheckedChange={v => set(a.key, v ? (a.scoped ? DEFAULT_SCOPE : 'ALL') : null)}
                        />
                      )}
                      <span className="min-w-0">
                        <span className={cn('block text-[13px] font-medium', !on && 'text-foreground/80')}>
                          {a.label}
                        </span>
                        <span className="block font-mono text-[11px] text-muted-foreground">{a.key}</span>
                      </span>
                    </label>
                    {a.scoped ? (
                      <Select
                        value={on ? scope : undefined}
                        onValueChange={v => set(a.key, v as PermissionScope)}
                        disabled={readOnly || !on}
                      >
                        <SelectTrigger size="sm" className="w-44" aria-label={`Scope for ${m.label}: ${a.label}`}>
                          {/* explicit children so the trigger shows the label, not the description */}
                          <SelectValue placeholder="Not granted">{on ? SCOPE_LABELS[scope] : undefined}</SelectValue>
                        </SelectTrigger>
                        <SelectContent align="end" position="popper" className="w-72">
                          {PERMISSION_SCOPES.map(s => (
                            <SelectItem key={s} value={s}>
                              <span className="flex flex-col">
                                <span>{SCOPE_LABELS[s]}</span>
                                {scopeDescriptions[s] && (
                                  <span className="text-xs text-muted-foreground">{scopeDescriptions[s]}</span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="w-44 text-right text-xs text-muted-foreground">
                        {on ? 'Granted' : 'Not granted'} · no scope
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
