// File: OrgChart.tsx
// Path: src/features/org/OrgChart.tsx
//
// The org chart: a top-down reporting tree you can drag, zoom and fold. Each
// card shows the person, their role and what they carry (clients, SPOCs, open
// and overdue tasks). People led by a team lead who sits beside them hang under
// that lead (dashed line). Used full screen on /org and inside AI canvases.
// Layout adapted from the ATS org canvas, for the CRM's numbers and dark mode.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Move, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrgNode } from './types';

const NODE_W = 188;
const NODE_H = 92;
const H_GAP = 20;
const V_GAP = 64;

// ── look ─────────────────────────────────────────────────────────────────────

type Theme = { strip: string; badge: string; text: string; label: string };
const THEMES: [RegExp, Theme][] = [
  [/organisation/i, { strip: '#334155', badge: 'rgba(51,65,85,.12)', text: '#334155', label: 'Organisation' }],
  [/super|ceo|director|founder|owner/i, { strip: '#7c3aed', badge: 'rgba(124,58,237,.12)', text: '#6d28d9', label: 'Leadership' }],
  [/head|manager|vp/i, { strip: '#d97706', badge: 'rgba(217,119,6,.14)', text: '#b45309', label: 'Manager' }],
  [/lead|supervisor/i, { strip: '#059669', badge: 'rgba(5,150,105,.12)', text: '#047857', label: 'Team lead' }],
  [/executive|associate|analyst|officer/i, { strip: '#2563eb', badge: 'rgba(37,99,235,.12)', text: '#1d4ed8', label: 'Executive' }],
  [/admin|hr|ops|operation/i, { strip: '#db2777', badge: 'rgba(219,39,119,.12)', text: '#be185d', label: 'Admin / HR' }],
];
const OTHER: Theme = { strip: '#64748b', badge: 'rgba(100,116,139,.12)', text: '#475569', label: 'Other' };
export const roleTheme = (role: string) => THEMES.find(([re]) => re.test(role))?.[1] ?? OTHER;

const AVATARS = ['#e0e7ff', '#dcfce7', '#fef3c7', '#fce7f3', '#e0f2fe', '#ede9fe', '#ffedd5', '#ccfbf1'];
const AVATAR_TEXT = ['#3730a3', '#166534', '#92400e', '#9d174d', '#075985', '#5b21b6', '#9a3412', '#115e59'];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const initialsOf = (n: Pick<OrgNode, 'firstName' | 'lastName'>) =>
  `${n.firstName[0] ?? ''}${n.lastName?.[0] ?? ''}`.toUpperCase() || '?';
export const fullNameOf = (n: Pick<OrgNode, 'firstName' | 'lastName'>) => `${n.firstName} ${n.lastName ?? ''}`.trim();

// ── layout (top-down) ────────────────────────────────────────────────────────

interface Placed {
  node: OrgNode;
  x: number;
  y: number;
}
type Group = { lead: OrgNode | null; members: OrgNode[] };

/** a manager's direct reports, with team-lead groups: a lead and the siblings they lead */
const groupsOf = (node: OrgNode, folded: Set<string>): Group[] => {
  const kids = folded.has(node.id) ? [] : node.children;
  const ids = new Set(kids.map(k => k.id));
  const leadIds = new Set(kids.filter(k => k.teamLeadId && k.teamLeadId !== k.id && ids.has(k.teamLeadId)).map(k => k.teamLeadId!));
  const groups: Group[] = [];
  for (const k of kids) {
    if (leadIds.has(k.id)) groups.push({ lead: k, members: kids.filter(m => m.teamLeadId === k.id && m.id !== k.id && !leadIds.has(m.id)) });
    else if (!(k.teamLeadId && leadIds.has(k.teamLeadId))) groups.push({ lead: null, members: [k] });
  }
  return groups;
};

