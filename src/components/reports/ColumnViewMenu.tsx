'use client';

// File: ColumnViewMenu.tsx
// Path: src/components/reports/ColumnViewMenu.tsx
//
// One panel for the table layout:
//   Saved views   apply · update · rename · delete · ★ default (auto-applies next time)
//   Columns       drag to reorder · tick to show/hide · search · reset order
// Everything is stored per table key in reportViewStore (this browser).

import { useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  CheckSquare,
  Columns3,
  GripVertical,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Square,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { hidableColumns, orderColumns, type ColumnDef } from './DataTable';
import { AnchoredPanel } from './reportUi';
import {
  MAX_SAVED_VIEWS,
  VIEW_NAME_MAX,
  isViewDirty,
  useReportTableLayout,
  useReportViewStore,
  viewsForTable,
  type ReportTableKey,
} from '@/stores/reportViewStore';

interface ColumnViewMenuProps<T> {
  tableKey: ReportTableKey;
  /** The table's columns in their NATURAL order — saved order is applied here */
  columns: ColumnDef<T>[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ONE DRAGGABLE COLUMN ROW
// ─────────────────────────────────────────────────────────────────────────────

function ColumnRow<T>({
  col,
  on,
  draggable,
  onToggle,
}: {
  col: ColumnDef<T>;
  on: boolean;
  draggable: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${isDragging ? 'z-10 bg-indigo-50 shadow-md ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
    >
      <button
        {...attributes}
        {...listeners}
        disabled={!draggable}
        className="cursor-grab touch-none rounded p-0.5 text-slate-300 hover:text-slate-600 active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
        aria-label={`Drag ${col.label}`}
        title={draggable ? 'Drag to reorder' : 'Clear the search to reorder'}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {on ? (
          <CheckSquare className="h-4 w-4 shrink-0 text-indigo-500" />
        ) : (
          <Square className="h-4 w-4 shrink-0 text-slate-300" />
        )}
        {col.dotColor && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: col.dotColor }}
          />
        )}
        <span
          className={`truncate text-[12px] font-semibold ${on ? 'text-slate-700' : 'text-slate-400'}`}
        >
          {col.label}
        </span>
        {col.group && (
          <span className="ml-auto shrink-0 text-[10px] text-slate-300">{col.group}</span>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────────────────────

export function ColumnViewMenu<T>({ tableKey, columns }: ColumnViewMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { hidden, order, setOrder } = useReportTableLayout(tableKey);
  const activeViewId = useReportViewStore(s => s.activeViewId[tableKey] ?? null);
  const defaultViewId = useReportViewStore(s => s.defaultViewId[tableKey] ?? null);
  const allViews = useReportViewStore(s => s.views);

  const toggleColumn = useReportViewStore(s => s.toggleColumn);
  const showAllColumns = useReportViewStore(s => s.showAllColumns);
  const hideAllColumns = useReportViewStore(s => s.hideAllColumns);
  const resetColumnOrder = useReportViewStore(s => s.resetColumnOrder);
  const saveView = useReportViewStore(s => s.saveView);
  const updateView = useReportViewStore(s => s.updateView);
  const renameView = useReportViewStore(s => s.renameView);
  const deleteView = useReportViewStore(s => s.deleteView);
  const applyView = useReportViewStore(s => s.applyView);
  const setDefaultView = useReportViewStore(s => s.setDefaultView);

  const views = useMemo(() => viewsForTable(allViews, tableKey), [allViews, tableKey]);
  const activeView = views.find(v => v.id === activeViewId) ?? null;
  const dirty = isViewDirty(allViews, activeViewId, hidden, order);

  // Movable columns in the current order
  const movable = useMemo(() => hidableColumns(orderColumns(columns, order)), [columns, order]);
  const term = search.trim().toLowerCase();
  const shown = term
    ? movable.filter(
        c => c.label.toLowerCase().includes(term) || (c.group ?? '').toLowerCase().includes(term)
      )
    : movable;
  const visibleCount = movable.filter(c => !hidden.includes(c.id)).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = movable.map(c => c.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    setOrder(arrayMove(ids, from, to));
  };

  const handleSave = () => {
    const res = saveView(tableKey, name);
    if (!res.ok) return setError(res.error ?? 'Could not save that view.');
    setName('');
    setError(null);
  };

  const handleRename = (id: string) => {
    const res = renameView(id, renameDraft);
    if (!res.ok) return setError(res.error ?? 'Could not rename that view.');
    setRenamingId(null);
    setError(null);
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
          open
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        <Columns3 className="h-3.5 w-3.5" />
        {activeView ? activeView.name : 'Columns'}
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${open ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          {visibleCount}/{movable.length}
        </span>
        {dirty && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
        )}
      </button>

      <AnchoredPanel anchorRef={triggerRef} open={open} onClose={() => setOpen(false)} width={360}>
        <div className="flex min-h-0 flex-col">
          {/* ── Saved views ─────────────────────────────────────────────── */}
          <div className="shrink-0 border-b border-slate-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Saved views
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {views.length}/{MAX_SAVED_VIEWS}
              </span>
            </div>

            {views.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                Arrange and pick your columns below, then save the layout with a name. Star a view
                to open with it every time.
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {views.map(v => {
                  const isActive = v.id === activeViewId;
                  const isDefault = v.id === defaultViewId;
                  return (
                    <div
                      key={v.id}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${
                        isActive
                          ? 'border-indigo-200 bg-indigo-50/60'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      {renamingId === v.id ? (
                        <>
                          <input
                            autoFocus
                            value={renameDraft}
                            maxLength={VIEW_NAME_MAX}
                            onChange={e => setRenameDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRename(v.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="min-w-0 flex-1 rounded border border-slate-200 px-1.5 py-0.5 text-[12px] outline-none focus:border-indigo-400"
                          />
                          <button
                            onClick={() => handleRename(v.id)}
                            className="text-emerald-600 hover:text-emerald-700"
                            aria-label="Save name"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setRenamingId(null)}
                            className="text-slate-400 hover:text-slate-600"
                            aria-label="Cancel rename"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => applyView(v.id)}
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                          >
                            <Bookmark
                              className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-300'}`}
                            />
                            <span
                              className={`truncate text-[12px] font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}
                            >
                              {v.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {v.hiddenColumns.length
                                ? `${v.hiddenColumns.length} hidden`
                                : 'all columns'}
                              {v.columnOrder?.length ? ' · arranged' : ''}
                            </span>
                          </button>
                          {isActive && dirty && (
                            <button
                              onClick={() => updateView(v.id)}
                              title="Save the current layout into this view"
                              className="rounded px-1 text-[10px] font-bold text-amber-600 hover:bg-amber-50"
                            >
                              Update
                            </button>
                          )}
                          <button
                            onClick={() => setDefaultView(tableKey, isDefault ? null : v.id)}
                            title={
                              isDefault
                                ? 'Default view — click to unset'
                                : 'Open with this view every time'
                            }
                            className={
                              isDefault ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                            }
                            aria-label={
                              isDefault ? `Unset ${v.name} as default` : `Set ${v.name} as default`
                            }
                          >
                            <Star className={`h-3.5 w-3.5 ${isDefault ? 'fill-amber-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              setRenamingId(v.id);
                              setRenameDraft(v.name);
                            }}
                            className="text-slate-300 hover:text-indigo-500"
                            aria-label={`Rename ${v.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteView(v.id)}
                            className="text-slate-300 hover:text-red-500"
                            aria-label={`Delete ${v.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-2 flex items-center gap-1.5">
              <input
                value={name}
                maxLength={VIEW_NAME_MAX}
                placeholder="Name this layout"
                onChange={e => {
                  setName(e.target.value);
                  setError(null);
                }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-indigo-400"
              />
              <button
                onClick={handleSave}
                disabled={!name.trim() || views.length >= MAX_SAVED_VIEWS}
                className="flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            </div>
            {error && <p className="mt-1.5 text-[11px] font-medium text-red-500">{error}</p>}
          </div>

          {/* ── Columns: drag + tick ───────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between px-3 pb-1 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Columns
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => showAllColumns(tableKey)}
                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50"
              >
                All
              </button>
              <button
                onClick={() =>
                  hideAllColumns(
                    tableKey,
                    movable.map(c => c.id)
                  )
                }
                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
              >
                None
              </button>
              <button
                onClick={() => resetColumnOrder(tableKey)}
                disabled={!order.length}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                title="Back to the default column order"
              >
                <RotateCcw className="h-3 w-3" /> Order
              </button>
            </div>
          </div>

          <div className="shrink-0 px-3 pb-2">
            <label className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2 focus-within:border-indigo-400">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Find a column"
                className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={shown.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {shown.map(col => (
                  <ColumnRow
                    key={col.id}
                    col={col}
                    on={!hidden.includes(col.id)}
                    draggable={!term}
                    onToggle={() => toggleColumn(tableKey, col.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {shown.length === 0 && (
              <p className="px-2 py-4 text-center text-[11px] text-slate-400">
                No column matches that search.
              </p>
            )}
          </div>

          <p className="shrink-0 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">
            Tip: you can also drag column headers in the table. Views live in this browser only.
          </p>
        </div>
      </AnchoredPanel>
    </>
  );
}
