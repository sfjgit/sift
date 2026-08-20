/* eslint-disable react/no-unescaped-entities */
'use client';

// File: TeamTreePicker.tsx
// Path: src/components/reports/TeamTreePicker.tsx

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Users, X, Check } from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
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

// Role color dot
function roleDot(node: TreeNode): string {
  const r = node.role?.canonicalName ?? node.role?.name ?? '';
  if (r.includes('SUPER')) return 'bg-red-500';
  if (r.includes('DELIVERY') || r.includes('MANAGER')) return 'bg-purple-500';
  if (r.includes('LEAD')) return 'bg-indigo-500';
  if (r.includes('CSM')) return 'bg-teal-500';
  return 'bg-slate-400';
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
          'group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors',
          isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="shrink-0 text-slate-400 hover:text-slate-700"
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="h-3.5 w-3.5 block" />
          )}
        </button>

        {/* Role dot */}
        <span className={cn('h-2 w-2 shrink-0 rounded-full', roleDot(node))} />

        {/* Name + role */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-[13px] font-semibold',
              isSelected ? 'text-indigo-800' : 'text-slate-800'
            )}
          >
            {fullName(node)}
          </p>
          <p className="truncate text-[10px] text-slate-400">{roleName(node)}</p>
        </div>

        {/* Count badge */}
        {hasChildren && (
          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
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
            <button
              type="button"
              title={`${fullName(node)}'s entire team (${count} people)`}
              onClick={() => onSelect(node, false)}
              className={cn(
                'rounded-md px-2 py-1 text-[10px] font-bold transition-colors',
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              )}
            >
              Team
            </button>
          )}
          {/* Individual button */}
          <button
            type="button"
            title={`Only ${fullName(node)}`}
            onClick={() => onSelect(node, true)}
            className={cn(
              'rounded-md px-2 py-1 text-[10px] font-bold transition-colors',
              isSelected
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Only
          </button>
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
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors',
          value
            ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        )}
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[160px] truncate">{label}</span>
        {value && (
          <span
            className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-700"
            onClick={e => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            <X className="h-2.5 w-2.5" />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Select team or individual
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
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
              'flex w-full items-center gap-2 px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-slate-50',
              !value ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600'
            )}
          >
            {!value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
            <span className={cn('ml-', !value ? '0' : '5')}>All teams</span>
          </button>

          {/* Tree */}
          <div className="max-h-[420px] overflow-y-auto py-1">
            {isLoading ? (
              <div className="space-y-1.5 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-lg bg-slate-100"
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
              <p className="px-4 py-3 text-[12px] text-slate-400">No team data available.</p>
            )}
          </div>

          {/* Footer hint */}
          {value && (
            <div className="border-t border-slate-100 bg-indigo-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-indigo-700">
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
