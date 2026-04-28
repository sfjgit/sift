// app/(dashboard)/teams/team-canvas.tsx
'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Network,
  Crown,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  X,
  Plus,
  UserPlus,
  Link2Off,
  ChevronRight,
  Pencil,
  ArrowRightLeft,
  GitBranch,
  Eye,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAxios } from '@/hooks/useAxios';
import { cn } from '@/lib/utils';
import {
  NODE_COLOR,
  CAT_COLOR,
  EDGE_STROKE,
  NODE_W,
  NODE_H,
  CanvasEdge,
  LayoutNode,
  ini,
} from '@/types/types';
import type { TeamListItem, EdgeType, TeamRole } from '@/types/team.types';

// ─────────────────────────────────────────────────────────────────────────────
// SVG bezier path
// ─────────────────────────────────────────────────────────────────────────────

function edgePath(px: number, py: number, cx: number, cy: number): string {
  const midY = (py + cy) / 2;
  return `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Edit Panel — shown when a node is selected
// Has: member list, edge controls, add edge, quick rename, open full detail
// ─────────────────────────────────────────────────────────────────────────────

interface QuickEditPanelProps {
  team: TeamListItem;
  edges: CanvasEdge[];
  allTeams: TeamListItem[];
  arcId: string;
  onClose: () => void;
  onToggleEdge: (edgeId: string, val: boolean) => void;
  onDeleteEdge: (edgeId: string) => void;
  onAddEdge: (targetId: string, type: EdgeType) => void;
  canEdit: boolean;
}

function QuickEditPanel({
  team,
  edges,
  allTeams,
  arcId,
  onClose,
  onToggleEdge,
  onDeleteEdge,
  onAddEdge,
  canEdit,
}: QuickEditPanelProps) {
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();
  const colors = NODE_COLOR[team.nodeType];

  const [newTarget, setNewTarget] = useState('');
  const [newType, setNewType] = useState<EdgeType>('ASSIGNS_TO');
  const [tab, setTab] = useState<'edges' | 'members'>('edges');

  const outEdges = edges.filter(e => e.parentId === team.id);
  const inEdges = edges.filter(e => e.childId === team.id);
  const lead = team.members?.find(m => m.teamRole === 'LEAD');
  const coLead = team.members?.find(m => m.teamRole === 'CO_LEAD');
  const members = team.members?.filter(m => m.teamRole === 'MEMBER') ?? [];

  // Other teams in arc (for edge target picker)
  const otherTeams = allTeams.filter(t => t.id !== team.id);

  // Quick rename
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(team.name);

  const saveName = useMutation({
    mutationFn: async () => (await axios.put(`/teams/${team.id}`, { name: nameVal.trim() })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arc', arcId] });
      setEditingName(false);
    },
  });

  const EDGE_ICON: Record<EdgeType, React.ElementType> = {
    ASSIGNS_TO: ArrowRightLeft,
    REPORTS_TO: GitBranch,
    VISIBILITY: Eye,
  };

  return (
    <div className="flex flex-col h-full border-l bg-card overflow-hidden w-72 shrink-0">
      {/* Header */}
      <div className={cn('px-4 py-3 border-b flex items-center gap-3 shrink-0', colors.bg)}>
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg shrink-0 bg-white/60 dark:bg-black/20'
          )}
        >
          <Network className={cn('h-4 w-4', colors.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveName.mutate();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="flex-1 text-xs font-semibold bg-white/80 dark:bg-black/30 rounded px-1.5 py-0.5 border text-foreground outline-none min-w-0"
              />
              <button
                onClick={() => saveName.mutate()}
                className="text-[10px] text-primary font-medium px-1"
              >
                ✓
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-[10px] text-muted-foreground px-1"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group/name">
              <p className="text-sm font-semibold truncate">{team.name}</p>
              {canEdit && (
                <button
                  onClick={() => {
                    setNameVal(team.name);
                    setEditingName(true);
                  }}
                  className="opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            {team.nodeType} · {team.category ?? '—'}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5 p-3 border-b shrink-0">
        {[
          { label: 'Members', value: team._count.members },
          { label: 'Out', value: outEdges.length },
          { label: 'In', value: inEdges.length },
        ].map(s => (
          <div key={s.label} className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-base font-semibold leading-none">{s.value}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex border-b shrink-0">
        {(['edges', 'members'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'edges'
              ? `Edges (${outEdges.length + inEdges.length})`
              : `Members (${team._count.members})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'edges' && (
          <div className="p-3 space-y-4">
            {/* Outgoing */}
            {outEdges.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigns to
                </p>
                {outEdges.map(e => {
                  const cfg = EDGE_STROKE[e.edgeType];
                  const Icon = EDGE_ICON[e.edgeType];
                  const tgt = allTeams.find(t => t.id === e.childId);
                  return (
                    <div
                      key={e.id}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs group/edge',
                        e.isActive
                          ? 'border-border/60 bg-background'
                          : 'border-dashed border-border/40 bg-muted/20 opacity-60'
                      )}
                    >
                      <Icon
                        className="h-3 w-3 shrink-0"
                        style={{ color: e.isActive ? cfg.active : cfg.inactive }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate">{tgt?.name ?? e.childId}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {e.edgeType.replace(/_/g, ' ')}
                        </p>
                      </div>
                      {canEdit && (
                        <>
                          <Switch
                            checked={e.isActive}
                            onCheckedChange={v => onToggleEdge(e.id, v)}
                            className="scale-[0.65] shrink-0"
                          />
                          <button
                            onClick={() => onDeleteEdge(e.id)}
                            className="opacity-0 group-hover/edge:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Link2Off className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Incoming */}
            {inEdges.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Receives from
                </p>
                {inEdges.map(e => {
                  const cfg = EDGE_STROKE[e.edgeType];
                  const Icon = EDGE_ICON[e.edgeType];
                  const src = allTeams.find(t => t.id === e.parentId);
                  return (
                    <div
                      key={e.id}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs',
                        e.isActive
                          ? 'border-border/60 bg-background'
                          : 'border-dashed border-border/40 bg-muted/20 opacity-60'
                      )}
                    >
                      <Icon
                        className="h-3 w-3 shrink-0"
                        style={{ color: e.isActive ? cfg.active : cfg.inactive }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate">
                          {src?.name ?? e.parentId}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {e.edgeType.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">incoming</span>
                    </div>
                  );
                })}
              </div>
            )}

            {outEdges.length === 0 && inEdges.length === 0 && (
              <div className="py-6 text-center">
                <ArrowRightLeft className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No edges yet</p>
              </div>
            )}

            {/* Add edge */}
            {canEdit && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Add edge
                </p>
                <select
                  className="w-full h-8 text-xs rounded-md border bg-background px-2 text-foreground"
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                >
                  <option value="">Select target team…</option>
                  {otherTeams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full h-8 text-xs rounded-md border bg-background px-2 text-foreground"
                  value={newType}
                  onChange={e => setNewType(e.target.value as EdgeType)}
                >
                  <option value="ASSIGNS_TO">ASSIGNS_TO — work routing</option>
                  <option value="REPORTS_TO">REPORTS_TO — org line</option>
                  <option value="VISIBILITY">VISIBILITY — data access</option>
                </select>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={!newTarget}
                  onClick={() => {
                    if (newTarget) {
                      onAddEdge(newTarget, newType);
                      setNewTarget('');
                    }
                  }}
                >
                  <Plus className="mr-1.5 h-3 w-3" /> Create edge
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="p-3 space-y-3">
            {/* Leadership */}
            {(lead || coLead) && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Leadership
                </p>
                {[lead, coLead].filter(Boolean).map(
                  m =>
                    m && (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-background"
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {ini(m.user.firstName, m.user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {m.user.firstName} {m.user.lastName}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {m.teamRole.replace('_', '-')}
                          </p>
                        </div>
                        {m.user.employeeId && (
                          <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                            {m.user.employeeId}
                          </span>
                        )}
                      </div>
                    )
                )}
              </div>
            )}

            {/* Members */}
            {members.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Members ({members.length})
                </p>
                {members.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[9px]">
                        {ini(m.user.firstName, m.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">
                        {m.user.firstName} {m.user.lastName}
                      </p>
                    </div>
                    {m.user.employeeId && (
                      <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                        {m.user.employeeId}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {team._count.members === 0 && (
              <div className="py-6 text-center">
                <Users className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No members</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-2.5 flex gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={() => router.push(`/teams/${team.id}`)}
        >
          Full detail <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Team Canvas
// ─────────────────────────────────────────────────────────────────────────────

interface TeamCanvasProps {
  layoutNodes: LayoutNode[];
  edges: CanvasEdge[];
  selectedId: string | null;
  onSelectNode: (id: string) => void;
  onToggleEdge: (edgeId: string, val: boolean) => void;
  canEdit: boolean;
}

export function TeamCanvas({
  layoutNodes,
  edges,
  selectedId,
  onSelectNode,
  onToggleEdge,
  canEdit,
}: TeamCanvasProps) {
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hovEdge, setHovEdge] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    layoutNodes.forEach(n => m.set(n.id, n));
    return m;
  }, [layoutNodes]);

  const edgeGroups = useMemo(() => {
    const g = new Map<string, CanvasEdge[]>();
    for (const e of edges) {
      const key = `${e.parentId}→${e.childId}`;
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(e);
    }
    return g;
  }, [edges]);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.team-node')) return;
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
    setZoom(z => Math.min(2, Math.max(0.25, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle,hsl(var(--border)/0.5)_1px,transparent_1px)] [background-size:20px_20px]"
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
    >
      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        {[
          { icon: ZoomIn, fn: () => setZoom(z => Math.min(2, z + 0.15)) },
          { icon: ZoomOut, fn: () => setZoom(z => Math.max(0.25, z - 0.15)) },
          {
            icon: Maximize2,
            fn: () => {
              setZoom(1);
              setPan({ x: 40, y: 40 });
            },
          },
        ].map(({ icon: Icon, fn }) => (
          <button
            key={fn.toString()}
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

      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          {[
            { id: 'arrow-blue', fill: '#3b82f6' },
            { id: 'arrow-purple', fill: '#8b5cf6' },
            { id: 'arrow-green', fill: '#10b981' },
            { id: 'arrow-gray', fill: '#94a3b8' },
          ].map(({ id, fill }) => (
            <marker
              key={id}
              id={id}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={fill} />
            </marker>
          ))}
        </defs>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {Array.from(edgeGroups.entries()).map(([key, grp]) => {
            const [pid, cid] = key.split('→');
            const pN = nodeMap.get(pid);
            const cN = nodeMap.get(cid);
            if (!pN || !cN) return null;

            const px = pN.x + NODE_W / 2;
            const py = pN.y + NODE_H;
            const cx = cN.x + NODE_W / 2;
            const cy = cN.y;

            return grp.map((edge, idx) => {
              const cfg = EDGE_STROKE[edge.edgeType];
              const color = edge.isActive ? cfg.active : cfg.inactive;
              const marker = edge.isActive ? `url(#arrow-${cfg.marker})` : 'url(#arrow-gray)';
              const isHov = hovEdge === edge.id;
              const offset = (idx - (grp.length - 1) / 2) * 14;
              const path = edgePath(px + offset, py, cx + offset, cy);
              const midX = px + offset;
              const midY = (py + cy) / 2;

              return (
                <g
                  key={edge.id}
                  onMouseEnter={() => setHovEdge(edge.id)}
                  onMouseLeave={() => setHovEdge(null)}
                >
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: canEdit ? 'pointer' : 'default' }}
                    onClick={() => canEdit && onToggleEdge(edge.id, !edge.isActive)}
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHov ? 2.5 : 1.5}
                    strokeDasharray={edge.isActive ? undefined : '5,4'}
                    markerEnd={marker}
                    style={{ transition: 'stroke-width 0.15s, stroke 0.15s' }}
                  />
                  {(isHov || edge.isActive) && (
                    <g>
                      <rect
                        x={midX - 22}
                        y={midY - 9}
                        width={44}
                        height={16}
                        rx={4}
                        fill={edge.isActive ? color : '#94a3b8'}
                        opacity={0.92}
                      />
                      <text
                        x={midX}
                        y={midY + 2.5}
                        textAnchor="middle"
                        fontSize={9}
                        fill="white"
                        fontWeight={500}
                        style={{ fontFamily: 'var(--font-sans)', pointerEvents: 'none' }}
                      >
                        {cfg.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            });
          })}

          {/* Nodes */}
          {layoutNodes.map(n => {
            const colors = NODE_COLOR[n.data.nodeType];
            const lead = n.data.members?.find(m => m.teamRole === 'LEAD');
            const isSelected = selectedId === n.id;

            return (
              <foreignObject
                key={n.id}
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                className="team-node"
                style={{ overflow: 'visible', cursor: 'pointer' }}
              >
                <div
                  className={cn(
                    'rounded-xl border-2 p-3 flex flex-col gap-1.5 select-none bg-card transition-all',
                    isSelected
                      ? 'border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30 scale-[1.03]'
                      : cn(colors.bg, colors.border, 'hover:shadow-md hover:scale-[1.01]'),
                    !n.data.isActive && 'opacity-50'
                  )}
                  style={{ width: NODE_W, height: NODE_H, transformOrigin: 'center' }}
                  onClick={() => onSelectNode(n.id)}
                  onDoubleClick={() => router.push(`/teams/${n.id}`)}
                >
                  {/* Top row */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-md shrink-0',
                        isSelected ? 'bg-primary/15' : 'bg-white/60 dark:bg-black/20'
                      )}
                    >
                      <Network
                        className={cn('h-3.5 w-3.5', isSelected ? 'text-primary' : colors.icon)}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-[11.5px] font-semibold truncate flex-1 leading-tight',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {n.data.name}
                    </span>
                    <span
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                        colors.badge
                      )}
                    >
                      {n.data.nodeType === 'MANAGEMENT'
                        ? 'M'
                        : n.data.nodeType === 'GROUP'
                          ? 'G'
                          : 'I'}
                    </span>
                  </div>

                  {/* Category */}
                  {n.data.category && (
                    <span
                      className={cn(
                        'self-start text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                        CAT_COLOR[n.data.category]
                      )}
                    >
                      {n.data.category}
                    </span>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px] flex items-center gap-1">
                      {lead && (
                        <>
                          <Crown className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                          {lead.user.firstName} {lead.user.lastName.charAt(0)}.
                        </>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Users className="h-2.5 w-2.5" />
                      {n.data._count.members}
                    </span>
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

// Re-export for use in page
export { QuickEditPanel };
