// File: PipelineStagesClient.tsx
// Path: src/app/(dashboard)/settings/pipeline-stages/PipelineStagesClient.tsx

'use client';

import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Plus, Trash2, Check, X, RotateCcw, Save, Pencil, Globe } from 'lucide-react';
import { useServiceLines } from '@/hooks/useServiceLines';
import {
  usePipelineStages,
  useSaveStages,
  PipelineStage,
  CanonicalStage,
  CANONICAL_STAGES,
} from './usePipelineStages';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// types
// ─────────────────────────────────────────────────────────────────────────────

type LocalStage = PipelineStage & { isNew?: boolean };

// stages grouped by order — each entry is one or more variants
type OrderGroup = { order: number; stages: LocalStage[] };

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function groupByOrder(stages: LocalStage[]): OrderGroup[] {
  const map = new Map<number, LocalStage[]>();
  for (const s of stages) {
    const existing = map.get(s.order) ?? [];
    existing.push(s);
    map.set(s.order, existing);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([order, stages]) => ({ order, stages }));
}

// rebuild order numbers after any structural change
// each group keeps its relative position; variants within a group keep same order
function recomputeOrders(groups: OrderGroup[]): LocalStage[] {
  return groups.flatMap((g, i) => g.stages.map(s => ({ ...s, order: i + 1 })));
}

