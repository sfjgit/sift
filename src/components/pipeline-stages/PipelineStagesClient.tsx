/* eslint-disable react/no-unescaped-entities */
'use client';

// File: PipelineStagesClient.tsx
// Path: src/app/(dashboard)/settings/pipeline-stages/PipelineStagesClient.tsx

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { GripVertical, Plus, Trash2, Check, X, RotateCcw, Save, Pencil } from 'lucide-react';
import {
  usePipelineStages,
  useSaveStages,
  PipelineStage,
  CanonicalStage,
} from './usePipelineStages';
import { useAxios } from '@/hooks/useAxios';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

// Widen PipelineStage with the new flags + existing optional fields.
// Update usePipelineStages.ts to include isSourced + isNearTerminal too.
type LocalStage = PipelineStage & {
  isNew?: boolean;
  isStandard?: boolean;
  isSourced?: boolean; // ← NEW: entry/sourcing stage — skipped in active pipeline counts
  isNearTerminal?: boolean; // ← NEW: 80-90% confirmed, pre-placed stage
  serviceLineId?: string | null;
  serviceLine?: ServiceLineMeta | null;
};

interface CanonicalStageMeta {
  value: string;
  label: string;
}

interface ServiceLineMeta {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function newTempId() {
  return `__new__${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function toCanonicalLabel(key: string): string {
  return key
    .split('_')
    .map((w: string) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
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

const NONE = '__none__';
const COMMON = '__common__';

// ─────────────────────────────────────────────────────────────────────────────
// FLAG CHIP — compact clickable toggle
// ─────────────────────────────────────────────────────────────────────────────

function FlagChip({
  active,
  activeClass,
  label,
  title,
  onClick,
}: {
  active: boolean;
  activeClass: string;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'text-[10px] leading-none px-1.5 py-1 rounded border transition-colors shrink-0',
        active
          ? activeClass
          : 'text-muted-foreground/40 border-transparent hover:border-border hover:text-muted-foreground'
      )}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLAG RULES — mutual exclusivity helpers
//
// isSourced    → can't also be isTerminal or isNearTerminal
// isTerminal   → can't also be isSourced or isNearTerminal
// isNearTerminal → can't also be isSourced or isTerminal
// pipeline=false (exit stage) → can't be isSourced or isTerminal
// ─────────────────────────────────────────────────────────────────────────────

function applySourcedToggle(stage: LocalStage, val: boolean): Partial<LocalStage> {
  if (!val) return { isSourced: false };
  // Turning on sourced — clear anything incompatible
  return {
    isSourced: true,
    isTerminal: false,
    isNearTerminal: false,
    // Keep pipeline=true — sourced is still part of the flow, just skipped in counts
  };
}

function applyTerminalToggle(stage: LocalStage, val: boolean): Partial<LocalStage> {
  if (!val) return { isTerminal: false };
  return {
    isTerminal: true,
    isSourced: false,
    isNearTerminal: false,
  };
}

function applyNearTerminalToggle(stage: LocalStage, val: boolean): Partial<LocalStage> {
  if (!val) return { isNearTerminal: false };
  return {
    isNearTerminal: true,
    isSourced: false,
    isTerminal: false,
  };
}

function applyPipelineToggle(stage: LocalStage, val: boolean): Partial<LocalStage> {
  // @ts-expect-error errr
  if (val) return { pipeline: true };
  // pipeline=false = exit stage — clear positive flags
  return {
    // @ts-expect-error errr
    pipeline: false,
    isTerminal: false,
    isSourced: false,
    isNearTerminal: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INSERT ROW
// ─────────────────────────────────────────────────────────────────────────────

function InsertRow({
  onCommit,
  onCancel,
}: {
  onCommit: (label: string, code: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');

  const commit = () => {
    if (!label.trim()) {
      onCancel();
      return;
    }
    onCommit(label.trim(), code.trim());
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
        placeholder="Code e.g. 07A"
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
        className="h-7 text-sm w-24 bg-white font-mono shrink-0"
      />
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
// INSERT TRIGGER
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
// STAGE ROW
// ─────────────────────────────────────────────────────────────────────────────

function StageRow({
  stage,
  idx,
  originalStages,
  canonicalStages,
  serviceLines,
  onPatch,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragEnd,
  isDragOver,
}: {
  stage: LocalStage;
  idx: number;
  originalStages: PipelineStage[];
  canonicalStages: CanonicalStageMeta[];
  serviceLines: ServiceLineMeta[];
  onPatch: (id: string, patch: Partial<LocalStage>) => void;
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
  const col = SLOT_COLORS[idx % SLOT_COLORS.length];

  // Derive a short description of what this stage "is" for the tooltip hint
  const stageKind = stage.isSourced
    ? 'Sourced — entry stage, excluded from active pipeline counts'
    : stage.isTerminal
      ? 'Terminal — good outcome, candidate is placed'
      : stage.isNearTerminal
        ? 'Near terminal — 80-90% confirmed, counts as near-placed'
        : // @ts-expect-error errr
          !stage.pipeline
          ? 'Exit — candidate fell out of pipeline (rejected / withdrawn)'
          : 'Active pipeline stage';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all select-none',
        !stage.isNew && !isMoved && 'bg-background border-border',
        stage.isNew && 'bg-blue-50 border-blue-300',
        isMoved && !stage.isNew && 'bg-amber-50/40 border-amber-200',
        isDragOver && 'border-primary scale-[1.005] bg-primary/5',
        !stage.isActive && 'opacity-40',
        // Visual hint for stage kind
        stage.isSourced && 'border-l-4 border-l-slate-300',
        stage.isTerminal && !stage.isNew && 'border-l-4 border-l-emerald-400',
        stage.isNearTerminal && !stage.isNew && 'border-l-4 border-l-teal-400',
        // @ts-expect-error errr
        !stage.pipeline && !stage.isNew && 'border-l-4 border-l-red-300'
      )}
      title={stageKind}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab shrink-0" />

      {/* Order badge */}
      <span
        className={cn(
          'shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 rounded border min-w-[2rem] text-center',
          col
        )}
      >
        {idx + 1}
      </span>

      {/* Code — inline editable */}
      <div className="shrink-0 w-16">
        {editingCode ? (
          <Input
            autoFocus
            value={editCode}
            onChange={e => setEditCode(e.target.value)}
            onBlur={() => {
              onPatch(stage.id, { code: editCode });
              setEditingCode(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                onPatch(stage.id, { code: editCode });
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
                onPatch(stage.id, { label: editLabel });
                setEditingLabel(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onPatch(stage.id, { label: editLabel });
                  setEditingLabel(false);
                }
                if (e.key === 'Escape') setEditingLabel(false);
              }}
              className="h-7 text-sm py-0 px-2"
            />
            <button
              onClick={() => {
                onPatch(stage.id, { label: editLabel });
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
      <div className="shrink-0 w-36">
        <Select
          value={stage.serviceLineId ?? COMMON}
          onValueChange={v => onPatch(stage.id, { serviceLineId: v === COMMON ? null : v })}
        >
          <SelectTrigger
            className={cn(
              'h-7 text-xs px-2 w-full',
              stage.serviceLineId
                ? 'border-teal-300 bg-teal-50/60 text-teal-800'
                : 'text-muted-foreground'
            )}
          >
            <SelectValue placeholder="Service line" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={COMMON}>
              <span className="text-muted-foreground">Common (all lines)</span>
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
      <div className="shrink-0 w-32">
        <Select
          value={stage.canonicalStage ?? NONE}
          onValueChange={v =>
            onPatch(stage.id, { canonicalStage: v === NONE ? null : (v as CanonicalStage) })
          }
        >
          <SelectTrigger className="h-7 text-xs px-2 w-full">
            <SelectValue placeholder="Map to…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>
              <span className="text-muted-foreground">Unmapped</span>
            </SelectItem>
            {canonicalStages.map(cs => (
              <SelectItem key={cs.value} value={cs.value}>
                {cs.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── FLAGS ──────────────────────────────────────────────────────────────
          Layout (left → right):
          Standard | Sourced | Pipeline | NearTerminal | Terminal | Required
          
          Standard    — appears in the "standard only" filter set
          Sourced     — entry stage, skip in active pipeline counts
          Pipeline    — part of the flow (false = exit/rejection stage)
          NearTerminal— 80-90% confident pre-placed
          Terminal    — good outcome = placed
          Required    — mandatory step in flow
          
          Mutual exclusions enforced via applyXxxToggle helpers above.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 w-[300px]">
        <FlagChip
          active={!!stage.isStandard}
          activeClass="bg-indigo-50 text-indigo-700 border-indigo-200"
          label="Std"
          title="Standard stage — included in the standard-only filter set"
          onClick={() => onPatch(stage.id, { isStandard: !stage.isStandard })}
        />

        <FlagChip
          active={!!stage.isSourced}
          activeClass="bg-slate-100 text-slate-700 border-slate-400"
          label="Sourced"
          title="Entry/sourcing stage — tracked separately, excluded from active pipeline counts"
          onClick={() => onPatch(stage.id, applySourcedToggle(stage, !stage.isSourced))}
        />

        <FlagChip
          // @ts-expect-error errr
          active={!!stage.pipeline}
          activeClass="bg-blue-50 text-blue-700 border-blue-300"
          label="Pipeline"
          title="Part of the active recruitment flow. Turn OFF for exit stages (rejected, withdrawn) — they exist but are out of the league"
          // @ts-expect-error errr
          onClick={() => onPatch(stage.id, applyPipelineToggle(stage, !stage.pipeline))}
        />

        <FlagChip
          active={!!stage.isNearTerminal}
          activeClass="bg-teal-50 text-teal-700 border-teal-300"
          label="Near"
          title="Near-terminal — candidate is 80-90% confirmed, almost placed. Tracked as a separate KPI"
          onClick={() => onPatch(stage.id, applyNearTerminalToggle(stage, !stage.isNearTerminal))}
        />

        <FlagChip
          active={stage.isTerminal}
          activeClass="bg-emerald-50 text-emerald-700 border-emerald-200"
          label="Terminal"
          title="Terminal stage — good outcome, candidate is placed/joined. No further transitions"
          onClick={() => onPatch(stage.id, applyTerminalToggle(stage, !stage.isTerminal))}
        />

        <FlagChip
          active={!stage.isMandatory}
          activeClass="bg-amber-50 text-amber-700 border-amber-200"
          label={stage.isMandatory ? 'Req' : 'Opt'}
          title="Toggle whether recruiters must pass through this stage"
          onClick={() => onPatch(stage.id, { isMandatory: !stage.isMandatory })}
        />
      </div>

      {/* Status badges */}
      <div className="shrink-0 flex items-center gap-1 w-16 justify-end">
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
        onCheckedChange={v => onPatch(stage.id, { isActive: v })}
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
// TAB BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  label,
  count,
  dotClass,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  dotClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {dotClass && <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'text-[11px] rounded-full px-1.5 py-0.5 leading-none',
            active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/70'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

const VIEW_ALL = '__all__';
const VIEW_COMMON = '__common_only__';

// ─────────────────────────────────────────────────────────────────────────────
// LEGEND — shown below the header so admins know what each flag means
// ─────────────────────────────────────────────────────────────────────────────

function FlagLegend() {
  const items = [
    {
      chip: 'Std',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      desc: 'Standard — in the standard-only filter set',
    },
    {
      chip: 'Sourced',
      color: 'bg-slate-100 text-slate-700 border-slate-400',
      desc: 'Entry stage — tracked separately, not counted in active pipeline',
    },
    {
      chip: 'Pipeline',
      color: 'bg-blue-50 text-blue-700 border-blue-300',
      desc: 'Part of flow — OFF = exit stage (rejected/withdrawn)',
    },
    {
      chip: 'Near',
      color: 'bg-teal-50 text-teal-700 border-teal-300',
      desc: 'Near-terminal — 80-90% confirmed, own KPI',
    },
    {
      chip: 'Terminal',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      desc: 'Good outcome — candidate placed/joined',
    },
    {
      chip: 'Req/Opt',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      desc: 'Required vs optional step in flow',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2 bg-slate-50 border-b text-[11px] text-muted-foreground">
      <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
        Flags:
      </span>
      {items.map(item => (
        <div key={item.chip} className="flex items-center gap-1.5">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', item.color)}>
            {item.chip}
          </span>
          <span>{item.desc}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function PipelineStagesClient() {
  const axios = useAxios();
  const { data: serverStages = [], isLoading } = usePipelineStages();
  const saveStages = useSaveStages();

  const { data: canonicalStages = [] } = useQuery<CanonicalStageMeta[]>({
    queryKey: ['canonical-stages'],
    queryFn: async () => {
      const res = await axios.get('/candidates/canonical-stages');
      return (res.data.data as string[]).map(v => ({ value: v, label: toCanonicalLabel(v) }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: serviceLines = [] } = useQuery<ServiceLineMeta[]>({
    queryKey: ['service-lines'],
    queryFn: async () => (await axios.get('/service-lines')).data.data as ServiceLineMeta[],
    staleTime: 10 * 60 * 1000,
  });

  const [local, setLocal] = useState<LocalStage[] | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [view, setView] = useState<string>(VIEW_ALL);

  const stages: LocalStage[] = local ?? serverStages;
  const isDirty = local !== null || deletedIds.length > 0;

  const isLineView = view !== VIEW_ALL && view !== VIEW_COMMON;
  const visible = stages.filter(s => {
    if (view === VIEW_ALL) return true;
    if (view === VIEW_COMMON) return !s.serviceLineId;
    return s.serviceLineId === view || !s.serviceLineId;
  });

  const commonCount = stages.filter(s => !s.serviceLineId).length;
  const lineOwnCount = (id: string) => stages.filter(s => s.serviceLineId === id).length;
  const realIndexOf = (stage: LocalStage) => stages.indexOf(stage);
  const appendRealIdx = visible.length
    ? realIndexOf(visible[visible.length - 1]) + 1
    : stages.length;
  const defaultLineId = isLineView ? view : null;

  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const patchStages = (updater: (prev: LocalStage[]) => LocalStage[]) =>
    setLocal(prev => updater(prev ?? serverStages));

  // Unified patch — handles any combination of field updates
  const patchStage = (id: string, patch: Partial<LocalStage>) =>
    patchStages(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

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
    patchStages(prev => {
      const fromIdx = prev.findIndex(s => s.id === fromId);
      const toIdx = prev.findIndex(s => s.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const commitInsert = (label: string, code: string) => {
    const at = insertAt ?? stages.length;
    const newStage: LocalStage = {
      id: newTempId(),
      code,
      label,
      order: at + 1,
      isMandatory: true,
      isTerminal: false,
      isActive: true,
      isStandard: false,
      isSourced: false,
      isNearTerminal: false,
      // @ts-expect-error errr
      pipeline: true, // new stages default to being part of the flow
      canonicalStage: null,
      serviceLineId: defaultLineId,
      serviceLine: null,
      isNew: true,
    };
    patchStages(prev => {
      const next = [...prev];
      next.splice(at, 0, newStage);
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
    setInsertAt(null);
  };

  const handleDelete = (stage: LocalStage) => {
    if (!stage.isNew) setDeletedIds(prev => [...prev, stage.id]);
    patchStages(prev => {
      const next = prev.filter(s => s.id !== stage.id);
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleDiscard = () => {
    setLocal(null);
    setDeletedIds([]);
    setInsertAt(null);
  };

  const handleSave = async () => {
    if (!isDirty) return;
    await saveStages.mutateAsync({
      deletedIds,
      stages: stages.map(s => ({
        ...(s.isNew ? {} : { id: s.id }),
        code: s.code,
        label: s.label,
        isMandatory: s.isMandatory,
        isTerminal: s.isTerminal,
        isActive: s.isActive,
        isStandard: s.isStandard ?? false,
        isSourced: s.isSourced ?? false, // ← NEW
        isNearTerminal: s.isNearTerminal ?? false, // ← NEW
        // @ts-expect-error errr
        pipeline: s.pipeline ?? true,
        serviceLineId: s.serviceLineId ?? null,
        isNew: s.isNew ?? false,
        canonicalStage: s.canonicalStage ?? null,
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
              {isLineView ? (
                <>
                  Showing <span className="text-teal-700 font-medium">this line</span> +{' '}
                  <span className="font-medium">Common</span> — the sequence recruiters step through
                </>
              ) : view === VIEW_COMMON ? (
                <>
                  <span className="font-medium">Common</span> stages — shared across every service
                  line
                </>
              ) : (
                <>Drag to reorder · click flags to configure each stage's behaviour</>
              )}
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

        {/* Service-line tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b -mx-6 px-6">
          <TabButton
            active={view === VIEW_ALL}
            label="All"
            count={stages.length}
            onClick={() => setView(VIEW_ALL)}
          />
          <TabButton
            active={view === VIEW_COMMON}
            label="Common"
            count={commonCount}
            dotClass="bg-slate-400"
            onClick={() => setView(VIEW_COMMON)}
          />
          {serviceLines.map(sl => (
            <TabButton
              key={sl.id}
              active={view === sl.id}
              label={sl.name}
              count={lineOwnCount(sl.id)}
              dotClass="bg-teal-500"
              onClick={() => setView(sl.id)}
            />
          ))}
        </div>

        {/* Column headers — updated width for expanded flags column */}
        <div className="flex items-center gap-3 px-3 pt-2 pb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          <span className="w-4 shrink-0" />
          <span className="w-8 shrink-0">#</span>
          <span className="w-16 shrink-0">Code</span>
          <span className="flex-1">Label</span>
          <span className="w-36 shrink-0">Service line</span>
          <span className="w-32 shrink-0">Maps to</span>
          <span className="w-[300px] shrink-0">Flags</span>
          <span className="w-16 shrink-0 text-right">Status</span>
          <span className="w-10 shrink-0">Active</span>
          <span className="w-5 shrink-0" />
        </div>
      </div>

      {/* Flag legend */}
      <FlagLegend />

      {/* Dirty banner */}
      {isDirty && (
        <div className="flex-none flex items-center gap-2 px-6 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          Live preview — <strong>blue</strong> = new · <strong>amber</strong> = moved. Nothing saved
          yet.
        </div>
      )}

      {/* Stage list */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
        <div className="max-w-6xl space-y-0">
          {visible.map((stage, vIdx) => {
            const realIdx = realIndexOf(stage);
            return (
              <div key={stage.id}>
                {insertAt === realIdx ? (
                  <InsertRow onCommit={commitInsert} onCancel={() => setInsertAt(null)} />
                ) : (
                  <InsertTrigger
                    label={vIdx === 0 ? 'insert at start' : 'insert before'}
                    onClick={() => setInsertAt(realIdx)}
                  />
                )}
                <StageRow
                  stage={stage}
                  idx={vIdx}
                  originalStages={serverStages}
                  canonicalStages={canonicalStages}
                  serviceLines={serviceLines}
                  onPatch={patchStage}
                  onDelete={handleDelete}
                  onDragStart={() => onDragStart(stage.id)}
                  onDragEnter={() => onDragEnter(stage.id)}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                  isDragOver={dragOverStageId === stage.id}
                />
              </div>
            );
          })}

          {visible.length > 0 &&
            (insertAt === appendRealIdx ? (
              <InsertRow onCommit={commitInsert} onCancel={() => setInsertAt(null)} />
            ) : (
              <InsertTrigger
                label={isLineView ? 'append to this line' : 'append at end'}
                onClick={() => setInsertAt(appendRealIdx)}
              />
            ))}

          {visible.length === 0 &&
            (insertAt === appendRealIdx ? (
              <InsertRow onCommit={commitInsert} onCancel={() => setInsertAt(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 border rounded-lg border-dashed">
                <p className="text-sm text-muted-foreground">
                  {isLineView
                    ? 'No stages for this service line yet (and no common stages)'
                    : view === VIEW_COMMON
                      ? 'No common stages yet'
                      : 'No pipeline stages yet'}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => setInsertAt(appendRealIdx)}
                >
                  Add {isLineView ? 'a stage here' : 'first stage'}
                </Button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
