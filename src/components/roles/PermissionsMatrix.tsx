'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  type PermissionRowPayload,
  type PermissionScope,
  SCOPE_OPTIONS,
  formatModule,
} from '@/types/role.types';

// ─────────────────────────────────────────
// PERMISSIONS MATRIX
//
// Renders a table of modules × canView/canAdd/canEdit/canDelete/scope.
// readOnly = true → detail page (no inputs)
// readOnly = false → create/edit page (interactive)
// ─────────────────────────────────────────

interface Props {
  modules: string[]; // all available modules from DB
  rows: PermissionRowPayload[]; // current permission state
  readOnly?: boolean;
  onChange?: (rows: PermissionRowPayload[]) => void;
}

const ACTIONS: { key: keyof PermissionRowPayload; label: string }[] = [
  { key: 'canView', label: 'View' },
  { key: 'canAdd', label: 'Add' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
];

export function PermissionsMatrix({ modules, rows, readOnly = false, onChange }: Props) {
  // Get the permission row for a module, or return a blank default
  function getRow(module: string): PermissionRowPayload {
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

  function updateRow(module: string, patch: Partial<PermissionRowPayload>) {
    if (!onChange) return;
    const existing = rows.find(r => r.module === module);

    if (existing) {
      onChange(rows.map(r => (r.module === module ? { ...r, ...patch } : r)));
    } else {
      // First time this module gets touched — add it
      onChange([...rows, { ...getRow(module), ...patch }]);
    }
  }

  // When canView is unchecked — also uncheck everything else
  function handleViewChange(module: string, checked: boolean) {
    if (!checked) {
      updateRow(module, {
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      });
    } else {
      updateRow(module, { canView: true });
    }
  }

  // canAdd/canEdit/canDelete require canView
  function handleActionChange(
    module: string,
    key: 'canAdd' | 'canEdit' | 'canDelete',
    checked: boolean
  ) {
    const row = getRow(module);
    const patch: Partial<PermissionRowPayload> = { [key]: checked };
    // Auto-enable canView if any action is enabled
    if (checked && !row.canView) patch.canView = true;
    updateRow(module, patch);
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-[180px]">
              Module
            </th>
            {ACTIONS.map(a => (
              <th
                key={a.key}
                className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground w-[72px]"
              >
                {a.label}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-[120px]">
              Scope
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {modules.map(module => {
            const row = getRow(module);

            return (
              <tr
                key={module}
                className={`transition-colors ${row.canView ? 'bg-background' : 'bg-muted/20'}`}
              >
                {/* Module name */}
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{formatModule(module)}</span>
                </td>

                {/* canView */}
                <td className="px-3 py-3 text-center">
                  {readOnly ? (
                    <ReadOnlyCheck checked={row.canView} />
                  ) : (
                    <Checkbox
                      checked={row.canView}
                      onCheckedChange={c => handleViewChange(module, !!c)}
                      className="mx-auto"
                    />
                  )}
                </td>

                {/* canAdd, canEdit, canDelete */}
                {(['canAdd', 'canEdit', 'canDelete'] as const).map(key => (
                  <td key={key} className="px-3 py-3 text-center">
                    {readOnly ? (
                      <ReadOnlyCheck checked={row[key] as boolean} />
                    ) : (
                      <Checkbox
                        checked={row[key] as boolean}
                        disabled={!row.canView} // can't set actions without view
                        onCheckedChange={c => handleActionChange(module, key, !!c)}
                        className="mx-auto"
                      />
                    )}
                  </td>
                ))}

                {/* Scope */}
                <td className="px-4 py-3">
                  {readOnly ? (
                    <ScopeBadge scope={row.scope} />
                  ) : (
                    <Select
                      value={row.scope}
                      disabled={!row.canView}
                      onValueChange={v => updateRow(module, { scope: v as PermissionScope })}
                    >
                      <SelectTrigger className="h-7 w-[100px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCOPE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Read-only check mark ──────────────────────────────────────────────────────

function ReadOnlyCheck({ checked }: { checked: boolean }) {
  return checked ? (
    <span className="inline-flex items-center justify-center text-emerald-600 dark:text-emerald-400">
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8.5L6.5 12L13 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ) : (
    <span className="inline-block w-4 h-4 rounded border border-border/50 bg-muted/30" />
  );
}

// ── Scope badge ───────────────────────────────────────────────────────────────

const SCOPE_BADGE_STYLES: Record<PermissionScope, string> = {
  OWN: 'border-gray-200   bg-gray-50   text-gray-600   dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
  TEAM: 'border-blue-200   bg-blue-50   text-blue-700   dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400',
  MANAGER:
    'border-amber-200  bg-amber-50  text-amber-700  dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400',
  BU: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400',
  ALL: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400',
};

function ScopeBadge({ scope }: { scope: PermissionScope }) {
  return (
    <Badge variant="outline" className={`text-[10px] ${SCOPE_BADGE_STYLES[scope]}`}>
      {scope}
    </Badge>
  );
}