function newTempId() {
  return `__new__${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const SLOT_COLORS = [
  'bg-slate-100 text-slate-700 border-slate-300',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-green-50 text-green-700 border-green-200',
];

// ─────────────────────────────────────────────────────────────────────────────
// insert row — shown between groups or at end
// ─────────────────────────────────────────────────────────────────────────────

type InsertTarget =
  | { type: 'between'; afterGroupIdx: number } // new standalone group
  | { type: 'variant'; groupIdx: number } // new variant in existing group
  | { type: 'end' }; // append at end

function InsertRow({
  target,
  serviceLines,
  onCommit,
  onCancel,
}: {
  target: InsertTarget;
  serviceLines: { id: string; name: string }[];
  onCommit: (label: string, code: string, serviceLineId: string | null) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [serviceLineId, setServiceLineId] = useState<string | null>(null);

  const commit = () => {
    if (!label.trim()) {
      onCancel();
      return;
    }
    onCommit(label.trim(), code.trim(), serviceLineId);
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 my-1 border border-dashed border-blue-300 rounded-lg bg-blue-50/60">
      <Input
        autoFocus
        placeholder="Stage label"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
        className="h-7 text-sm flex-1 bg-white min-w-0"
      />
      <Input
        placeholder="Code"
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
        className="h-7 text-sm w-20 bg-white font-mono shrink-0"
      />
      <Select
        value={serviceLineId ?? '__universal__'}
        onValueChange={v => setServiceLineId(v === '__universal__' ? null : v)}
      >
        <SelectTrigger className="h-7 text-xs w-32 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__universal__">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> Universal
            </span>
          </SelectItem>
          {serviceLines.map(sl => (
            <SelectItem key={sl.id} value={sl.id}>
              {sl.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button onClick={commit} className="text-green-600 shrink-0">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onCancel} className="text-muted-foreground shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// trigger button shown between groups on hover
// ─────────────────────────────────────────────────────────────────────────────

function InsertTrigger({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="group/insert flex items-center h-5 my-0.5">
      <button
        onClick={onClick}
        className="w-full flex items-center gap-1.5 opacity-0 group-hover/insert:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-blue-500"
      >
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-1 bg-background border rounded-full px-2 py-0.5">
          <Plus className="h-2.5 w-2.5" />
          <span>{label}</span>
        </div>
        <div className="flex-1 h-px bg-border" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// single stage row
// ─────────────────────────────────────────────────────────────────────────────

function StageRow({
  stage,
  groupOrder,
  isVariant,
  isDirty,
  originalStages,
  serviceLines,
  onLabelChange,
  onCodeChange,
  onCanonicalChange,
  onServiceLineChange,
  onToggle,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragEnd,
  isDragOver,
}: {
  stage: LocalStage;
  groupOrder: number;
  isVariant: boolean;
  isDirty: boolean;
  originalStages: PipelineStage[];
  serviceLines: { id: string; name: string }[];
  onLabelChange: (id: string, label: string) => void;
  onCodeChange: (id: string, code: string) => void;
  onCanonicalChange: (id: string, val: CanonicalStage | null) => void;
  onServiceLineChange: (id: string, val: string | null) => void;
  onToggle: (id: string, val: boolean) => void;
  onDelete: (stage: LocalStage) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [editLabel, setEditLabel] = useState(stage.label);
  const [editCode, setEditCode] = useState(stage.code);

  const orig = originalStages.find(s => s.id === stage.id);
  const isMoved = !stage.isNew && orig !== undefined && orig.order !== stage.order;
  const col = SLOT_COLORS[(groupOrder - 1) % SLOT_COLORS.length];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 transition-all select-none',
        isVariant && 'border-t border-amber-100',
        isDragOver && 'bg-primary/5 border-primary',
        stage.isNew && 'bg-blue-50',
        isMoved && !stage.isNew && 'bg-amber-50/40',
        !stage.isActive && 'opacity-40'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab shrink-0" />

      {/* Order badge — only on first variant */}
      {!isVariant && (
        <span
          className={cn(
            'shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 rounded border min-w-[2rem] text-center',
            col
          )}
        >
          {groupOrder}
        </span>
      )}
      {isVariant && <span className="shrink-0 w-[2.25rem]" />}

      {/* Code — inline editable */}
      <div className="shrink-0 w-16">
        {editingCode ? (
          <Input
            autoFocus
            value={editCode}
            onChange={e => setEditCode(e.target.value)}
            onBlur={() => {
              onCodeChange(stage.id, editCode);
              setEditingCode(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                onCodeChange(stage.id, editCode);
                setEditingCode(false);
              }
            }}
            className="h-6 text-xs px-1.5 font-mono w-full"
          />
        ) : (
          <button
            onClick={() => {
              setEditCode(stage.code);
              setEditingCode(true);
            }}
            className="text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded w-full text-left truncate"
          >
            {stage.code || <span className="text-muted-foreground/40 italic">code</span>}
          </button>
        )}
      </div>

      {/* Label — inline editable */}
      <div className="flex-1 min-w-0">
        {editingLabel ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              onBlur={() => {
                onLabelChange(stage.id, editLabel);
                setEditingLabel(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onLabelChange(stage.id, editLabel);
                  setEditingLabel(false);
                }
                if (e.key === 'Escape') setEditingLabel(false);
              }}
              className="h-7 text-sm py-0 px-2"
            />
            <button
              onClick={() => {
                onLabelChange(stage.id, editLabel);
                setEditingLabel(false);
              }}
              className="text-green-600 shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setEditingLabel(false)}
              className="text-muted-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group/label min-w-0">
            <span
              className={cn(
                'text-sm font-medium truncate',
                !stage.isActive && 'line-through text-muted-foreground'
              )}
            >
              {stage.label}
            </span>
            <button
              onClick={() => {
                setEditLabel(stage.label);
                setEditingLabel(true);
              }}
              className="opacity-0 group-hover/label:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Service line */}
      <div className="shrink-0 w-28">
        <Select
          value={stage.serviceLineId ?? '__universal__'}
          onValueChange={v => onServiceLineChange(stage.id, v === '__universal__' ? null : v)}
        >
          <SelectTrigger className="h-7 text-xs px-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__universal__">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Universal
              </span>
            </SelectItem>
            {serviceLines.map(sl => (
              <SelectItem key={sl.id} value={sl.id}>
                {sl.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Canonical */}
      <div className="shrink-0 w-28">
        <Select
          value={stage.canonicalStage ?? '__none__'}
          onValueChange={v =>
            onCanonicalChange(stage.id, v === '__none__' ? null : (v as CanonicalStage))
          }
        >
          <SelectTrigger className="h-7 text-xs px-2 w-full">
            <SelectValue placeholder="Map to…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-muted-foreground">Unmapped</span>
            </SelectItem>
            {CANONICAL_STAGES.map(cs => (
              <SelectItem key={cs.value} value={cs.value}>
                {cs.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Badges */}
      <div className="shrink-0 flex items-center gap-1">
        {stage.isTerminal && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200"
          >
            Terminal
          </Badge>
        )}
        {!stage.isMandatory && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
            Optional
          </Badge>
        )}
        {stage.isNew && (
          <Badge className="text-[10px] px-1.5 py-0 bg-blue-500 text-white border-0">New</Badge>
        )}
        {isMoved && !stage.isNew && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300"
          >
            Moved
          </Badge>
        )}
      </div>

      {/* Active toggle */}
      <Switch
        checked={stage.isActive}
        onCheckedChange={v => onToggle(stage.id, v)}
        className="data-[state=checked]:bg-emerald-500 shrink-0"
      />

      {/* Delete */}
      <button
        onClick={() => onDelete(stage)}
        className={cn(
          'shrink-0 transition-colors p-0.5 rounded',
          stage.isNew
            ? 'text-destructive/70 hover:text-destructive hover:bg-destructive/10'
            : 'text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10'
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// main client
// ─────────────────────────────────────────────────────────────────────────────

export default function PipelineStagesClient() {
  const { data: serverStages = [], isLoading } = usePipelineStages();
  const { data: serviceLines = [] } = useServiceLines();
  const saveStages = useSaveStages();

  const [local, setLocal] = useState<LocalStage[] | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);

  const stages: LocalStage[] = local ?? serverStages;
  const isDirty = local !== null || deletedIds.length > 0;
  const groups = groupByOrder(stages);

  // drag state — track by stage id
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // ── mutators
  const patchStages = (updater: (prev: LocalStage[]) => LocalStage[]) => {
    setLocal(prev => updater(prev ?? serverStages));
  };

  const patchStage = (id: string, patch: Partial<LocalStage>) => {
    patchStages(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  // ── drag — individual stage drag, drop onto another stage
  const onDragStart = (id: string) => {
    dragId.current = id;
  };
  const onDragEnter = (id: string) => {
    dragOverId.current = id;
    setDragOverStageId(id);
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const onDragEnd = () => {
    setDragOverStageId(null);
    const fromId = dragId.current;
    const toId = dragOverId.current;
    dragId.current = null;
    dragOverId.current = null;
    if (!fromId || !toId || fromId === toId) return;

    const currentStages = local ?? serverStages;
    const fromStage = currentStages.find(s => s.id === fromId);
    const toStage = currentStages.find(s => s.id === toId);
    if (!fromStage || !toStage) return;

    // rebuild groups, move fromStage to toStage's group position
    const currentGroups = groupByOrder(currentStages);

    // remove fromStage from its current group
    const withoutFrom = currentGroups
      .map(g => ({
        ...g,
        stages: g.stages.filter(s => s.id !== fromId),
      }))
      .filter(g => g.stages.length > 0);

    // find target group index in withoutFrom
    const targetGroupIdx = withoutFrom.findIndex(g => g.stages.some(s => s.id === toId));
    if (targetGroupIdx === -1) return;

    // insert fromStage into target group (as variant)
    const newGroups = withoutFrom.map((g, i) =>
      i === targetGroupIdx
        ? { ...g, stages: [...g.stages, { ...fromStage, order: g.stages[0]!.order }] }
        : g
    );

    setLocal(recomputeOrders(newGroups));
  };

  // ── insert
  const commitInsert = (
    label: string,
    code: string,
    serviceLineId: string | null,
    target: InsertTarget
  ) => {
    const newStage: LocalStage = {
      id: newTempId(),
      code,
      label,
      order: 0, // recomputed below
      isMandatory: true,
      isTerminal: false,
      isActive: true,
      canonicalStage: null,
      serviceLineId,
      serviceLine: serviceLines.find(sl => sl.id === serviceLineId) ?? null,
      isNew: true,
    };

    const currentGroups = groupByOrder(local ?? serverStages);

    let newGroups: OrderGroup[];

    if (target.type === 'between') {
      // insert new group after afterGroupIdx
      const insertAfter = target.afterGroupIdx;
      newGroups = [
        ...currentGroups.slice(0, insertAfter + 1),
        { order: 0, stages: [newStage] },
        ...currentGroups.slice(insertAfter + 1),
      ];
    } else if (target.type === 'variant') {
      // add as variant in existing group
      newGroups = currentGroups.map((g, i) =>
        i === target.groupIdx ? { ...g, stages: [...g.stages, newStage] } : g
      );
    } else {
      // append at end
      newGroups = [...currentGroups, { order: 0, stages: [newStage] }];
    }

    setLocal(recomputeOrders(newGroups));
    setInsertTarget(null);
  };

  // ── delete
  const handleDelete = (stage: LocalStage) => {
    if (!stage.isNew) setDeletedIds(prev => [...prev, stage.id]);
    patchStages(prev => {
      const next = prev.filter(s => s.id !== stage.id);
      return recomputeOrders(groupByOrder(next));
    });
  };

  // ── discard
  const handleDiscard = () => {
    setLocal(null);
    setDeletedIds([]);
    setInsertTarget(null);
  };

  // ── save
  const handleSave = async () => {
    if (!isDirty) return;
    await saveStages.mutateAsync({
      deletedIds,
      stages: stages.map(s => ({
        ...(s.isNew ? {} : { id: s.id }),
        code: s.code,
        label: s.label,
        order: s.order,
        isMandatory: s.isMandatory,
        isTerminal: s.isTerminal,
        isActive: s.isActive,
        isNew: s.isNew ?? false,
        canonicalStage: s.canonicalStage,
        serviceLineId: s.serviceLineId,
      })),
    });
    setLocal(null);
    setDeletedIds([]);
  };

  const isSaving = saveStages.isPending;

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 pt-5 pb-0 border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pipeline stages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Drag to reorder · same order = service-line variant · universal applies to all
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <>
                <Button variant="outline" size="sm" onClick={handleDiscard} disabled={isSaving}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="h-3 w-3 mr-1" />
                  {isSaving ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 px-3 pb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          <span className="w-4 shrink-0" />
          <span className="w-[2.25rem] shrink-0">#</span>
          <span className="w-16 shrink-0">Code</span>
          <span className="flex-1">Label</span>
          <span className="w-28 shrink-0">Service line</span>
          <span className="w-28 shrink-0">Maps to</span>
          <span className="w-20 shrink-0">Badges</span>
          <span className="w-10 shrink-0">Active</span>
          <span className="w-5 shrink-0" />
        </div>
      </div>

      {/* Dirty banner */}
      {isDirty && (
        <div className="flex-none flex items-center gap-2 px-6 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          Live preview — <strong>blue</strong> = new · <strong>amber</strong> = moved/variant
          change. Nothing saved yet.
        </div>
      )}

      {/* Stage list */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
        <div className="max-w-5xl space-y-0">
          {groups.map((group, groupIdx) => {
            const isVariantGroup = group.stages.length > 1;
            const col = SLOT_COLORS[(group.order - 1) % SLOT_COLORS.length];

            return (
              <div key={`group-${group.order}-${groupIdx}`}>
                {/* Insert between trigger */}
                {insertTarget?.type === 'between' && insertTarget.afterGroupIdx === groupIdx - 1 ? (
                  <InsertRow
                    target={insertTarget}
                    serviceLines={serviceLines}
                    onCommit={(label, code, slId) => commitInsert(label, code, slId, insertTarget)}
                    onCancel={() => setInsertTarget(null)}
                  />
                ) : groupIdx === 0 ? (
                  <InsertTrigger
                    label="insert at start"
                    onClick={() => setInsertTarget({ type: 'between', afterGroupIdx: -1 })}
                  />
                ) : (
                  <InsertTrigger
                    label="insert between"
                    onClick={() =>
                      setInsertTarget({ type: 'between', afterGroupIdx: groupIdx - 1 })
                    }
                  />
                )}

                {/* Group card */}
                <div
                  className={cn(
                    'rounded-lg border overflow-hidden',
                    isVariantGroup ? 'border-amber-200' : 'border-border'
                  )}
                >
                  {/* Variant header */}
                  {isVariantGroup && (
                    <div className="flex items-center justify-between px-4 py-1 bg-amber-50 border-b border-amber-200">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-xs font-mono font-bold px-1.5 py-0.5 rounded border',
                            col
                          )}
                        >
                          {group.order}
                        </span>
                        <span className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">
                          Order {group.order} — {group.stages.length} service-line variants
                        </span>
                      </div>
                      <button
                        onClick={() => setInsertTarget({ type: 'variant', groupIdx })}
                        className="text-[10px] text-amber-600 hover:text-amber-800 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> add variant
                      </button>
                    </div>
                  )}

                  {/* Insert variant row */}
                  {insertTarget?.type === 'variant' && insertTarget.groupIdx === groupIdx && (
                    <InsertRow
                      target={insertTarget}
                      serviceLines={serviceLines}
                      onCommit={(label, code, slId) =>
                        commitInsert(label, code, slId, insertTarget)
                      }
                      onCancel={() => setInsertTarget(null)}
                    />
                  )}

                  {/* Stage rows */}
                  {group.stages.map((stage, stageIdx) => (
                    <StageRow
                      key={stage.id}
                      stage={stage}
                      groupOrder={group.order}
                      isVariant={stageIdx > 0}
                      isDirty={isDirty}
                      originalStages={serverStages}
                      serviceLines={serviceLines}
                      onLabelChange={(id, label) => patchStage(id, { label })}
                      onCodeChange={(id, code) => patchStage(id, { code })}
                      onCanonicalChange={(id, val) => patchStage(id, { canonicalStage: val })}
                      onServiceLineChange={(id, val) => {
                        const sl = serviceLines.find(s => s.id === val) ?? null;
                        patchStage(id, {
                          serviceLineId: val,
                          serviceLine: sl,
                        });
                      }}
                      onToggle={(id, val) => patchStage(id, { isActive: val })}
                      onDelete={handleDelete}
                      onDragStart={() => onDragStart(stage.id)}
                      onDragEnter={() => onDragEnter(stage.id)}
                      onDragOver={onDragOver}
                      onDragEnd={onDragEnd}
                      isDragOver={dragOverStageId === stage.id}
                    />
                  ))}

                  {/* Add variant button — single stage groups show it on hover */}
                  {!isVariantGroup && insertTarget?.type !== 'variant' && (
                    <div className="group/addvariant">
                      <button
                        onClick={() => setInsertTarget({ type: 'variant', groupIdx })}
                        className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-muted-foreground/0 group-hover/addvariant:text-muted-foreground hover:text-blue-500 transition-colors border-t border-dashed border-transparent group-hover/addvariant:border-border"
                      >
                        <Plus className="h-2.5 w-2.5" /> add service-line variant
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Trailing insert */}
          {insertTarget?.type === 'end' ||
          (insertTarget?.type === 'between' && insertTarget.afterGroupIdx === groups.length - 1) ? (
            <InsertRow
              target={{ type: 'end' }}
              serviceLines={serviceLines}
              onCommit={(label, code, slId) => commitInsert(label, code, slId, { type: 'end' })}
              onCancel={() => setInsertTarget(null)}
            />
          ) : (
            <InsertTrigger label="append at end" onClick={() => setInsertTarget({ type: 'end' })} />
          )}

          {groups.length === 0 && !insertTarget && (
            <div className="flex flex-col items-center justify-center py-20 border rounded-lg border-dashed">
              <p className="text-sm text-muted-foreground">No pipeline stages yet</p>
              <Button
                variant="link"
                size="sm"
                className="mt-1"
                onClick={() => setInsertTarget({ type: 'end' })}
              >
                Add first stage
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
