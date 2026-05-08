'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Users,
  Briefcase,
  Send,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  MapPin,
  Building2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  reportingToId: string | null;
  teamLeadId: string | null;
  phone: string | null;
  workingLocation: string | null;
  dateOfJoin: string | null;
  isActive: boolean;
  depth: number;
  role: { id: string; name: string };
  department: { id: string; name: string } | null;
  stats: {
    activeReqs: number;
    totalSubmissions: number;
    totalInterviews: number;
    totalFilled: number;
    totalAllocated: number;
    requirementsCreated: number;
    clientSpocs: {
      handlerId: string;
      isPrimary: boolean;
      client: { id: string; name: string };
      serviceLine: { id: string; name: string };
    }[];
  };
  children: TreeNode[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];

function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

// ─── Node Card ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: TreeNode;
  isRoot?: boolean;
  onNavigate: (id: string) => void;
}

function NodeCard({ node, isRoot = false, onNavigate }: NodeCardProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const descendantCount = countDescendants(node);

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`
          relative w-64 rounded-xl border bg-card shadow-sm transition-all
          hover:shadow-md hover:border-primary/30
          ${isRoot ? 'ring-2 ring-primary/20 shadow-md' : ''}
          ${!node.isActive ? 'opacity-60' : ''}
        `}
      >
        {/* Depth indicator stripe */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
            node.depth === 0
              ? 'bg-primary'
              : node.depth === 1
                ? 'bg-violet-400'
                : node.depth === 2
                  ? 'bg-emerald-400'
                  : 'bg-slate-300'
          }`}
        />

        <div className="pl-4 pr-3 py-3">
          {/* Header row */}
          <div className="flex items-start gap-2.5">
            <Avatar className="h-9 w-9 shrink-0 mt-0.5">
              <AvatarFallback className={`text-xs font-bold ${avatarColor(node.id)}`}>
                {initials(node.firstName, node.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <button
                className="text-sm font-semibold leading-tight hover:text-primary transition-colors text-left truncate w-full"
                onClick={() => onNavigate(node.id)}
              >
                {node.firstName} {node.lastName}
              </button>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {node.role.name.replace(/_/g, ' ')}
              </p>
              {node.employeeId && (
                <p className="text-[10px] text-muted-foreground/60">#{node.employeeId}</p>
              )}
            </div>

            {!node.isActive && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">
                Off
              </Badge>
            )}
          </div>

          {/* Meta */}
          <div className="mt-2.5 flex flex-col gap-1">
            {node.department && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{node.department.name}</span>
              </div>
            )}
            {node.workingLocation && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{node.workingLocation}</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          {(node.stats.activeReqs > 0 ||
            node.stats.totalSubmissions > 0 ||
            node.stats.totalFilled > 0) && (
            <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-lg bg-muted/40 px-2 py-1.5">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs font-semibold">{node.stats.activeReqs}</span>
                <span className="text-[9px] text-muted-foreground">Reqs</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 border-x">
                <span className="text-xs font-semibold">{node.stats.totalSubmissions}</span>
                <span className="text-[9px] text-muted-foreground">Subs</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs font-semibold">{node.stats.totalFilled}</span>
                <span className="text-[9px] text-muted-foreground">Filled</span>
              </div>
            </div>
          )}
        </div>

        {/* Expand/collapse footer */}
        {hasChildren && (
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-full border-t flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors rounded-b-xl"
          >
            {expanded ? (
              <>
                <ChevronDown className="h-3 w-3" />
                Collapse ({descendantCount})
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3" />
                {node.children.length} direct · {descendantCount} total
              </>
            )}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="flex flex-col items-center">
          {/* Vertical connector from card to horizontal bar */}
          <div className="w-px h-6 bg-border" />

          {node.children.length === 1 ? (
            /* Single child — straight line */
            <div className="flex flex-col items-center">
              <div className="w-px h-0 bg-border" />
              <NodeCard node={node.children[0]} onNavigate={onNavigate} />
            </div>
          ) : (
            /* Multiple children — branching */
            <div className="flex flex-col items-center w-full">
              {/* Horizontal bar */}
              <div className="relative flex items-start">
                {node.children.map((child, i) => (
                  <div key={child.id} className="flex flex-col items-center px-4">
                    {/* Vertical drop to child */}
                    <div className="w-px h-6 bg-border" />
                    <NodeCard node={child} onNavigate={onNavigate} />
                  </div>
                ))}
                {/* Horizontal connector line spanning all children */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border"
                  style={{
                    width: `calc(100% - ${node.children.length > 1 ? '128px' : '0px'})`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function treeSummary(node: TreeNode): {
  people: number;
  reqs: number;
  submissions: number;
  filled: number;
} {
  const s = {
    people: 1,
    reqs: node.stats.activeReqs,
    submissions: node.stats.totalSubmissions,
    filled: node.stats.totalFilled,
  };
  node.children.forEach(c => {
    const cs = treeSummary(c);
    s.people += cs.people;
    s.reqs += cs.reqs;
    s.submissions += cs.submissions;
    s.filled += cs.filled;
  });
  return s;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserTreePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();

  const [zoom, setZoom] = useState(1);

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: TreeNode }>({
    queryKey: ['user-tree', id],
    queryFn: async () => {
      const res = await axios.get(`/users/${id}/tree`);
      return res.data;
    },
    enabled: !!id,
  });

  const handleNavigate = useCallback(
    (userId: string) => {
      router.push(`/users/${userId}`);
    },
    [router]
  );

  const zoomIn = () => setZoom(z => Math.min(z + 0.1, 1.5));
  const zoomOut = () => setZoom(z => Math.max(z - 0.1, 0.4));
  const reset = () => setZoom(1);

  if (isLoading) return <TreeSkeleton />;

  if (isError || !data?.data)
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <p className="text-sm text-muted-foreground">Failed to load org tree.</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );

  const root = data.data;
  const summary = treeSummary(root);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-6 py-3 shrink-0 bg-background z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/users/${id}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {root.firstName} {root.lastName}
          </button>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Network className="h-4 w-4" />
            <span className="text-sm font-medium">Org Tree</span>
          </div>
        </div>

        {/* Summary strip */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{summary.people}</span>
            <span>people</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{summary.reqs}</span>
            <span>active reqs</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Send className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{summary.submissions}</span>
            <span>submissions</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{summary.filled}</span>
            <span>filled</span>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={zoomOut}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={reset}
            className="px-2 text-xs text-muted-foreground hover:text-foreground transition-colors min-w-[3rem] text-center"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={zoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 ml-1"
            onClick={reset}
            title="Reset zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-muted/20">
        {/* Dot grid background */}
        <div
          className="min-w-full min-h-full"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div
            className="flex justify-center pt-10 pb-20 px-10 origin-top transition-transform"
            style={{ transform: `scale(${zoom})` }}
          >
            <NodeCard node={root} isRoot onNavigate={handleNavigate} />
          </div>
        </div>
      </div>

      {/* ── Depth legend ────────────────────────────────────────────────── */}
      <div className="border-t px-6 py-2 flex items-center gap-6 text-[11px] text-muted-foreground bg-background shrink-0">
        <span className="font-medium">Depth:</span>
        {[
          { depth: 0, label: 'Root', color: 'bg-primary' },
          { depth: 1, label: 'L1', color: 'bg-violet-400' },
          { depth: 2, label: 'L2', color: 'bg-emerald-400' },
          { depth: 3, label: 'L3+', color: 'bg-slate-300' },
        ].map(d => (
          <div key={d.depth} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-1 rounded-full ${d.color}`} />
            <span>{d.label}</span>
          </div>
        ))}
        <span className="ml-auto">Click a name to open their profile</span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TreeSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-6 py-3 flex items-center gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex-1 flex justify-center pt-10 overflow-auto">
        <div className="flex flex-col items-center gap-6">
          <Skeleton className="h-36 w-64 rounded-xl" />
          <div className="flex gap-8">
            <Skeleton className="h-36 w-64 rounded-xl" />
            <Skeleton className="h-36 w-64 rounded-xl" />
            <Skeleton className="h-36 w-64 rounded-xl" />
          </div>
          <div className="flex gap-8">
            <Skeleton className="h-36 w-64 rounded-xl" />
            <Skeleton className="h-36 w-64 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
