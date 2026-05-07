'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { OrgNode } from './types';
import { userColor, userInitials } from './org.utils';
import { cn } from '@/lib/utils';

function matchesSearch(node: OrgNode, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    `${node.firstName} ${node.lastName}`.toLowerCase().includes(s) ||
    (node.employeeId?.toLowerCase().includes(s) ?? false) ||
    node.role.name.toLowerCase().includes(s) ||
    (node.department?.name.toLowerCase().includes(s) ?? false) ||
    (node.workingLocation?.toLowerCase().includes(s) ?? false)
  );
}

function hasMatch(node: OrgNode, q: string): boolean {
  return matchesSearch(node, q) || node.children.some(c => hasMatch(c, q));
}

function OrgNodeRow({
  node,
  searchQuery,
  isRoot,
  selectedId,
  onSelect,
}: {
  node: OrgNode;
  searchQuery: string;
  isRoot: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(isRoot || node.depth < 2);

  useEffect(() => {
    if (searchQuery && hasMatch(node, searchQuery)) setOpen(true);
  }, [searchQuery]);

  const highlighted = searchQuery ? matchesSearch(node, searchQuery) : false;
  const isSelected = selectedId === node.id;
  const color = userColor(node.id);
  const initials = userInitials(node.firstName, node.lastName);

  const visibleChildren = searchQuery
    ? node.children.filter(c => hasMatch(c, searchQuery))
    : node.children;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          isSelected
            ? 'bg-primary/10 ring-1 ring-primary/30'
            : highlighted
              ? 'bg-primary/5 ring-1 ring-primary/20'
              : 'hover:bg-muted/40',
          !node.isActive && 'opacity-50'
        )}
      >
        <button
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground transition-colors',
            !hasChildren && 'invisible'
          )}
          onClick={e => {
            e.stopPropagation();
            hasChildren && setOpen(o => !o);
          }}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <button
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          onClick={() => onSelect(node.id)}
        >
          <div
            className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
              color
            )}
          >
            {initials}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">
                {node.firstName} {node.lastName}
              </span>
              {node.teamLeadId && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                  TL
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="truncate">{node.role.name}</span>
              {node.department && (
                <>
                  <span>·</span>
                  <span className="truncate">{node.department.name}</span>
                </>
              )}
              {node.workingLocation && (
                <>
                  <span>·</span>
                  <span className="truncate">{node.workingLocation}</span>
                </>
              )}
            </div>
          </div>

          {node.employeeId && (
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:block ml-auto">
              {node.employeeId}
            </span>
          )}
        </button>

        {hasChildren && (
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {node.children.length}
          </span>
        )}
      </div>

      {open && visibleChildren.length > 0 && (
        <div className="ml-6 pl-3 border-l border-border/50 flex flex-col gap-0.5 mt-0.5">
          {visibleChildren.map(child => (
            <OrgNodeRow
              key={child.id}
              node={child}
              searchQuery={searchQuery}
              isRoot={false}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgTree({
  tree,
  searchQuery,
  selectedId,
  onSelect,
}: {
  tree: OrgNode;
  searchQuery: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <OrgNodeRow
        node={tree}
        searchQuery={searchQuery}
        isRoot
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
