'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrgNode } from './types';
import { userColor, userInitials } from './org.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Constants — top-down layout
// ─────────────────────────────────────────────────────────────────────────────

const NODE_W = 180;
const NODE_H = 88;
const H_GAP = 20; // horizontal gap between siblings
const V_GAP = 70; // vertical gap between levels

function roleTheme(roleName: string) {
  const r = roleName.toLowerCase();
  if (r.includes('super') || r.includes('ceo'))
    return { strip: '#7c3aed', badge: '#ede9fe', badgeText: '#5b21b6', border: '#7c3aed' };
  if (r.includes('senior csm'))
    return { strip: '#2563eb', badge: '#dbeafe', badgeText: '#1d4ed8', border: '#2563eb' };
  if (r.includes('csm'))
    return { strip: '#0284c7', badge: '#e0f2fe', badgeText: '#0369a1', border: '#0284c7' };
  if (r.includes('delivery manager') || r.includes('manager'))
    return { strip: '#d97706', badge: '#fef3c7', badgeText: '#92400e', border: '#d97706' };
  if (r.includes('delivery lead') || r.includes('lead'))
    return { strip: '#059669', badge: '#d1fae5', badgeText: '#065f46', border: '#059669' };
  if (r.includes('recruiter'))
    return { strip: '#0ea5e9', badge: '#e0f2fe', badgeText: '#0369a1', border: '#0ea5e9' };
  if (r.includes('hr'))
    return { strip: '#db2777', badge: '#fce7f3', badgeText: '#9d174d', border: '#db2777' };
  return { strip: '#6b7280', badge: '#f3f4f6', badgeText: '#374151', border: '#6b7280' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-down layout engine
// x = horizontal center of the subtree
// y = top of the node
// ─────────────────────────────────────────────────────────────────────────────

interface LayoutItem {
  node: OrgNode;
  x: number;
  y: number;
}

// Returns the total width consumed by this subtree
function measureWidth(node: OrgNode, collapsed: Set<string>): number {
  const rawChildren = collapsed.has(node.id) ? [] : node.children;
  if (rawChildren.length === 0) return NODE_W;

  // Group by TL
  const tlIds = new Set(rawChildren.map(c => c.teamLeadId).filter(Boolean) as string[]);
  const tlNodes = rawChildren.filter(c => tlIds.has(c.id));
  const directKids = rawChildren.filter(c => !c.teamLeadId && !tlIds.has(c.id));
  const memberKids = rawChildren.filter(c => c.teamLeadId && !tlIds.has(c.id));

  // Each TL group = TL width + max(members widths stacked)
  // For top-down: TL and its members are on the same level side-by-side
  // Actually in top-down: TL is at level N+1, members at level N+2
  // So TL group width = max(TL subtree width, sum of member widths)
  // Simplify: treat TL group as: TL node (which has its own children = members)
  // We handle this by building a virtual child list

  let totalWidth = 0;

  for (const child of directKids) {
    if (totalWidth > 0) totalWidth += H_GAP;
    totalWidth += measureWidth(child, collapsed);
  }

  for (const tl of tlNodes) {
    const members = memberKids.filter(m => m.teamLeadId === tl.id);
    // TL group width = max(NODE_W, sum of member widths)
    let membersWidth = 0;
    for (let i = 0; i < members.length; i++) {
      if (i > 0) membersWidth += H_GAP;
      membersWidth += measureWidth(members[i], collapsed);
    }
    const tlGroupW = Math.max(NODE_W, membersWidth);
    if (totalWidth > 0) totalWidth += H_GAP;
    totalWidth += tlGroupW;
  }

  return Math.max(totalWidth, NODE_W);
}

function layoutTopDown(
  node: OrgNode,
  cx: number, // center x of this node
  y: number, // top y of this node
  collapsed: Set<string>,
  out: LayoutItem[]
): void {
  out.push({ node, x: cx - NODE_W / 2, y });

  const rawChildren = collapsed.has(node.id) ? [] : node.children;
  if (rawChildren.length === 0) return;

  const childY = y + NODE_H + V_GAP;

  // Separate into TL groups + direct children
  const tlIds = new Set(rawChildren.map(c => c.teamLeadId).filter(Boolean) as string[]);
  const tlNodes = rawChildren.filter(c => tlIds.has(c.id));
  const directKids = rawChildren.filter(c => !c.teamLeadId && !tlIds.has(c.id));
  const memberKids = rawChildren.filter(c => c.teamLeadId && !tlIds.has(c.id));

  // Build a flat list of "groups" with their widths
  type Group =
    | { type: 'direct'; node: OrgNode; width: number }
    | { type: 'tl'; tl: OrgNode; members: OrgNode[]; width: number };

  const groups: Group[] = [];

  for (const child of directKids) {
    groups.push({ type: 'direct', node: child, width: measureWidth(child, collapsed) });
  }
  for (const tl of tlNodes) {
    const members = memberKids.filter(m => m.teamLeadId === tl.id);
    let membersW = 0;
    for (let i = 0; i < members.length; i++) {
      if (i > 0) membersW += H_GAP;
      membersW += measureWidth(members[i], collapsed);
    }
    const w = Math.max(NODE_W, membersW);
    groups.push({ type: 'tl', tl, members, width: w });
  }

  // Total width of all groups
  // eslint-disable-next-line prefer-const
  let totalW = groups.reduce((s, g) => s + g.width, 0) + Math.max(0, groups.length - 1) * H_GAP;

  // Start x (left edge of first group), centered under parent
  let curX = cx - totalW / 2;

  for (const group of groups) {
    const groupCX = curX + group.width / 2;

    if (group.type === 'direct') {
      layoutTopDown(group.node, groupCX, childY, collapsed, out);
    } else {
      // TL node centered in its group
      const tlCX = groupCX;
      out.push({ node: group.tl, x: tlCX - NODE_W / 2, y: childY });

      if (group.members.length > 0) {
        const membersY = childY + NODE_H + V_GAP;
        let membersW = 0;
        for (let i = 0; i < group.members.length; i++) {
          if (i > 0) membersW += H_GAP;
          membersW += measureWidth(group.members[i], collapsed);
        }
        let mCurX = groupCX - membersW / 2;
        for (const member of group.members) {
          const mw = measureWidth(member, collapsed);
          layoutTopDown(member, mCurX + mw / 2, membersY, collapsed, out);
          mCurX += mw + H_GAP;
        }
      }
    }

    curX += group.width + H_GAP;
  }
}

function buildLayout(root: OrgNode, collapsed: Set<string>): LayoutItem[] {
  const out: LayoutItem[] = [];
  layoutTopDown(root, 0, 0, collapsed, out);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build edges — vertical elbow lines (top-down)
// parent bottom-center → child top-center
// ─────────────────────────────────────────────────────────────────────────────

interface Edge {
  key: string;
  px: number;
  py: number;
  cx: number;
  cy: number;
  isTL: boolean;
}

function buildEdges(layout: LayoutItem[], collapsed: Set<string>): Edge[] {
  const pos = new Map<string, { x: number; y: number }>();
  layout.forEach(l => pos.set(l.node.id, { x: l.x, y: l.y }));

  const edges: Edge[] = [];
  const seen = new Set<string>();

  layout.forEach(({ node }) => {
    if (collapsed.has(node.id)) return;
    const rawChildren = node.children;
    if (!rawChildren.length) return;

    const np = pos.get(node.id)!;
    const tlIds = new Set(rawChildren.map(c => c.teamLeadId).filter(Boolean) as string[]);

    rawChildren.forEach(child => {
      const cp = pos.get(child.id);
      if (!cp) return;

      const isMember = !!child.teamLeadId && !tlIds.has(child.id);

      if (isMember) {
        // Edge: TL → member
        const tlp = pos.get(child.teamLeadId!);
        if (!tlp) return;
        const key = `tl-${child.teamLeadId}-${child.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            key,
            px: tlp.x + NODE_W / 2,
            py: tlp.y + NODE_H,
            cx: cp.x + NODE_W / 2,
            cy: cp.y,
            isTL: true,
          });
        }
        return;
      }

      // Normal parent → child (or parent → TL)
      const key = `${node.id}-${child.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          key,
          px: np.x + NODE_W / 2,
          py: np.y + NODE_H,
          cx: cp.x + NODE_W / 2,
          cy: cp.y,
          isTL: tlIds.has(child.id),
        });
      }
    });
  });

  return edges;
}

// Vertical elbow path: down from parent, horizontal, down to child
function elbowPath(px: number, py: number, cx: number, cy: number) {
  const my = py + (cy - py) / 2;
  return `M ${px} ${py} V ${my} H ${cx} V ${cy}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgCanvas
// ─────────────────────────────────────────────────────────────────────────────

export function OrgCanvas({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const layout = useMemo(() => buildLayout(tree, collapsed), [tree, collapsed]);
  const edges = useMemo(() => buildEdges(layout, collapsed), [layout, collapsed]);

  // Auto-center root node on first load
  useEffect(() => {
    if (pan !== null || !containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    // Root is at x=0 (centered), so pan.x = half container
    setPan({ x: cw / 2, y: 60 });
  }, [pan, layout]);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest?.('[data-org-btn]')) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart(pan ?? { x: 0, y: 60 });
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
    setZoom(z => Math.min(2.5, Math.max(0.15, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  };

  const matchSearch = (n: OrgNode) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      `${n.firstName} ${n.lastName}`.toLowerCase().includes(q) ||
      (n.employeeId?.toLowerCase().includes(q) ?? false) ||
      n.role.name.toLowerCase().includes(q) ||
      (n.department?.name.toLowerCase().includes(q) ?? false)
    );
  };

  const currentPan = pan ?? { x: 0, y: 60 };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle,hsl(var(--border)/0.5)_1px,transparent_1px)] [background-size:24px_24px]"
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
    >
      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-20">
        {
          // eslint-disable-next-line react-hooks/refs
          [
            { icon: ZoomIn, fn: () => setZoom(z => Math.min(2.5, z + 0.12)) },
            { icon: ZoomOut, fn: () => setZoom(z => Math.max(0.15, z - 0.12)) },
            {
              icon: Maximize2,
              fn: () => {
                if (!containerRef.current) return;
                setZoom(0.9);
                setPan({ x: containerRef.current.clientWidth / 2, y: 60 });
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
          ))
        }
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-3 z-20 text-[10px] text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded border flex items-center gap-1.5">
        <Move className="h-3 w-3" />
        drag · scroll zoom · {Math.round(zoom * 100)}%
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border text-[10px]">
        {[
          { c: '#7c3aed', l: 'Super Admin / CEO' },
          { c: '#2563eb', l: 'Senior CSM' },
          { c: '#0284c7', l: 'CSM' },
          { c: '#d97706', l: 'Delivery Manager' },
          { c: '#059669', l: 'Delivery Lead / TL' },
          { c: '#0ea5e9', l: 'Recruiter' },
          { c: '#db2777', l: 'HR' },
        ].map(({ c, l }) => (
          <div key={l} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
            {l}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-muted-foreground mt-1 pt-1 border-t border-border/40">
          <svg width="16" height="8">
            <line
              x1="0"
              y1="4"
              x2="16"
              y2="4"
              stroke="#059669"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
          </svg>
          TL branch
        </div>
      </div>

      {/* Single SVG — lines + nodes share one transform */}
      <svg
        width="100%"
        height="100%"
        style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
        onMouseDown={onMouseDown}
      >
        <g transform={`translate(${currentPan.x},${currentPan.y}) scale(${zoom})`}>
          {/* Edges — behind nodes */}
          {edges.map(e => (
            <path
              key={e.key}
              d={elbowPath(e.px, e.py, e.cx, e.cy)}
              fill="none"
              stroke={e.isTL ? '#059669' : '#cbd5e1'}
              strokeWidth={1.5}
              strokeDasharray={e.isTL ? '6 3' : undefined}
            />
          ))}

          {/* Nodes */}
          {layout.map(({ node, x, y }) => {
            const theme = roleTheme(node.role.name);
            const initials = userInitials(node.firstName, node.lastName);
            const aColor = userColor(node.id);
            const isSelected = selectedId === node.id;
            const hasKids = node.children.length > 0;
            const isCollapsed = collapsed.has(node.id);
            const matched = matchSearch(node);
            const dimmed = !!searchQuery && !matched;
            const s = node.stats;

            return (
              <foreignObject
                key={node.id}
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                style={{ overflow: 'visible' }}
              >
                <div
                  // @ts-expect-error errr
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    width: NODE_W,
                    height: NODE_H,
                    opacity: !node.isActive ? 0.35 : dimmed ? 0.18 : 1,
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s',
                  }}
                >
                  <div
                    data-org-btn="true"
                    onClick={() => onSelect(node.id)}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? '#6366f1' : matched && searchQuery ? theme.border : theme.border + '55'}`,
                      background: isSelected ? '#eef2ff' : '#ffffff',
                      boxShadow: isSelected
                        ? '0 8px 24px rgba(99,102,241,0.3)'
                        : '0 2px 8px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {/* Color strip */}
                    <div
                      style={{
                        height: 4,
                        background: isSelected ? '#6366f1' : theme.strip,
                        flexShrink: 0,
                      }}
                    />

                    {/* Body */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 7,
                        padding: '7px 8px 4px',
                        flex: 1,
                        minHeight: 0,
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'flex items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                          aColor
                        )}
                        style={{ width: 30, height: 30, marginTop: 1 }}
                      >
                        {initials}
                      </div>

                      {/* Info */}
                      <div
                        style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            lineHeight: '1.2',
                            color: isSelected ? '#4338ca' : '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {node.firstName} {node.lastName}
                        </span>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 9,
                            fontWeight: 600,
                            padding: '1px 4px',
                            borderRadius: 3,
                            marginTop: 2,
                            background: isSelected ? '#e0e7ff' : theme.badge,
                            color: isSelected ? '#4338ca' : theme.badgeText,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            alignSelf: 'flex-start',
                          }}
                        >
                          {node.role.name}
                        </span>
                        {node.department && (
                          <span
                            style={{
                              fontSize: 9,
                              color: '#94a3b8',
                              marginTop: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {node.department.name}
                          </span>
                        )}
                      </div>

                      {/* Collapse btn */}
                      {hasKids && (
                        <div
                          data-org-btn="true"
                          onClick={e => {
                            e.stopPropagation();
                            setCollapsed(prev => {
                              const n = new Set(prev);
                              n.has(node.id) ? n.delete(node.id) : n.add(node.id);
                              return n;
                            });
                          }}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: `1px solid ${theme.border}`,
                            background: isCollapsed ? theme.strip : '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                            color: isCollapsed ? '#fff' : '#64748b',
                            marginTop: 2,
                          }}
                        >
                          {isCollapsed ? node.children.length : '−'}
                        </div>
                      )}
                    </div>

                    {/* Stats strip */}
                    <div style={{ display: 'flex', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                      {[
                        { l: 'Reqs', v: s.activeReqs },
                        { l: 'Sub', v: s.totalSubmissions },
                        { l: 'Int', v: s.totalInterviews },
                        { l: 'Fill', v: s.totalFilled },
                      ].map((st, i) => (
                        <div
                          key={st.l}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '3px 0',
                            borderLeft: i > 0 ? '1px solid #f1f5f9' : undefined,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              lineHeight: 1,
                              color: st.v > 0 ? theme.strip : '#cbd5e1',
                            }}
                          >
                            {st.v}
                          </span>
                          <span
                            style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1, marginTop: 1 }}
                          >
                            {st.l}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
