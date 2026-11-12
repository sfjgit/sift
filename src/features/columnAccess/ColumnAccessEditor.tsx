// File: ColumnAccessEditor.tsx
// Path: src/features/columnAccess/ColumnAccessEditor.tsx
//
// Admin: which columns each role may see on a table. Pick a role, then drag a
// column from "Can see" to "Hidden from this role" (or click its arrow). People
// with that role never get those columns — not on screen, not in the column bar,
// not in exports. Stored as a per-role deny list; super admin always sees all.

'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { ArrowLeft, ArrowRight, EyeOff, Eye, Loader2, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GROUP_DOT } from '@/components/data-table/groupTones';
import type { GroupTone } from '@/components/data-table/types';
import { columnAccessApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { columnAccessKeys } from './useHiddenColumns';

export interface AccessColumn {
  id: string;
  label: string;
  group: string;
  tone: GroupTone;
}

const without = (d: Record<string, string[]>, key: string) =>
  Object.fromEntries(Object.entries(d).filter(([k]) => k !== key));

const short = (label: string) => label.replace(/^(Attachment|Step|Technology|Document):\s*/, '');

function Cell({
  col,
  hidden,
  onMove,
  overlay = false,
}: {
  col: AccessColumn;
  hidden: boolean;
  onMove?: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: col.id,
    disabled: overlay,
  });
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={cn(
        'flex h-9 min-w-0 items-center gap-2 rounded-lg border bg-card pr-1 pl-2.5 text-[13px] select-none',
        overlay ? 'cursor-grabbing border-primary shadow-lg ring-2 ring-primary/25' : 'cursor-grab',
        isDragging && 'opacity-30',
        hidden && !overlay && 'bg-muted/50 text-muted-foreground line-through decoration-1'
      )}
      title={`${col.group} · ${col.label}`}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
    >
      <span className={cn('size-2 shrink-0 rounded-full', GROUP_DOT[col.tone])} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{short(col.label)}</span>
      {onMove && (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={onMove}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label={hidden ? `Allow ${col.label}` : `Hide ${col.label}`}
          title={hidden ? 'Allow this column' : 'Hide from this role'}
        >
          {hidden ? <ArrowLeft className="size-3.5" /> : <ArrowRight className="size-3.5" />}
        </button>
      )}
    </div>
  );
}

function Zone({
  id,
  title,
  hint,
  icon: Icon,
  tone,
  children,
  empty,
}: {
  id: 'allow' | 'hide';
  title: string;
  hint: string;
  icon: typeof Eye;
  tone: 'ok' | 'off';
  children: React.ReactNode;
  empty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        'min-w-0 rounded-xl border-2 p-3 transition-colors',
        tone === 'ok' ? 'border-emerald-200 dark:border-emerald-900' : 'border-rose-200 dark:border-rose-900',
        isOver && (tone === 'ok' ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40')
      )}
    >
      <h4
        className={cn(
          'mb-2 flex items-center gap-1.5 text-[12px] font-semibold tracking-wider uppercase',
          tone === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
        )}
      >
        <Icon className="size-3.5" /> {title}
        <span className="font-normal tracking-normal text-muted-foreground normal-case">
          · {hint}
        </span>
      </h4>
      <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] content-start gap-1.5 overflow-y-auto pr-1">
        {children}
        {empty && (
          <p className="col-span-full rounded-lg border border-dashed py-6 text-center text-[13px] text-muted-foreground">
            Drop columns here
          </p>
        )}
      </div>
    </section>
  );
}

