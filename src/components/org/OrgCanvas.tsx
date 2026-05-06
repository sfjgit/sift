'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrgNode } from './types';
import { userColor, userInitials } from './org.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────────────────────────────────────

const NODE_W = 160;
const NODE_H = 56;
const H_GAP = 60; // horizontal gap between levels
const V_GAP = 16; // vertical gap between siblings

// ─────────────────────────────────────────────────────────────────────────────
// Layout engine — horizontal tree, root left, children right
// Returns flat list of positioned nodes + total height
// ─────────────────────────────────────────────────────────────────────────────

interface LayoutItem {
  node: OrgNode;
  x: number;
  y: number;
}

function layoutNode(
  node: OrgNode,
  x: number,
  yStart: number,
  collapsed: Set<string>,
  out: LayoutItem[]
): number {
  // center y for this node = will be set after children are laid out
  const myIndex = out.length;
  out.push({ node, x, y: yStart }); // placeholder y

  const children = collapsed.has(node.id) ? [] : node.children;

  if (children.length === 0) {
    // leaf — y is yStart
    out[myIndex].y = yStart;
    return yStart + NODE_H + V_GAP;
  }

  const childX = x + NODE_W + H_GAP;
  let cursor = yStart;

  const childYMids: number[] = [];
  for (const child of children) {
    const before = cursor;
    cursor = layoutNode(child, childX, cursor, collapsed, out);
    const after = cursor - V_GAP;
    childYMids.push(before + (after - before) / 2);
  }

  // center this node vertically among its children
  const firstMid = childYMids[0];
  const lastMid = childYMids[childYMids.length - 1];
  out[myIndex].y = (firstMid + lastMid) / 2;

  return cursor;
}

function buildLayout(root: OrgNode, collapsed: Set<string>): LayoutItem[] {
  const out: LayoutItem[] = [];
  layoutNode(root, 0, 0, collapsed, out);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgCanvas
// ─────────────────────────────────────────────────────────────────────────────

interface OrgCanvasProps {
  tree: OrgNode;
  searchQuery: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function matchesSearch(node: OrgNode, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    `${node.firstName} ${node.lastName}`.toLowerCase().includes(s) ||
    (node.employeeId?.toLowerCase().includes(s) ?? false) ||
    node.role.name.toLowerCase().includes(s) ||
    (node.department?.name.toLowerCase().includes(s) ?? false)
  );
}

export function OrgCanvas({ tree, searchQuery, selectedId, onSelect }: OrgCanvasProps) {
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const layout = useMemo(() => buildLayout(tree, collapsed), [tree, collapsed]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, LayoutItem>();
    layout.forEach(l => m.set(l.node.id, l));
    return m;
  }, [layout]);

  // pan handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.org-node')) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ ...pan });
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      setPan({ x: panStart.x + e.clientX - dragStart.x, y: panStart.y + e.clientY - dragStart.y });
    },
    [dragging, dragStart, panStart]
  );

  const onMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(2, Math.max(0.2, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // build edges: parent center-right → child center-left
  const edges: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    parentId: string;
    childId: string;
  }[] = [];
  layout.forEach(({ node, x, y }) => {
    if (collapsed.has(node.id)) return;
    node.children.forEach(child => {
      const childLayout = nodeMap.get(child.id);
      if (!childLayout) return;
      edges.push({
        x1: x + NODE_W,
        y1: y + NODE_H / 2,
        x2: childLayout.x,
        y2: childLayout.y + NODE_H / 2,
        parentId: node.id,
        childId: child.id,
      });
    });
  });

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle,hsl(var(--border)/0.6)_1px,transparent_1px)] [background-size:20px_20px]"
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
    >
      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        {[
          { icon: ZoomIn, fn: () => setZoom(z => Math.min(2, z + 0.15)) },
          { icon: ZoomOut, fn: () => setZoom(z => Math.max(0.2, z - 0.15)) },
          {
            icon: Maximize2,
            fn: () => {
              setZoom(0.9);
              setPan({ x: 40, y: 40 });
            },
          },
        ].map(({ icon: Icon, fn }, i) => (
          <button
            key={i}
            onClick={fn}
            className="flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-muted text-muted-foreground transition-colors"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 z-10 text-[10px] text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded border flex items-center gap-1.5">
        <Move className="h-3 w-3" />
        drag · scroll to zoom · {Math.round(zoom * 100)}%
      </div>

      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Connector lines */}
          {edges.map((e, i) => {
            const mx = (e.x1 + e.x2) / 2;
            return (
              <path
                key={i}
                d={`M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2} ${e.y2}`}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={1.5}
              />
            );
          })}
        </g>
      </svg>

      {/* Nodes as HTML foreignObject via absolute positioned divs */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {layout.map(({ node, x, y }) => {
          const color = userColor(node.id);
          const initials = userInitials(node.firstName, node.lastName);
          const isSelected = selectedId === node.id;
          const hasChildren = node.children.length > 0;
          const isCollapsed = collapsed.has(node.id);
          const highlighted = searchQuery ? matchesSearch(node, searchQuery) : false;
          const dimmed = searchQuery ? !matchesSearch(node, searchQuery) : false;

          return (
            <div
              key={node.id}
              className="org-node absolute"
              style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
            >
              <div
                className={cn(
                  'w-full h-full rounded-xl border-2 flex items-center gap-2.5 px-2.5 select-none transition-all cursor-pointer bg-card',
                  isSelected
                    ? 'border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20'
                    : highlighted
                      ? 'border-primary/40 shadow-md'
                      : 'border-border hover:border-border/80 hover:shadow-md',
                  !node.isActive && 'opacity-40',
                  dimmed && 'opacity-30'
                )}
                onClick={() => onSelect(node.id)}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                    color
                  )}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className={cn(
                      'text-[11px] font-semibold truncate leading-tight',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {node.firstName} {node.lastName}
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate leading-tight">
                    {node.role.name}
                  </span>
                </div>

                {/* Collapse toggle */}
                {hasChildren && (
                  <button
                    className="shrink-0 h-4 w-4 rounded-full border bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      toggleCollapse(node.id);
                    }}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed ? node.children.length : '−'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
