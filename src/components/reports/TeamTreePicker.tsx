// File: TeamTreePicker.tsx
// Path: src/components/reports/TeamTreePicker.tsx

/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Users, X, Check } from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TreeNode {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: { name: string; canonicalName?: string };
  reportees?: TreeNode[]; // children from org tree API
  teamMembers?: TreeNode[]; // some APIs use this key
  children?: TreeNode[]; // fallback
}

export interface TeamSelection {
  id: string; // root node id (the selected manager/TL)
  name: string; // display name
  memberIds: string[]; // all ids in this subtree (inclusive)
  isIndividual: boolean; // true = just this person, false = their whole team
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fullName(node: TreeNode): string {
  return `${node.firstName ?? ''} ${node.lastName ?? ''}`.trim();
}

function roleName(node: TreeNode): string {
  return (node.role?.canonicalName ?? node.role?.name ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Normalise children — API might use reportees / teamMembers / children
function getChildren(node: TreeNode): TreeNode[] {
  return node.reportees ?? node.teamMembers ?? node.children ?? [];
}

// BFS to collect all descendant ids (inclusive of root)
function collectSubtreeIds(node: TreeNode): string[] {
  const ids: string[] = [];
  const queue: TreeNode[] = [node];
  while (queue.length) {
    const curr = queue.shift()!;
    ids.push(curr.id);
    getChildren(curr).forEach(c => queue.push(c));
  }
  return ids;
}

// Count total people in a subtree
function subtreeCount(node: TreeNode): number {
  return collectSubtreeIds(node).length;
}

// Role dot — theme chart tokens, same role mapping as before
function roleDot(node: TreeNode): string {
  const r = node.role?.canonicalName ?? node.role?.name ?? '';
  if (r.includes('SUPER')) return 'bg-destructive';
  if (r.includes('DELIVERY') || r.includes('MANAGER')) return 'bg-chart-4';
  if (r.includes('LEAD')) return 'bg-chart-1';
  if (r.includes('CSM')) return 'bg-chart-2';
  return 'bg-muted-foreground/50';
}

// ─────────────────────────────────────────────────────────────────────────────
// TREE NODE ROW — recursive
// ─────────────────────────────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  depth,
  selectedId,
  onSelect,
  defaultOpen,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (node: TreeNode, individual: boolean) => void;
  defaultOpen: boolean;
}) {
  const children = getChildren(node);
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(defaultOpen || depth === 0);
  const isSelected = selectedId === node.id;
  const count = subtreeCount(node);

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )
          ) : (
            <span className="block size-3.5" />
          )}
        </button>

        {/* Role dot */}
        <span className={cn('size-2 shrink-0 rounded-full', roleDot(node))} />

        {/* Name + role */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-xs font-semibold',
              isSelected ? 'text-primary' : 'text-foreground'
            )}
          >
            {fullName(node)}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{roleName(node)}</p>
        </div>

        {/* Count badge */}
        {hasChildren && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] font-semibold leading-4 tabular-nums text-muted-foreground">
            {count}
          </span>
        )}

        {/* Action buttons — show on hover or selected */}
        <div
          className={cn(
            'flex shrink-0 items-center gap-1',
            isSelected ? 'visible' : 'invisible group-hover:visible'
          )}
        >
          {/* Team button — select whole subtree */}
          {hasChildren && (
            <Button
              type="button"
              size="xs"
              variant={isSelected ? 'default' : 'secondary'}
              title={`${fullName(node)}'s entire team (${count} people)`}
              onClick={() => onSelect(node, false)}
              className="text-[10px]"
            >
              Team
            </Button>
          )}
          {/* Individual button */}
          <Button
            type="button"
            size="xs"
            variant="outline"
            title={`Only ${fullName(node)}`}
            onClick={() => onSelect(node, true)}
            className="text-[10px]"
          >
            Only
          </Button>
        </div>
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div>
          {children.map(child => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              defaultOpen={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM TREE PICKER — main export
// ─────────────────────────────────────────────────────────────────────────────

interface TeamTreePickerProps {
  value: TeamSelection | null;
  onChange: (sel: TeamSelection | null) => void;
}

export function TeamTreePicker({ value, onChange }: TeamTreePickerProps) {
  const axios = useAxios();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: tree, isLoading } = useQuery<TreeNode>({
    queryKey: ['org-tree', user?.id],
    queryFn: async () => {
      const res = await axios.get(`/users/${user!.id}/tree`);
      // API might return { data: {...} } or the node directly
      return res.data?.data ?? res.data;
    },
    enabled: !!user?.id && open, // only fetch when dropdown opens
    staleTime: 5 * 60_000,
  });

  function handleSelect(node: TreeNode, individual: boolean) {
    const memberIds = individual ? [node.id] : collectSubtreeIds(node);
    onChange({
      id: node.id,
      name: fullName(node),
      memberIds,
      isIndividual: individual,
    });
    setOpen(false);
  }

  const label = value ? (value.isIndividual ? value.name : `${value.name}'s team`) : 'All teams';

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'text-xs font-normal',
          value &&
            'border-primary/40 bg-primary/10 font-semibold text-primary hover:bg-primary/15 hover:text-primary aria-expanded:bg-primary/15 aria-expanded:text-primary'
        )}
      >
        <Users />
        <span className="max-w-40 truncate">{label}</span>
        {value && (
          <span
            role="button"
            aria-label="Clear team"
            className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary hover:bg-primary/25"
            onClick={e => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            <X className="size-2.5" />
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          {/* Header */}
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">Select team or individual</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              "Team" = that person + everyone under them
            </p>
          </div>

          {/* All teams option */}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted',
              !value ? 'bg-primary/10 text-primary' : 'text-foreground'
            )}
          >
            <Check className={cn('size-3.5 text-primary', value && 'invisible')} />
            All teams
          </button>

          {/* Tree */}
          <div className="max-h-[420px] overflow-y-auto p-1">
            {isLoading ? (
              <div className="space-y-1.5 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-md bg-muted"
                    style={{ marginLeft: `${(i % 3) * 16}px` }}
                  />
                ))}
              </div>
            ) : tree ? (
              <TreeNodeRow
                node={tree}
                depth={0}
                selectedId={value?.id ?? null}
                onSelect={handleSelect}
                defaultOpen={true}
              />
            ) : (
              <p className="px-3 py-3 text-xs text-muted-foreground">No team data available.</p>
            )}
          </div>

          {/* Footer hint */}
          {value && (
            <div className="border-t border-border bg-primary/5 px-3 py-2">
              <p className="text-xs font-semibold text-primary">
                {value.isIndividual
                  ? `Showing only ${value.name}`
                  : `Showing ${value.memberIds.length} people in ${value.name}'s team`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