export function ColumnAccessEditor({
  table,
  columns,
}: {
  table: string;
  columns: AccessColumn[];
}) {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const q = useQuery({
    queryKey: columnAccessKeys.all(table),
    queryFn: () => columnAccessApi.get(table),
  });
  const [roleId, setRoleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({}); // role → hidden (unsaved)
  const [dragId, setDragId] = useState<string | null>(null);

  const roles = useMemo(() => q.data?.roles ?? [], [q.data]);
  const role = roles.find(r => r.id === roleId) ?? roles[0];
  const saved = (role && q.data?.hidden[role.id]) ?? [];
  const hidden = role ? (draft[role.id] ?? saved) : [];
  const dirty = !!role && draft[role.id] !== undefined && draft[role.id]!.join() !== saved.join();
  const byId = new Map(columns.map(c => [c.id, c]));

  const setHidden = (next: string[]) => role && setDraft(d => ({ ...d, [role.id]: next }));
  const hide = (id: string) => !hidden.includes(id) && setHidden([...hidden, id]);
  const allow = (id: string) => setHidden(hidden.filter(x => x !== id));

  const save = useMutation({
    mutationFn: () => columnAccessApi.save(table, role!.id, hidden),
    onSuccess: () => {
      toast.success(`Saved — ${role!.name} ${hidden.length ? `can't see ${hidden.length} column${hidden.length === 1 ? '' : 's'}` : 'sees every column'}`);
      setDraft(d => without(d, role!.id));
      void qc.invalidateQueries({ queryKey: ['column-access', table] });
    },
    onError: e => toast.error((e as ApiError).message),
  });

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    if (!over) return;
    const id = String(active.id);
    if (over.id === 'hide') hide(id);
    if (over.id === 'allow') allow(id);
  };

  if (q.isLoading) return <Skeleton className="m-3 h-64 rounded-xl" />;
  if (!role)
    return <p className="p-4 text-[13px] text-muted-foreground">No roles to configure yet.</p>;

  const allowedCols = columns.filter(c => !hidden.includes(c.id));
  const hiddenCols = hidden.map(id => byId.get(id)).filter((c): c is AccessColumn => !!c);
  const dragCol = dragId ? byId.get(dragId) : undefined;

  return (
    <div className="space-y-3 p-3">
      {/* roles */}
      <div>
        <h3 className="mb-1.5 text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase">
          Roles
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {roles.map(r => {
            const n = (draft[r.id] ?? q.data?.hidden[r.id] ?? []).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleId(r.id)}
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                  r.id === role.id
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'bg-card hover:border-primary/50'
                )}
              >
                {r.name}
                <span className="inline-flex items-center gap-0.5 text-[11.5px] font-normal text-muted-foreground">
                  <Users className="size-3" /> {r.users}
                </span>
                {n > 0 && (
                  <span className="rounded-full bg-rose-100 px-1.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    {n} hidden
                  </span>
                )}
                {draft[r.id] !== undefined && <span className="size-1.5 rounded-full bg-warning" title="Not saved" />}
              </button>
            );
          })}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={e => setDragId(String(e.active.id))}
        onDragCancel={() => setDragId(null)}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <Zone
            id="allow"
            title={`${role.name} can see`}
            hint={`${allowedCols.length} columns`}
            icon={Eye}
            tone="ok"
            empty={!allowedCols.length}
          >
            {allowedCols.map(c => (
              <Cell key={c.id} col={c} hidden={false} onMove={() => hide(c.id)} />
            ))}
          </Zone>
          <Zone
            id="hide"
            title="Hidden from this role"
            hint="drag columns here"
            icon={EyeOff}
            tone="off"
            empty={!hiddenCols.length}
          >
            {hiddenCols.map(c => (
              <Cell key={c.id} col={c} hidden onMove={() => allow(c.id)} />
            ))}
          </Zone>
        </div>
        <DragOverlay>
          {dragCol && <Cell col={dragCol} hidden={hidden.includes(dragCol.id)} overlay />}
        </DragOverlay>
      </DndContext>

      {/* save */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[13px]">
        <ShieldCheck className="size-4 text-primary" />
        <span className="text-muted-foreground">
          People with the <b className="text-foreground">{role.name}</b> role won’t see hidden columns
          anywhere — table, column bar or export. Super admin always sees everything.
        </span>
        <span className="ml-auto flex items-center gap-2">
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setDraft(d => without(d, role.id))
              }
            >
              Discard
            </Button>
          )}
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="animate-spin" />}
            Save for {role.name}
          </Button>
        </span>
      </div>
    </div>
  );
}
