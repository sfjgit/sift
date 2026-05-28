/* eslint-disable react/no-unescaped-entities */
// File: page.tsx
// Path: src/app/business-units/page.tsx

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
  Briefcase,
  Search,
  CornerDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';

// ─── Types — matching listBusinessUnits controller response ───────────────────
// controller returns: { data: tree[], flat: flat[] }
// Each tree node: id, name, code, isActive, parentBUId, ancestorIds, createdAt,
//                _count.clients, children[]
// Each flat item: same fields, no children

interface BUNode {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  parentBUId: string | null;
  ancestorIds: string[];
  createdAt: string;
  _count: { clients: number };
  children: BUNode[]; // tree response has children
}

interface BUListResponse {
  success: boolean;
  data: BUNode[]; // tree
  flat: Omit<BUNode, 'children'>[]; // flat
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2 w-2',
          active ? 'bg-emerald-400' : 'bg-zinc-600'
        )}
      />
    </span>
  );
}

// ─── BU Row ───────────────────────────────────────────────────────────────────

function BURow({
  node,
  depth,
  parentName,
  permission,
  onView,
  onEdit,
  onDelete,
  searchActive,
}: {
  node: BUNode;
  depth: number;
  parentName: string | null;
  permission: { canEdit: boolean; canDelete: boolean };
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (node: BUNode) => void;
  searchActive: boolean;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  // depth > 0 means it's a child — show parent tag
  const isChild = depth > 0;

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer',
          'hover:bg-muted/20 border-b border-border/40 last:border-0',
          depth > 0 && 'bg-muted/5'
        )}
        style={{ paddingLeft: depth > 0 ? `${16 + depth * 28}px` : '16px' }}
        onClick={() => onView(node.id)}
      >
        {/* Depth connector line */}
        {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 text-border shrink-0 -ml-1" />}

        {/* Expand toggle */}
        {hasChildren && !searchActive ? (
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
            onClick={e => {
              e.stopPropagation();
              setExpanded(v => !v);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          !searchActive && <span className="w-4 shrink-0" />
        )}

        {/* Icon */}
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl shrink-0 border',
            depth === 0 ? 'bg-primary/10 border-primary/20' : 'bg-muted/60 border-border/50'
          )}
        >
          <Building2
            className={cn('h-4 w-4', depth === 0 ? 'text-primary' : 'text-muted-foreground')}
          />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
              {node.name}
            </span>
            {node.code && (
              <code className="text-[10px] font-mono text-muted-foreground bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded-md shrink-0">
                {node.code}
              </code>
            )}
            {/* Parent tag — shown when searching or on child rows */}
            {isChild && parentName && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 border border-border/40 px-2 py-0.5 rounded-full shrink-0">
                <Building2 className="h-2.5 w-2.5" />
                {parentName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {node._count.clients} client{node._count.clients !== 1 ? 's' : ''}
            </span>
            {hasChildren && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {node.children.length} sub-unit{node.children.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div
          className={cn(
            'hidden sm:inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border shrink-0',
            node.isActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
          )}
        >
          <StatusDot active={node.isActive} />
          {node.isActive ? 'Active' : 'Inactive'}
        </div>

        {/* Actions */}
        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border-border/60">
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
        </div>
      </div>

      {/* Children */}
      {!searchActive &&
        expanded &&
        hasChildren &&
        node.children.map(child => (
          <BURow
            key={child.id}
            node={child}
            depth={depth + 1}
            parentName={node.name}
            permission={permission}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            searchActive={searchActive}
          />
        ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BusinessUnitsPage() {
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('business_units');
  const [deleteTarget, setDeleteTarget] = useState<BUNode | null>(null);
  const [search, setSearch] = useState('');

  const buQuery = useQuery<BUListResponse>({
    queryKey: ['business-units'],
    queryFn: async () => (await axios.get<BUListResponse>('/business-units')).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await axios.delete(`/business-units/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      setDeleteTarget(null);
    },
  });

  const flat = buQuery.data?.flat ?? [];
  const tree = buQuery.data?.data ?? [];

  // Total count from flat list
  const totalBUs = flat.length;
  const activeBUs = flat.filter(b => b.isActive).length;

  // Search: filter flat list, show with parent name tag
  const searchQ = search.trim().toLowerCase();
  const searchActive = searchQ.length > 0;

  // Build id→name map for parent lookup
  const nameMap = new Map(flat.map(b => [b.id, b.name]));

  const filteredFlat = searchActive
    ? flat.filter(
        b =>
          b.name.toLowerCase().includes(searchQ) || (b.code ?? '').toLowerCase().includes(searchQ)
      )
    : [];

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Business Units</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalBUs} total · {activeBUs} active
            </p>
          </div>
        </div>
        {permission.canAdd && (
          <Button onClick={() => router.push('/business-units/create')} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Create BU
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-10 bg-card border-border/60 rounded-xl"
        />
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {/* Column header */}
        {!buQuery.isLoading && !buQuery.isError && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-muted/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">
              {searchActive
                ? `${filteredFlat.length} result${filteredFlat.length !== 1 ? 's' : ''}`
                : 'Name'}
            </span>
            <span className="hidden sm:block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-20 text-center">
              Status
            </span>
            <span className="w-8" />
          </div>
        )}

        {/* Loading */}
        {buQuery.isLoading && (
          <div className="divide-y divide-border/40">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {buQuery.isError && (
          <div className="px-6 py-10 text-center text-sm text-destructive">
            Failed to load business units.
          </div>
        )}

        {/* Search results — flat with parent tags */}
        {!buQuery.isLoading &&
          !buQuery.isError &&
          searchActive &&
          (filteredFlat.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No business units match "{search}"</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredFlat.map(bu => {
                const parentName = bu.parentBUId ? (nameMap.get(bu.parentBUId) ?? null) : null;
                // Build a fake BUNode for the row (no children shown in search)
                const node: BUNode = { ...bu, children: [] };
                return (
                  <BURow
                    key={bu.id}
                    node={node}
                    depth={0}
                    parentName={parentName}
                    permission={permission}
                    onView={id => router.push(`/business-units/${id}`)}
                    onEdit={id => router.push(`/business-units/${id}/edit`)}
                    onDelete={setDeleteTarget}
                    searchActive={true}
                  />
                );
              })}
            </div>
          ))}

        {/* Tree view */}
        {!buQuery.isLoading &&
          !buQuery.isError &&
          !searchActive &&
          (tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No business units yet</p>
              {permission.canAdd && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/business-units/create')}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Create your first BU
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {tree.map(node => (
                <BURow
                  key={node.id}
                  node={node}
                  depth={0}
                  parentName={null}
                  permission={permission}
                  onView={id => router.push(`/business-units/${id}`)}
                  onEdit={id => router.push(`/business-units/${id}/edit`)}
                  onDelete={setDeleteTarget}
                  searchActive={false}
                />
              ))}
            </div>
          ))}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border/60 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Business Unit</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
                <p className="mt-2 text-xs">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
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