const widthOf = (node: OrgNode, folded: Set<string>, memo: Map<string, number>): number => {
  const hit = memo.get(node.id);
  if (hit !== undefined) return hit;
  const gw = groupsOf(node, folded).map(g => groupWidth(g, folded, memo));
  const w = Math.max(NODE_W, gw.reduce((s, x) => s + x, 0) + Math.max(0, gw.length - 1) * H_GAP);
  memo.set(node.id, w);
  return w;
};
const groupWidth = (g: Group, folded: Set<string>, memo: Map<string, number>) => {
  if (!g.lead) return widthOf(g.members[0]!, folded, memo);
  // the lead's own reports and the people they lead share the row under the lead
  const under = [...g.members, ...(folded.has(g.lead.id) ? [] : g.lead.children)];
  const w = under.reduce((s, m, i) => s + (i ? H_GAP : 0) + widthOf(m, folded, memo), 0);
  return Math.max(NODE_W, w);
};

const place = (node: OrgNode, cx: number, y: number, folded: Set<string>, memo: Map<string, number>, out: Placed[], led: Map<string, string>) => {
  out.push({ node, x: cx - NODE_W / 2, y });
  const groups = groupsOf(node, folded);
  if (!groups.length) return;
  const widths = groups.map(g => groupWidth(g, folded, memo));
  const total = widths.reduce((s, w) => s + w, 0) + (groups.length - 1) * H_GAP;
  let x = cx - total / 2;
  const childY = y + NODE_H + V_GAP;
  groups.forEach((g, i) => {
    const gcx = x + widths[i]! / 2;
    if (!g.lead) place(g.members[0]!, gcx, childY, folded, memo, out, led);
    else {
      out.push({ node: g.lead, x: gcx - NODE_W / 2, y: childY });
      const under = [...g.members, ...(folded.has(g.lead.id) ? [] : g.lead.children)];
      const uw = under.reduce((s, m, j) => s + (j ? H_GAP : 0) + widthOf(m, folded, memo), 0);
      let mx = gcx - uw / 2;
      for (const m of under) {
        const mw = widthOf(m, folded, memo);
        if (g.members.includes(m)) led.set(m.id, g.lead.id);
        place(m, mx + mw / 2, childY + NODE_H + V_GAP, folded, memo, out, led);
        mx += mw + H_GAP;
      }
    }
    x += widths[i]! + H_GAP;
  });
};

const elbow = (px: number, py: number, cx: number, cy: number) => {
  const my = py + (cy - py) / 2;
  return `M ${px} ${py} V ${my} H ${cx} V ${cy}`;
};

// ── the chart ────────────────────────────────────────────────────────────────

