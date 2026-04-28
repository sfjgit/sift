/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/teams/types.ts
// Shared across all team arc components. No React imports here — pure data.

import type { NodeType, TeamCategory, EdgeType, TeamListItem } from '@/types/team.types';

// ─────────────────────────────────────────────────────────────────────────────
// Canvas constants
// ─────────────────────────────────────────────────────────────────────────────

export const NODE_W = 224;
export const NODE_H = 92;
export const H_GAP = 72;
export const V_GAP = 52;

// ─────────────────────────────────────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────────────────────────────────────

export const NODE_COLOR: Record<
  NodeType,
  {
    bg: string;
    border: string;
    icon: string;
    badge: string;
    ring: string;
  }
> = {
  MANAGEMENT: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    icon: 'text-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
    ring: 'ring-violet-400',
  },
  GROUP: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800',
    icon: 'text-sky-500',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    ring: 'ring-sky-400',
  },
  INDIVIDUAL: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    ring: 'ring-emerald-400',
  },
};

export const CAT_COLOR: Record<TeamCategory, string> = {
  DELIVERY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  SALES: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  SUPPORT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  MANAGEMENT: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

export const EDGE_STROKE: Record<
  EdgeType,
  {
    active: string;
    inactive: string;
    label: string;
    marker: string;
  }
> = {
  ASSIGNS_TO: { active: '#3b82f6', inactive: '#bfdbfe', label: 'assigns', marker: 'blue' },
  REPORTS_TO: { active: '#8b5cf6', inactive: '#ddd6fe', label: 'reports to', marker: 'purple' },
  VISIBILITY: { active: '#10b981', inactive: '#a7f3d0', label: 'sees', marker: 'green' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Canvas edge type
// ─────────────────────────────────────────────────────────────────────────────

export interface CanvasEdge {
  id: string;
  parentId: string;
  childId: string;
  edgeType: EdgeType;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout engine
// Derives x,y positions from the tree structure.
// `tree` comes from the server — built from ASSIGNS_TO edges.
// ─────────────────────────────────────────────────────────────────────────────

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  data: TeamListItem;
}

function measureSubtree(node: TeamListItem): number {
  const children = (node as any).children ?? [];
  if (!children.length) return 1;
  return children.reduce((sum: number, c: TeamListItem) => sum + measureSubtree(c), 0);
}

function place(node: TeamListItem, depth: number, startCol: number, nodes: LayoutNode[]): void {
  const width = measureSubtree(node);
  const col = startCol + (width - 1) / 2;
  nodes.push({
    id: node.id,
    x: col * (NODE_W + H_GAP),
    y: depth * (NODE_H + V_GAP),
    data: node,
  });
  let childStart = startCol;
  for (const child of (node as any).children ?? []) {
    place(child, depth + 1, childStart, nodes);
    childStart += measureSubtree(child);
  }
}

export function layoutTree(roots: TeamListItem[]): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  let col = 0;
  for (const root of roots) {
    place(root, 0, col, nodes);
    col += measureSubtree(root);
  }
  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract flat edge list from arc flat teams
// ─────────────────────────────────────────────────────────────────────────────

export function extractEdges(flatTeams: TeamListItem[]): CanvasEdge[] {
  const seen = new Set<string>();
  const edges: CanvasEdge[] = [];
  for (const team of flatTeams) {
    for (const e of (team as any).childEdges ?? []) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        edges.push({
          id: e.id,
          parentId: team.id,
          childId: e.childId,
          edgeType: e.edgeType,
          isActive: e.isActive,
        });
      }
    }
  }
  return edges;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const ini = (f: string, l: string) => `${f?.[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase();
