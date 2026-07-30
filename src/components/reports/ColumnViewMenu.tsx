'use client';

// File: ColumnViewMenu.tsx
// Path: src/components/reports/ColumnViewMenu.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  CheckSquare,
  Columns3,
  Pencil,
  Save,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { hidableColumns, type ColumnDef } from './DataTable';
import {
  MAX_SAVED_VIEWS,
  VIEW_NAME_MAX,
  isViewDirty,
  useReportViewStore,
  useReportViewsReady,
  viewsForTable,
  type ReportTableKey,
} from '@/stores/reportViewStore';

interface ColumnViewMenuProps<T> {
  tableKey: ReportTableKey;
  columns: ColumnDef<T>[];
}

export function ColumnViewMenu<T>({ tableKey, columns }: ColumnViewMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const ready = useReportViewsReady();
  const hiddenRaw = useReportViewStore(s => s.hiddenColumns[tableKey]);
  const activeViewId = useReportViewStore(s => s.activeViewId[tableKey] ?? null);
  const allViews = useReportViewStore(s => s.views);

  const toggleColumn = useReportViewStore(s => s.toggleColumn);
  const showAllColumns = useReportViewStore(s => s.showAllColumns);
  const hideAllColumns = useReportViewStore(s => s.hideAllColumns);
  const saveView = useReportViewStore(s => s.saveView);
  const updateView = useReportViewStore(s => s.updateView);
  const renameView = useReportViewStore(s => s.renameView);
  const deleteView = useReportViewStore(s => s.deleteView);
  const applyView = useReportViewStore(s => s.applyView);

  const hidden = useMemo(() => (ready ? (hiddenRaw ?? []) : []), [ready, hiddenRaw]);
  const views = useMemo(() => viewsForTable(allViews, tableKey), [allViews, tableKey]);
  const activeView = views.find(v => v.id === activeViewId) ?? null;
  const dirty = isViewDirty(allViews, activeViewId, hidden);

  const hidable = useMemo(() => hidableColumns(columns), [columns]);
  const grouped = useMemo(() => {
    const map = new Map<string, ColumnDef<T>[]>();
    for (const col of hidable) {
      const key = col.group ?? 'Columns';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(col);
    }
    return [...map.entries()];
  }, [hidable]);

  const visibleCount = hidable.length - hidden.filter(id => hidable.some(c => c.id === id)).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
    <div className="relative" ref={panelRef}>
      <button
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
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            open ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {visibleCount}/{hidable.length}
        </span>
        {dirty && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 flex w-[340px] flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Saved views */}
          <div className="border-b border-slate-100 p-3">
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
                Pick your columns below, then save the layout with a name to come back to it.
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {views.map(v => {
                  const isActive = v.id === activeViewId;
                  const hiddenHere = v.hiddenColumns.length;
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
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive ? 'text-indigo-500' : 'text-slate-300'
                              }`}
                            />
                            <span
                              className={`truncate text-[12px] font-semibold ${
                                isActive ? 'text-indigo-700' : 'text-slate-700'
                              }`}
                            >
                              {v.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {hiddenHere === 0 ? 'all columns' : `${hiddenHere} hidden`}
                            </span>
                          </button>
                          {isActive && dirty && (
                            <button
                              onClick={() => updateView(v.id)}
                              title="Update this view with the current columns"
                              className="rounded px-1 text-[10px] font-bold text-amber-600 hover:bg-amber-50"
                            >
                              Update
                            </button>
                          )}
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

          {/* Column toggles */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Show columns
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
                    hidable.map(c => c.id)
                  )
                }
                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
              >
                None
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto px-1.5 pb-3">
            {grouped.map(([group, cols]) => (
              <div key={group} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  {group}
                </p>
                {cols.map(col => {
                  const on = !hidden.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      onClick={() => toggleColumn(tableKey, col.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                    >
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
                        className={`truncate text-[12px] font-semibold ${
                          on ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {col.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">
            Views live in this browser only. Exports always include every column.
          </p>
        </div>
      )}
    </div>
  );
}
