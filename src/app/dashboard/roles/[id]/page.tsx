'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useRolesApi } from '@/lib/roles.api';

// ── Constants ─────────────────────────────────────────────────────────────────

const MODULES = [
  'USERS',
  'ROLES',
  'TEAMS',
  'BUSINESS_UNITS',
  'CLIENTS',
  'REQUIREMENTS',
  'CANDIDATES',
  'PIPELINE',
  'INTERVIEWS',
  'OFFERS',
  'REPORTS',
] as const;

const SCOPES = ['OWN', 'TEAM', 'BU', 'ALL'] as const;
type Scope = (typeof SCOPES)[number];

const SCOPE_LABELS: Record<Scope, string> = {
  OWN: 'Own',
  TEAM: 'Team',
  BU: 'Business Unit',
  ALL: 'All',
};

const ACTIONS = [
  { key: 'canView', label: 'View' },
  { key: 'canAdd', label: 'Add' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type PermissionRow = {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope: Scope;
};

type Role = {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions?: PermissionRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultRow = (module: string): PermissionRow => ({
  module,
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
  scope: 'OWN',
});

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RolePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [dirty, setDirty] = useState(false);
  const rolesApi = useRolesApi();

  // ── Fetch ───────────────────────────────────────────────────────────────
  const {
    data: role,
    isLoading,
    isError,
  } = useQuery<Role | null>({
    queryKey: ['role', id],
    queryFn: async () => {
      const res = await rolesApi.getOne(id);
      return res.data?.data ?? null;
    },
    enabled: !!id,
  });
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const computedRows: PermissionRow[] = (() => {
    if (!role) return [];

    const map: Record<string, PermissionRow> = {};
    (role.permissions ?? []).forEach(p => {
      map[p.module] = p;
    });

    return MODULES.map(mod => map[mod] ?? defaultRow(mod));
  })();

  // Hydrate matrix from fetched permissions
  const [initializedRoleId, setInitializedRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (!role || role.id === initializedRoleId) return;
    const map: Record<string, PermissionRow> = {};
    (role.permissions ?? []).forEach(p => {
      map[p.module] = p;
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(MODULES.map(mod => map[mod] ?? defaultRow(mod)));
    setDirty(false);
    setInitializedRoleId(role.id);
  }, [role, initializedRoleId]);

  const displayRows = dirty ? rows : computedRows;
  // ── Save ────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      rolesApi.setPermissions(
        id,
        displayRows.map(r => ({
          module: r.module.toLowerCase(),
          canView: r.canView,
          canAdd: r.canAdd,
          canEdit: r.canEdit,
          canDelete: r.canDelete,
          scope: r.scope,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDirty(false);
    },
  });

  // ── Row helpers ─────────────────────────────────────────────────────────
  const updateRow = (module: string, patch: Partial<PermissionRow>) => {
    setRows(prev => {
      const base = prev.length ? prev : computedRows;

      return base.map(r => {
        if (r.module !== module) return r;

        const next = { ...r, ...patch };

        if (patch.canView === false) {
          next.canAdd = false;
          next.canEdit = false;
          next.canDelete = false;
        }

        if (patch.canAdd || patch.canEdit || patch.canDelete) {
          next.canView = true;
        }

        return next;
      });
    });

    setDirty(true);
  };

  const toggleColumn = (field: 'canView' | 'canAdd' | 'canEdit' | 'canDelete', value: boolean) => {
    setRows(prev =>
      prev.map(r => {
        const next = { ...r, [field]: value };
        if (field === 'canView' && !value) {
          next.canAdd = false;
          next.canEdit = false;
          next.canDelete = false;
        }
        if ((field === 'canAdd' || field === 'canEdit' || field === 'canDelete') && value) {
          next.canView = true;
        }
        return next;
      })
    );
    setDirty(true);
  };

  const allChecked = (field: 'canView' | 'canAdd' | 'canEdit' | 'canDelete') =>
    rows.length > 0 && rows.every(r => r[field]);

  // ── Loading / error ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading role…</span>
      </div>
    );
  }

  if (isError || !role) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-3">
        <p className="text-sm text-destructive">Role not found.</p>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/roles">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Roles
          </Link>
        </Button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" asChild>
          <Link href="/dashboard/roles">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Roles
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{role.name}</h1>
              {role.isSystem ? (
                <Badge variant="secondary">System</Badge>
              ) : (
                <Badge variant="outline">Custom</Badge>
              )}
            </div>
            {role.description && (
              <p className="text-sm text-muted-foreground">{role.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Permissions card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-base">Module Permissions</CardTitle>
              <CardDescription className="text-xs">
                Add, Edit and Delete require View. Scope controls data visibility for each module.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {dirty && <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>}
              <Button
                size="sm"
                disabled={!dirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>

          {saveMutation.isError && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mt-2">
              Failed to save permissions. Please try again.
            </p>
          )}
          {saveMutation.isSuccess && !dirty && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-md px-3 py-2 mt-2">
              Permissions saved successfully.
            </p>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-44">Module</TableHead>

                  {/* Action columns with select-all checkbox in header */}
                  {ACTIONS.map(({ key, label }) => (
                    <TableHead key={key} className="text-center w-24">
                      <div className="flex flex-col items-center gap-2">
                        <span>{label}</span>
                        <Checkbox
                          checked={allChecked(key)}
                          onCheckedChange={v => toggleColumn(key, !!v)}
                          aria-label={`Toggle all ${label}`}
                        />
                      </div>
                    </TableHead>
                  ))}

                  <TableHead className="w-40 pr-6">Scope</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {displayRows.map(row => (
                  <TableRow key={row.module}>
                    {/* Module label */}
                    <TableCell className="pl-6 font-medium text-sm">
                      {row.module.replace(/_/g, ' ')}
                    </TableCell>

                    {/* Action checkboxes */}
                    {ACTIONS.map(({ key }) => (
                      <TableCell key={key} className="text-center">
                        <Checkbox
                          checked={row[key]}
                          disabled={key !== 'canView' && !row.canView}
                          onCheckedChange={v => updateRow(row.module, { [key]: !!v })}
                        />
                      </TableCell>
                    ))}

                    {/* Scope dropdown — disabled when no view access */}
                    <TableCell className="pr-6">
                      <Select
                        value={row.scope}
                        onValueChange={v => updateRow(row.module, { scope: v as Scope })}
                        disabled={!row.canView}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCOPES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {SCOPE_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
