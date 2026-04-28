/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Building2,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Users,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import type { BUListResponse } from '@/types/bu.types';

type BUListItem = any;

function BUTreeRow({
  node,
  depth,
  permission,
  onView,
  onEdit,
  onDelete,
}: {
  node: BUListItem;
  depth: number;
  permission: { canEdit: boolean; canDelete: boolean };
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (node: BUListItem) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  // API returns full arrays — use .length for counts
  const hasChildren = (node.childBUs ?? []).length > 0;
  const usersCount = (node.users ?? []).length;
  const teamsCount = (node.teams ?? []).length;
  const clientsCount = (node.clients ?? []).length;
  const reqCount = (node.requirements ?? []).length;

  return (
    <>
      <tr className="border-b hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            style={{ paddingLeft: depth * 20 }}
            onClick={() => onView(node.id)}
          >
            {hasChildren ? (
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={e => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{node.name}</span>
          </div>
        </td>

        <td className="px-4 py-3">
          <Badge
            variant="outline"
            className={
              node.isActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                : 'border-red-200 bg-red-50 text-red-700'
            }
          >
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="tabular-nums">{usersCount}</span>
            </span>
            <span className="flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" />
              <span className="tabular-nums">{teamsCount}</span>
            </span>
          </div>
        </td>

        <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
          {reqCount} req · {clientsCount} client{clientsCount !== 1 ? 's' : ''}
        </td>

        <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
          {hasChildren
            ? `${node.childBUs.length} child BU${node.childBUs.length !== 1 ? 's' : ''}`
            : '—'}
        </td>

        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onView(node.id)}>
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              {permission.canEdit && (
                <DropdownMenuItem onClick={() => onEdit(node.id)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {permission.canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(node)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {expanded &&
        hasChildren &&
        // @ts-expect-error err

        node.childBUs.map(child => (
          <BUTreeRow
            key={child.id}
            node={child as BUListItem}
            depth={depth + 1}
            permission={permission}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

export default function BusinessUnitsPage() {
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('business_units');

  const [deleteTarget, setDeleteTarget] = useState<BUListItem | null>(null);

  const buQuery = useQuery<BUListResponse>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await axios.get<BUListResponse>('/business-units');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/business-units/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      setDeleteTarget(null);
    },
  });

  const rootBUs = buQuery.data?.data ?? [];
  // @ts-expect-error err
  const total = rootBUs?.reduce((acc, bu) => acc + 1 + (bu?.childBUs?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">Business Units</h1>
            <p className="mt-1 text-sm text-muted-foreground">{total} total</p>
          </div>
        </div>
        {permission.canAdd && (
          <Button size="sm" onClick={() => router.push('/business-units/create')}>
            <Plus className="mr-2 h-4 w-4" /> Create BU
          </Button>
        )}
      </div>

      {buQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {buQuery.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load business units.
        </div>
      )}

      {!buQuery.isLoading && !buQuery.isError && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Users · Teams
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Activity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Children
                </th>
                <th className="px-4 py-3 w-[48px]" />
              </tr>
            </thead>
            <tbody>
              {rootBUs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No business units found.
                  </td>
                </tr>
              )}
              {rootBUs.map(node => (
                <BUTreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  permission={permission}
                  onView={id => router.push(`/business-units/${id}`)}
                  onEdit={id => router.push(`/business-units/${id}/edit`)}
                  onDelete={setDeleteTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