export function OrgChart({
  tree,
  search = '',
  selectedId = null,
  onSelect,
  height,
  className,
}: {
  tree: OrgNode;
  search?: string;
  selectedId?: string | null;
  onSelect?: (node: OrgNode) => void;
  /** fixed height (inside a canvas); otherwise fills its parent */
  height?: number;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [folded, setFolded] = useState<Set<string>>(() => {
    // big trees start folded below the second level
    const f = new Set<string>();
    const walk = (n: OrgNode, d: number) => {
      if (d >= 2 && n.children.length) f.add(n.id);
      n.children.forEach(c => walk(c, d + 1));
    };
    // inside a canvas there is less room: fold sooner
    if (tree.teamSize > (height ? 15 : 40)) walk(tree, 0);
    return f;
  });

  const { placed, edges } = useMemo(() => {
    const memo = new Map<string, number>();
    const out: Placed[] = [];
    const led = new Map<string, string>();
    place(tree, 0, 0, folded, memo, out, led);
    const pos = new Map(out.map(p => [p.node.id, p]));
    const lines: { key: string; d: string; dashed: boolean }[] = [];
    for (const p of out) {
      if (p.node.id === tree.id) continue;
      const parentId = led.get(p.node.id) ?? p.node.reportingToId ?? (tree.virtual ? tree.id : null);
      const from = parentId ? pos.get(parentId) : undefined;
      const top = from ?? pos.get(tree.id);
      if (!top) continue;
      lines.push({
        key: `${top.node.id}-${p.node.id}`,
        d: elbow(top.x + NODE_W / 2, top.y + NODE_H, p.x + NODE_W / 2, p.y),
        dashed: led.has(p.node.id),
      });
    }
    return { placed: out, edges: lines };
  }, [tree, folded]);

  /** zoom and centre so the whole tree is on screen (not tinier than 45%) */
  const fit = useCallback(() => {
    const el = box.current;
    if (!el || !placed.length) return;
    const minX = Math.min(...placed.map(p => p.x));
    const maxX = Math.max(...placed.map(p => p.x + NODE_W));
    const maxY = Math.max(...placed.map(p => p.y + NODE_H));
    const z = Math.max(0.45, Math.min(0.95, (el.clientWidth - 48) / (maxX - minX), (el.clientHeight - 80) / maxY));
    setZoom(z);
    setPan({ x: el.clientWidth / 2 - ((minX + maxX) / 2) * z, y: 36 });
  }, [placed]);

  // the whole tree in view on first show
  useEffect(() => {
    if (pan) return;
    fit();
  }, [pan, fit]);

  const onMove = useCallback((e: MouseEvent) => {
    const d = drag.current;
    if (d) setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y });
  }, []);
  const onUp = useCallback(() => {
    drag.current = null;
    setDragging(false);
  }, []);
  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onMove, onUp]);

  // wheel zoom without scrolling the page
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(2.2, Math.max(0.2, z + (e.deltaY > 0 ? -0.08 : 0.08))));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const q = search.trim().toLowerCase();
  const hit = (n: OrgNode) =>
    !q || fullNameOf(n).toLowerCase().includes(q) || n.role.name.toLowerCase().includes(q) || !!n.department?.name.toLowerCase().includes(q);
  const p = pan ?? { x: 0, y: 40 };
  const roles = [...new Map(placed.map(x => [roleTheme(x.node.role.name).label, roleTheme(x.node.role.name)])).values()];

  return (
    <div
      ref={box}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:22px_22px] select-none',
        !height && 'h-full',
        className
      )}
      style={{ ...(height && { height }), cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={e => {
        if ((e.target as Element).closest?.('[data-org-card]')) return;
        drag.current = { x: e.clientX, y: e.clientY, px: p.x, py: p.y };
        setDragging(true);
      }}
    >
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        {/* eslint-disable-next-line react-hooks/refs -- the ref is read on click, not while rendering */}
        {[
          { icon: ZoomIn, label: 'Zoom in', fn: () => setZoom(z => Math.min(2.2, z + 0.12)) },
          { icon: ZoomOut, label: 'Zoom out', fn: () => setZoom(z => Math.max(0.2, z - 0.12)) },
          {
            icon: Maximize2,
            label: 'Fit',
            fn: fit,
          },
        ].map(b => (
          <button
            key={b.label}
            type="button"
            aria-label={b.label}
            title={b.label}
            onClick={b.fn}
            className="flex size-7 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
          >
            <b.icon className="size-3.5" />
          </button>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded border bg-card/90 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
        <Move className="size-3" /> drag · scroll to zoom · {Math.round(zoom * 100)}%
      </div>
      <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1 rounded-lg border bg-card/90 px-3 py-2 text-[10px] text-muted-foreground backdrop-blur">
        {roles.map(t => (
          <span key={t.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: t.strip }} />
            {t.label}
          </span>
        ))}
        <span className="mt-0.5 flex items-center gap-1.5 border-t pt-1">
          <svg width="16" height="6" aria-hidden>
            <line x1="0" y1="3" x2="16" y2="3" stroke="#059669" strokeWidth="1.5" strokeDasharray="4 2" />
          </svg>
          Led by a team lead
        </span>
      </div>

      <svg width="100%" height="100%" className="absolute inset-0 block">
        <g transform={`translate(${p.x},${p.y}) scale(${zoom})`}>
          {edges.map(e => (
            <path
              key={e.key}
              d={e.d}
              fill="none"
              stroke={e.dashed ? '#059669' : 'var(--border)'}
              strokeWidth={1.6}
              strokeDasharray={e.dashed ? '6 3' : undefined}
            />
          ))}
          {placed.map(({ node, x, y }) => {
            const t = roleTheme(node.role.name);
            const selected = selectedId === node.id;
            const dim = !!q && !hit(node);
            const isFolded = folded.has(node.id);
            const h = hash(node.id) % AVATARS.length;
            const s = node.stats;
            return (
              <foreignObject key={node.id} x={x} y={y} width={NODE_W} height={NODE_H} style={{ overflow: 'visible' }}>
                <div
                  data-org-card
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect?.(node)}
                  onKeyDown={e => e.key === 'Enter' && onSelect?.(node)}
                  className={cn(
                    'flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-card text-card-foreground shadow-sm transition-[transform,box-shadow]',
                    selected && 'scale-[1.04] shadow-lg ring-2 ring-primary/40'
                  )}
                  style={{
                    borderColor: selected ? 'var(--primary)' : q && !dim ? t.strip : `${t.strip}55`,
                    opacity: !node.isActive ? 0.4 : dim ? 0.2 : 1,
                  }}
                >
                  <div className="h-1 shrink-0" style={{ background: selected ? 'var(--primary)' : t.strip }} />
                  <div className="flex min-h-0 flex-1 items-start gap-2 px-2 pt-1.5">
                    <span
                      className="mt-px flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: AVATARS[h], color: AVATAR_TEXT[h] }}
                    >
                      {initialsOf(node)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[11.5px] leading-tight font-bold">{fullNameOf(node)}</span>
                      <span
                        className="mt-0.5 max-w-full self-start truncate rounded px-1 py-px text-[9px] font-semibold"
                        style={{ background: t.badge, color: t.text }}
                      >
                        {node.virtual ? `${node.teamSize} people` : node.role.name}
                      </span>
                      {(node.designation || node.department) && (
                        <span className="mt-px truncate text-[9px] text-muted-foreground">
                          {node.designation ?? node.department?.name}
                        </span>
                      )}
                    </span>
                    {node.children.length > 0 && (
                      <button
                        type="button"
                        title={isFolded ? `Show ${node.teamSize} people below` : 'Fold'}
                        onClick={e => {
                          e.stopPropagation();
                          setFolded(f => {
                            const n = new Set(f);
                            if (n.has(node.id)) n.delete(node.id);
                            else n.add(node.id);
                            return n;
                          });
                        }}
                        className="mt-0.5 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full border px-1 text-[8px] font-bold"
                        style={isFolded ? { background: t.strip, borderColor: t.strip, color: '#fff' } : { borderColor: t.strip, color: t.text }}
                      >
                        {isFolded ? node.teamSize : '−'}
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 border-t">
                    {[
                      { l: 'Clients', v: s.clients },
                      { l: 'SPOCs', v: s.spocs },
                      { l: 'Tasks', v: s.openTasks },
                      { l: 'Overdue', v: s.overdue, warn: true },
                    ].map((st, i) => (
                      <span key={st.l} className={cn('flex flex-1 flex-col items-center py-[3px]', i > 0 && 'border-l')}>
                        <span
                          className="text-[11px] leading-none font-bold tabular-nums"
                          style={{ color: st.v > 0 ? (st.warn ? 'var(--destructive)' : t.strip) : 'var(--muted-foreground)' }}
                        >
                          {st.v}
                        </span>
                        <span className="mt-px text-[8px] leading-none text-muted-foreground">{st.l}</span>
                      </span>
                    ))}
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
