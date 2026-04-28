// app/(dashboard)/teams/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Network, Layers, Info, ArrowRightLeft, GitBranch, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { CanvasEdge, extractEdges, layoutTree } from '@/types/types';
import { EdgeType, TeamArcDetailResponse } from '@/types/team.types';
import { ArcSidebar } from '@/components/teams/arc-sidebar';
import { QuickEditPanel, TeamCanvas } from '@/components/teams/team-canvas';
// import { ArcSidebar } from './arc-sidebar';
// import { TeamCanvas, QuickEditPanel } from './team-canvas';
// import { layoutTree, extractEdges, CanvasEdge, EDGE_STROKE } from './types';
// import type { TeamArcDetailResponse, EdgeType } from '@/types/team.types';

// ─────────────────────────────────────────────────────────────────────────────
// Create Team Dialog
// ─────────────────────────────────────────────────────────────────────────────

function CreateTeamDialog({
  open,
  arcId,
  arcBuId,
  onClose,
  onCreated,
}: {
  open: boolean;
  arcId: string;
  arcBuId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const axios = useAxios();
  const [name, setName] = useState('');
  const [nodeType, setNodeType] = useState('GROUP');
  const [category, setCategory] = useState('DELIVERY');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setPending(true);
    setError('');
    try {
      await axios.post('/teams', {
        name: name.trim(),
        nodeType,
        category,
        teamArcId: arcId,
        businessUnitId: arcBuId,
      });
      setName('');
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add team to arc</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Team name</Label>
            <Input
              placeholder="e.g. Alpha Squad"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Node type</Label>
              <Select value={nodeType} onValueChange={setNodeType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { v: 'MANAGEMENT', label: 'Management' },
                    { v: 'GROUP', label: 'Group / Squad' },
                    { v: 'INDIVIDUAL', label: 'Individual / DM' },
                  ].map(o => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['DELIVERY', 'SALES', 'SUPPORT', 'MANAGEMENT'].map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!name.trim() || pending} onClick={submit}>
            {pending ? 'Creating…' : 'Create team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const axios = useAxios();
  const qc = useQueryClient();
  const permission = usePermission('teams');

  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [localEdges, setLocalEdges] = useState<CanvasEdge[]>([]);

  // Fetch selected arc detail
  const { data: arcDetail, isLoading: arcLoading } = useQuery<TeamArcDetailResponse>({
    queryKey: ['arc', selectedArcId],
    queryFn: async () => (await axios.get(`/teams/arcs/${selectedArcId}`)).data,
    enabled: !!selectedArcId,
  });

  // Sync edges from server → local (for optimistic toggle)
  useEffect(() => {
    if (!arcDetail?.data) return;
    setLocalEdges(extractEdges(arcDetail.data.flat));
  }, [arcDetail]);

  const flatTeams = arcDetail?.data.flat ?? [];
  const treeRoots = arcDetail?.data.tree ?? [];
  const activeArc = arcDetail?.data;
  const layoutNodes = useMemo(() => layoutTree(treeRoots), [treeRoots]);
  const selectedTeam = flatTeams.find(t => t.id === selectedNodeId) ?? null;

  // ── Toggle edge ──────────────────────────────────────────────────────────
  const toggleEdge = useMutation({
    mutationFn: async ({
      edgeId,
      isActive,
      teamId,
    }: {
      edgeId: string;
      isActive: boolean;
      teamId: string;
    }) => (await axios.patch(`/teams/${teamId}/edges/${edgeId}`, { isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arc', selectedArcId] }),
  });

  const handleToggleEdge = (edgeId: string, val: boolean) => {
    setLocalEdges(prev => prev.map(e => (e.id === edgeId ? { ...e, isActive: val } : e)));
    const edge = localEdges.find(e => e.id === edgeId);
    if (edge) toggleEdge.mutate({ edgeId, isActive: val, teamId: edge.parentId });
  };

  // ── Add edge ─────────────────────────────────────────────────────────────
  const addEdge = useMutation({
    mutationFn: async ({
      teamId,
      targetTeamId,
      edgeType,
    }: {
      teamId: string;
      targetTeamId: string;
      edgeType: EdgeType;
    }) =>
      (
        await axios.post(`/teams/${teamId}/edges`, {
          targetTeamId,
          edgeType,
          direction: 'outgoing',
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arc', selectedArcId] }),
  });

  const handleAddEdge = (targetId: string, type: EdgeType) => {
    if (!selectedNodeId) return;
    addEdge.mutate({ teamId: selectedNodeId, targetTeamId: targetId, edgeType: type });
  };

  // ── Delete edge ───────────────────────────────────────────────────────────
  const deleteEdge = useMutation({
    mutationFn: async ({ edgeId, teamId }: { edgeId: string; teamId: string }) =>
      (await axios.delete(`/teams/${teamId}/edges/${edgeId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arc', selectedArcId] }),
  });

  const handleDeleteEdge = (edgeId: string) => {
    const edge = localEdges.find(e => e.id === edgeId);
    if (!edge) return;
    setLocalEdges(prev => prev.filter(e => e.id !== edgeId));
    deleteEdge.mutate({ edgeId, teamId: edge.parentId });
  };

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* ── Left: Arc sidebar ─────────────────────────────────────────── */}
        <ArcSidebar
          selectedArcId={selectedArcId}
          onSelectArc={id => {
            setSelectedArcId(id);
            setSelectedNodeId(null);
          }}
        />

        {/* ── Center: Canvas + topbar ────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Topbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {activeArc ? (
                <>
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{activeArc.name}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0"
                  >
                    {activeArc._count?.teams ?? flatTeams.length} teams
                  </Badge>
                  {activeArc.description && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs max-w-48">
                        {activeArc.description}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select an arc</span>
              )}
            </div>

            {/* Edge legend */}
            <div className="hidden md:flex items-center gap-3 text-[10px] text-muted-foreground">
              {[
                { color: '#3b82f6', label: 'assigns', type: 'ASSIGNS_TO' },
                { color: '#8b5cf6', label: 'reports to', type: 'REPORTS_TO' },
                { color: '#10b981', label: 'sees', type: 'VISIBILITY' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className="inline-block w-4 h-0.5 rounded" style={{ background: color }} />
                  {label}
                </span>
              ))}
              <span className="w-px h-3 bg-border mx-0.5" />
              {[
                { color: 'bg-violet-100 border-violet-200', label: 'MGMT' },
                { color: 'bg-sky-100 border-sky-200', label: 'GROUP' },
                { color: 'bg-emerald-100 border-emerald-200', label: 'INDIVIDUAL' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={cn('inline-block w-3 h-3 rounded-sm border', color)} />
                  {label}
                </span>
              ))}
            </div>

            {selectedArcId && permission.canAdd && (
              <Button size="sm" className="h-8 shrink-0" onClick={() => setShowCreateTeam(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add team
              </Button>
            )}
          </div>

          {/* Canvas area */}
          <div className="flex flex-1 min-h-0 relative">
            {/* Canvas */}
            <div className="flex-1 min-w-0 relative">
              {!selectedArcId ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3 max-w-xs px-6">
                    <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm font-medium">Select an arc</p>
                    <p className="text-xs text-muted-foreground">
                      Choose a team arc from the sidebar. Each arc represents a chain of command
                      within a BU.
                    </p>
                  </div>
                </div>
              ) : arcLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <Skeleton className="h-20 w-44 mx-auto rounded-xl" />
                    <div className="flex gap-3 justify-center">
                      <Skeleton className="h-20 w-44 rounded-xl" />
                      <Skeleton className="h-20 w-44 rounded-xl" />
                    </div>
                  </div>
                </div>
              ) : flatTeams.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <Network className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm font-medium">Arc is empty</p>
                    <p className="text-xs text-muted-foreground">
                      Add a team to start building the structure
                    </p>
                    {permission.canAdd && (
                      <Button size="sm" onClick={() => setShowCreateTeam(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add first team
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <TeamCanvas
                  layoutNodes={layoutNodes}
                  edges={localEdges}
                  selectedId={selectedNodeId}
                  onSelectNode={id => setSelectedNodeId(prev => (prev === id ? null : id))}
                  onToggleEdge={handleToggleEdge}
                  canEdit={permission.canEdit === true}
                />
              )}

              {/* Hint */}
              {flatTeams.length > 0 && (
                <div className="absolute top-3 left-3 z-10 text-[10px] text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded border">
                  click to select · double-click to open detail · click edge to toggle
                </div>
              )}
            </div>

            {/* Quick edit panel */}
            {selectedTeam && (
              <QuickEditPanel
                team={selectedTeam}
                edges={localEdges}
                allTeams={flatTeams}
                arcId={selectedArcId!}
                onClose={() => setSelectedNodeId(null)}
                onToggleEdge={handleToggleEdge}
                onDeleteEdge={handleDeleteEdge}
                onAddEdge={handleAddEdge}
                canEdit={permission.canEdit === true}
              />
            )}
          </div>
        </div>

        {/* Create team dialog */}
        {showCreateTeam && selectedArcId && activeArc && (
          <CreateTeamDialog
            open
            arcId={selectedArcId}
            arcBuId={activeArc.businessUnit?.id ?? ''}
            onClose={() => setShowCreateTeam(false)}
            onCreated={() => qc.invalidateQueries({ queryKey: ['arc', selectedArcId] })}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
