// File: PipelineStagesClient.tsx
// Path: src/app/(dashboard)/settings/pipeline-stages/PipelineStagesClient.tsx

'use client';

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
// types
// ─────────────────────────────────────────────────────────────────────────────

type LocalStage = PipelineStage & { isNew?: boolean };

interface CanonicalStageMeta {
  value: string;
  label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
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

// ─────────────────────────────────────────────────────────────────────────────
// insert row
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
// insert trigger
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
// stage row
// ─────────────────────────────────────────────────────────────────────────────

function StageRow({
  stage,
  idx,
  originalStages,
  canonicalStages,
  onLabelChange,
  onCodeChange,
  onCanonicalChange,
  onToggle,
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
  onLabelChange: (id: string, label: string) => void;
  onCodeChange: (id: string, code: string) => void;
  onCanonicalChange: (id: string, val: CanonicalStage | null) => void;
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
  const col = SLOT_COLORS[idx % SLOT_COLORS.length];

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
        !stage.isActive && 'opacity-40'
      )}
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
      <div className="shrink-0 w-20">
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

      {/* Canonical */}
      <div className="shrink-0 w-36">
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
            {canonicalStages.map(cs => (
              <SelectItem key={cs.value} value={cs.value}>
                {cs.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Badges */}
      <div className="shrink-0 flex items-center gap-1 w-24">
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
// main
// ─────────────────────────────────────────────────────────────────────────────

export default function PipelineStagesClient() {
  const axios = useAxios();
  const { data: serverStages = [], isLoading } = usePipelineStages();
  const saveStages = useSaveStages();

  const { data: canonicalStages = [] } = useQuery<CanonicalStageMeta[]>({
    queryKey: ['canonical-stages'],
    queryFn: async () => {
      const res = await axios.get('/candidates/canonical-stages');
      return (res.data.data as string[]).map(v => ({
        value: v,
        label: toCanonicalLabel(v),
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const [local, setLocal] = useState<LocalStage[] | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const stages: LocalStage[] = local ?? serverStages;
  const isDirty = local !== null || deletedIds.length > 0;

  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const patchStages = (updater: (prev: LocalStage[]) => LocalStage[]) =>
    setLocal(prev => updater(prev ?? serverStages));

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
      canonicalStage: null,
      // @ts-expect-error err
      serviceLineId: null,
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
              Drag to reorder · recruiter picks whichever stages apply
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
          <span className="w-8 shrink-0">#</span>
          <span className="w-20 shrink-0">Code</span>
          <span className="flex-1">Label</span>
          <span className="w-36 shrink-0">Maps to</span>
          <span className="w-24 shrink-0">Badges</span>
          <span className="w-10 shrink-0">Active</span>
          <span className="w-5 shrink-0" />
        </div>
      </div>

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
        <div className="max-w-4xl space-y-0">
          {stages.map((stage, idx) => (
            <div key={stage.id}>
              {insertAt === idx ? (
                <InsertRow onCommit={commitInsert} onCancel={() => setInsertAt(null)} />
              ) : (
                <InsertTrigger
                  label={idx === 0 ? 'insert at start' : 'insert before'}
                  onClick={() => setInsertAt(idx)}
                />
              )}

              <StageRow
                stage={stage}
                idx={idx}
                originalStages={serverStages}
                canonicalStages={canonicalStages}
                onLabelChange={(id, label) => patchStage(id, { label })}
                onCodeChange={(id, code) => patchStage(id, { code })}
                onCanonicalChange={(id, val) => patchStage(id, { canonicalStage: val })}
                onToggle={(id, val) => patchStage(id, { isActive: val })}
                onDelete={handleDelete}
                onDragStart={() => onDragStart(stage.id)}
                onDragEnter={() => onDragEnter(stage.id)}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                isDragOver={dragOverStageId === stage.id}
              />
            </div>
          ))}

          {insertAt === stages.length ? (
            <InsertRow onCommit={commitInsert} onCancel={() => setInsertAt(null)} />
          ) : (
            <InsertTrigger label="append at end" onClick={() => setInsertAt(stages.length)} />
          )}

          {stages.length === 0 && insertAt === null && (
            <div className="flex flex-col items-center justify-center py-20 border rounded-lg border-dashed">
              <p className="text-sm text-muted-foreground">No pipeline stages yet</p>
              <Button variant="link" size="sm" className="mt-1" onClick={() => setInsertAt(0)}>
                Add first stage
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
