// File: DataMap.tsx
// Path: src/features/schema/DataMap.tsx
//
// Admin › Data map (super admins): the database as a picture. Areas (Client, add-ons, people, CSR,
// daily work, engines, organisation, AI, system) hold their tables; arrows are the links (the arrow
// starts at the table that holds the key). ⓘ explains what a table / field is and why it exists.
// Click a table: its links light up and the side panel shows every field, its links in and out, and
// when it changed. History lists every change to the structure since the first version.

'use client';

import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowRight,
  History,
  Info,
  KeyRound,
  Link2,
  Map as MapIcon,
  Search,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/format';
import type { SchemaChange, SchemaDomain, SchemaField, SchemaMap, SchemaModel } from './types';

const CARD_W = 236;
const GAP = 16;
const AREA_W = CARD_W * 2 + GAP * 3;
const ROW_H = 17;
const MAX_ROWS = 7;

/** the rows a table card shows: id, keys that link to other tables, then the first plain fields */
function keyFields(m: SchemaModel) {
  const fkNames = new Set(m.fields.flatMap(f => f.relation?.fields ?? []));
  const plain = m.fields.filter(f => !f.relation);
  const ranked = [
    ...plain.filter(f => f.id),
    ...plain.filter(f => fkNames.has(f.name)),
    ...plain.filter(f => !f.id && !fkNames.has(f.name)),
  ];
  return { rows: ranked.slice(0, MAX_ROWS), more: Math.max(0, plain.length - MAX_ROWS), fkNames };
}
const cardHeight = (m: SchemaModel) => {
  const { rows, more } = keyFields(m);
  return 42 + rows.length * ROW_H + (more ? 18 : 0) + 8;
};

function InfoTip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={e => e.stopPropagation()}
          className={cn('inline-flex shrink-0 text-muted-foreground hover:text-primary', className)}
          aria-label="What is this?"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-80 text-[12.5px] leading-5">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

// ── nodes ────────────────────────────────────────────────────────────────────

type AreaData = { domain: SchemaDomain; dim: boolean };
type TableData = {
  model: SchemaModel;
  color: string;
  note?: { what: string; why: string };
  selected: boolean;
  dim: boolean;
  isNew: boolean;
};

function AreaNode({ data }: NodeProps<Node<AreaData>>) {
  const d = data.domain;
  return (
    <div
      className={cn(
        'h-full w-full rounded-2xl border-2 transition-opacity',
        data.dim && 'opacity-30'
      )}
      style={{ borderColor: `${d.color}55`, background: `${d.color}0d` }}
    >
      <div
        className="flex items-center gap-1.5 rounded-t-[14px] px-3 py-2 text-white"
        style={{ background: d.color }}
      >
        <span className="text-[14px] font-bold">{d.label}</span>
        <span className="text-[11px] opacity-80">· {d.models.length} tables</span>
        <InfoTip className="ml-auto text-white/80 hover:text-white">{d.what}</InfoTip>
      </div>
    </div>
  );
}

function TableNode({ data }: NodeProps<Node<TableData>>) {
  const { model: m, color, note } = data;
  const { rows, more, fkNames } = keyFields(m);
  const linkOf = (f: SchemaField) =>
    m.fields.find(r => r.relation?.fields?.includes(f.name))?.relation?.to;
  return (
    <div
      className={cn(
        'w-[236px] cursor-pointer overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-all',
        data.selected ? 'ring-2 ring-offset-1' : 'hover:shadow-md',
        data.dim && 'opacity-25'
      )}
      style={{
        borderColor: data.selected ? color : undefined,
        ['--tw-ring-color' as string]: color,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-1.5 !min-w-0 !border-0"
        style={{ background: color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-1.5 !min-w-0 !border-0"
        style={{ background: color }}
      />
      <div
        className="flex items-center gap-1.5 border-b px-2.5 py-1.5"
        style={{ background: `${color}14` }}
      >
        <span className="truncate text-[13px] font-bold" style={{ color }}>
          {m.name}
        </span>
        {data.isNew && (
          <span className="rounded bg-emerald-100 px-1 text-[9.5px] font-bold text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-300">
            new
          </span>
        )}
        {note && (
          <InfoTip className="ml-auto">
            <b>What:</b> {note.what}
            <br />
            <b>Why:</b> {note.why}
          </InfoTip>
        )}
      </div>
      <div className="py-1">
        {rows.map(f => (
          <div key={f.name} className="flex items-center gap-1 px-2.5 text-[11.5px] leading-[17px]">
            {f.id ? (
              <KeyRound className="size-3 shrink-0 text-amber-500" />
            ) : fkNames.has(f.name) ? (
              <Link2 className="size-3 shrink-0" style={{ color }} />
            ) : (
              <span className="size-3 shrink-0" />
            )}
            <span
              className={cn(
                'truncate',
                f.id || fkNames.has(f.name) ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              {f.name}
            </span>
            <span className="ml-auto truncate pl-2 font-mono text-[10.5px] text-muted-foreground/80">
              {fkNames.has(f.name) ? `→ ${linkOf(f)}` : `${f.type}${f.optional ? '?' : ''}`}
            </span>
          </div>
        ))}
        {more > 0 && (
          <div className="px-2.5 pt-0.5 text-[10.5px] text-muted-foreground">
            + {more} more fields
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { area: AreaNode, table: TableNode };

// ── layout ───────────────────────────────────────────────────────────────────

function useLayout(
  map: SchemaMap,
  shown: Set<string>,
  selected: string | null,
  search: string,
  newTables: Set<string>
) {
  return useMemo(() => {
    const byName = new Map(map.graph.models.map(m => [m.name, m]));
    const domains = map.domains.map(d => ({ ...d, models: d.models.filter(n => byName.has(n)) }));
    // anything not placed in an area → "Other"
    const placed = new Set(domains.flatMap(d => d.models));
    const others = map.graph.models.map(m => m.name).filter(n => !placed.has(n));
    if (others.length)
      domains.push({
        key: 'other',
        label: 'Other (no notes yet)',
        color: '#94a3b8',
        col: 3,
        row: 0,
        what: 'Tables not yet placed in an area in schemaNotes.ts.',
        models: others,
      });
    const colorOf = new Map(domains.flatMap(d => d.models.map(n => [n, d.color] as const)));
    const areaOf = new Map(domains.flatMap(d => d.models.map(n => [n, d.key] as const)));

    // linked to the selected table
    const near = new Set<string>();
    if (selected) {
      near.add(selected);
      for (const l of map.graph.links) {
        if (l.from === selected) near.add(l.to);
        if (l.to === selected) near.add(l.from);
      }
    }
    const q = search.trim().toLowerCase();
    const hit = (m: SchemaModel) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.fields.some(f => f.name.toLowerCase().includes(q));

    // area sizes, then rows of areas
    const sizes = new Map(
      domains.map(d => {
        let h = 52;
        for (let i = 0; i < d.models.length; i += 2) {
          const a = byName.get(d.models[i]!)!;
          const b = d.models[i + 1] ? byName.get(d.models[i + 1]!)! : null;
          h += Math.max(cardHeight(a), b ? cardHeight(b) : 0) + GAP;
        }
        return [d.key, h] as const;
      })
    );
    const rowTop = new Map<number, number>();
    let y = 0;
    for (const r of [...new Set(domains.map(d => d.row))].sort()) {
      rowTop.set(r, y);
      y += Math.max(...domains.filter(d => d.row === r).map(d => sizes.get(d.key)!)) + 70;
    }

    const nodes: Node[] = [];
    for (const d of domains) {
      if (!shown.has(d.key)) continue;
      const areaId = `area:${d.key}`;
      nodes.push({
        id: areaId,
        type: 'area',
        position: { x: d.col * (AREA_W + 70), y: rowTop.get(d.row)! },
        data: { domain: d, dim: !!selected && !d.models.some(n => near.has(n)) },
        style: { width: AREA_W, height: sizes.get(d.key) },
        draggable: false,
        selectable: false,
        zIndex: 0,
      });
      let top = 52;
      for (let i = 0; i < d.models.length; i += 2) {
        const pair = [d.models[i]!, d.models[i + 1]].filter(Boolean) as string[];
        pair.forEach((name, j) => {
          const m = byName.get(name)!;
          nodes.push({
            id: name,
            type: 'table',
            parentId: areaId,
            extent: 'parent',
            position: { x: GAP + j * (CARD_W + GAP), y: top },
            data: {
              model: m,
              color: d.color,
              note: map.modelNotes[name],
              selected: selected === name,
              dim: (!!selected && !near.has(name)) || !hit(m),
              isNew: newTables.has(name),
            },
            zIndex: 1,
          });
        });
        top += Math.max(...pair.map(n => cardHeight(byName.get(n)!))) + GAP;
      }
    }
    const visible = new Set(nodes.filter(n => n.type === 'table').map(n => n.id));
    const edges: Edge[] = map.graph.links
      .filter(l => visible.has(l.from) && visible.has(l.to) && l.from !== l.to)
      .map(l => {
        const on = !!selected && (l.from === selected || l.to === selected);
        // links to the Client — the spine of the CRM — are always clearly drawn, in the linking table's colour
        const toClient = l.to === 'Client';
        // the bookkeeping links (who / which tenant / which engine run) stay faint until a table is picked
        const bookkeeping = ['Tenant', 'User', 'StepRun', 'Lookup'].includes(l.to);
        return {
          id: `${l.from}.${l.field}->${l.to}`,
          source: l.from,
          target: l.to,
          animated: on,
          zIndex: on ? 2 : toClient ? 1 : 0,
          style: {
            stroke: on
              ? colorOf.get(l.from === selected ? l.to : l.from)
              : toClient
                ? colorOf.get(l.from)
                : 'var(--muted-foreground)',
            strokeWidth: on ? 2.2 : toClient ? 1.6 : 1,
            opacity: selected ? (on ? 1 : 0.05) : toClient ? 0.75 : bookkeeping ? 0.07 : 0.3,
            strokeDasharray: l.optional ? '5 4' : undefined,
          },
        };
      });
    return { nodes, edges, domains };
  }, [map, shown, selected, search, newTables]);
}

// ── side panel ───────────────────────────────────────────────────────────────

function TablePanel({
  map,
  name,
  onPick,
  onClose,
}: {
  map: SchemaMap;
  name: string;
  onPick: (n: string) => void;
  onClose: () => void;
}) {
  const m = map.graph.models.find(x => x.name === name);
  if (!m) return null;
  const note = map.modelNotes[name];
  const out = map.graph.links.filter(l => l.from === name);
  const inn = map.graph.links.filter(l => l.to === name && l.from !== name);
  const changes = map.history.filter(
    h => h.addedModels.includes(name) || h.fieldChanges.some(f => f.model === name)
  );
  const domain = map.domains.find(d => d.models.includes(name));
  return (
    <aside className="absolute top-3 right-3 bottom-3 z-10 flex w-[400px] flex-col overflow-hidden rounded-xl border bg-card shadow-xl">
      <header
        className="flex items-start gap-2 border-b px-4 py-3"
        style={{ borderTop: `4px solid ${domain?.color ?? '#94a3b8'}` }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-semibold tracking-wider uppercase"
            style={{ color: domain?.color }}
          >
            {domain?.label ?? 'Other'}
          </p>
          <h2 className="truncate text-lg font-bold">{name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 text-[13px]">
        {note ? (
          <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
            <p>
              <b>What it is:</b> {note.what}
            </p>
            <p>
              <b>Why it exists:</b> {note.why}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            No explanation yet (add it in crm-core-service/src/docs/schemaNotes.ts).
          </p>
        )}

        <section>
          <h3 className="mb-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Links ({out.length} out · {inn.length} in)
          </h3>
          <ul className="space-y-1">
            {out.map(l => (
              <li key={`o${l.field}`} className="flex items-center gap-1.5">
                <span className="font-mono text-[11.5px] text-muted-foreground">{l.field}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => onPick(l.to)}
                >
                  {l.to}
                </button>
                {l.optional && (
                  <span className="text-[11px] text-muted-foreground">(optional)</span>
                )}
              </li>
            ))}
            {inn.map(l => (
              <li key={`i${l.from}${l.field}`} className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => onPick(l.from)}
                >
                  {l.from}
                </button>
                <span className="font-mono text-[11.5px] text-muted-foreground">.{l.field}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span>this</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Fields ({m.fields.filter(f => !f.relation).length})
          </h3>
          <table className="w-full text-[12px]">
            <tbody>
              {m.fields.map(f => {
                const fnote = map.fieldNotes[`${name}.${f.name}`] ?? f.comment;
                return (
                  <tr key={f.name} className="border-b border-border/50 align-top">
                    <td className="py-1 pr-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {f.id && <KeyRound className="size-3 text-amber-500" />}
                        {f.relation && <Link2 className="size-3 text-primary" />}
                        {f.name}
                        {fnote && <InfoTip>{fnote}</InfoTip>}
                      </span>
                    </td>
                    <td className="py-1 text-right font-mono text-[11px] text-muted-foreground">
                      {f.relation ? (
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => onPick(f.relation!.to)}
                        >
                          {f.relation.to}
                          {f.list ? '[]' : ''}
                        </button>
                      ) : (
                        `${f.type}${f.list ? '[]' : ''}${f.optional ? '?' : ''}`
                      )}
                      {f.unique && ' · unique'}
                      {f.default && <span className="block text-[10px]">= {f.default}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {m.constraints.length > 0 && (
            <details className="mt-2 text-[11.5px] text-muted-foreground">
              <summary className="cursor-pointer">
                Unique rules & indexes ({m.constraints.length})
              </summary>
              <ul className="mt-1 space-y-0.5 font-mono text-[10.5px]">
                {m.constraints.map(c => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Changes over time ({changes.length})
          </h3>
          <ul className="space-y-1.5">
            {changes.map(h => {
              const fc = h.fieldChanges.find(f => f.model === name);
              return (
                <li key={h.ref + h.hash} className="rounded-md border px-2.5 py-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    {fmtDate(h.at)} · {h.ref} · {h.author}
                  </p>
                  <p className="text-[12px]">
                    {h.addedModels.includes(name) ? (
                      <b className="text-emerald-600">table created</b>
                    ) : (
                      <>
                        {fc?.added.length ? (
                          <span className="text-emerald-600">+ {fc.added.join(', ')} </span>
                        ) : null}
                        {fc?.removed.length ? (
                          <span className="text-rose-600">− {fc.removed.join(', ')} </span>
                        ) : null}
                        {fc?.changed.length ? (
                          <span className="text-amber-600">~ {fc.changed.join(', ')}</span>
                        ) : null}
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </aside>
  );
}

// ── history ──────────────────────────────────────────────────────────────────

function HistoryList({
  history,
  onPick,
}: {
  history: SchemaChange[];
  onPick: (n: string) => void;
}) {
  return (
    <ol className="relative mx-auto max-w-3xl space-y-3 border-l-2 border-border pl-6">
      {history.map(h => (
        <li key={h.ref + h.hash} className="relative">
          <span className="absolute top-2 -left-[31px] size-3 rounded-full border-2 border-background bg-primary" />
          <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{fmtDate(h.at)}</span>
              <span className="font-mono text-[12px] text-muted-foreground">{h.ref}</span>
              <span className="text-[12px] text-muted-foreground">· {h.author}</span>
              <span className="ml-auto text-[12px] text-muted-foreground">{h.tables} tables</span>
            </div>
            {h.message && <p className="mt-0.5 text-[13px] text-muted-foreground">{h.message}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {h.addedModels.map(m => (
                <button
                  key={`a${m}`}
                  type="button"
                  onClick={() => onPick(m)}
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  + {m}
                </button>
              ))}
              {h.removedModels.map(m => (
                <span
                  key={`r${m}`}
                  className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[12px] font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
                >
                  − {m}
                </span>
              ))}
            </div>
            {h.fieldChanges.length > 0 && (
              <details className="mt-2 text-[12.5px]" open={h.fieldChanges.length <= 4}>
                <summary className="cursor-pointer text-muted-foreground">
                  Field changes in {h.fieldChanges.length} table
                  {h.fieldChanges.length > 1 ? 's' : ''}
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {h.fieldChanges.map(f => (
                    <li key={f.model}>
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => onPick(f.model)}
                      >
                        {f.model}
                      </button>{' '}
                      {f.added.length > 0 && (
                        <span className="text-emerald-600">+ {f.added.join(', ')} </span>
                      )}
                      {f.removed.length > 0 && (
                        <span className="text-rose-600">− {f.removed.join(', ')} </span>
                      )}
                      {f.changed.length > 0 && (
                        <span className="text-amber-600">~ {f.changed.join(', ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {h.enumChanges.length > 0 && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                Value lists changed: {h.enumChanges.join(', ')}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export function DataMap({ map }: { map: SchemaMap }) {
  const [tab, setTab] = useState<'map' | 'history'>('map');
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(() => new Set(map.domains.map(d => d.key).concat('other')));
  // tables created in the newest change get a "new" badge
  const newTables = useMemo(() => new Set(map.history[0]?.addedModels ?? []), [map.history]);
  const { nodes, edges, domains } = useLayout(map, shown, selected, search, newTables);
  const pick = (n: string) => {
    const d = domains.find(x => x.models.includes(n));
    if (d && !shown.has(d.key)) setShown(new Set([...shown, d.key]));
    setSelected(n);
    setTab('map');
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border bg-card">
            {(
              [
                ['map', 'Map', MapIcon],
                ['history', `History (${map.history.length})`, History],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium',
                  tab === k
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          {tab === 'map' && (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Find a table or field"
                  className="h-8 w-56 pl-7 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {domains.map(d => {
                  const on = shown.has(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => {
                        const next = new Set(shown);
                        if (on) next.delete(d.key);
                        else next.add(d.key);
                        setShown(next);
                      }}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors',
                        !on && 'opacity-45'
                      )}
                      style={
                        on
                          ? { borderColor: d.color, color: d.color, background: `${d.color}12` }
                          : undefined
                      }
                      title={d.what}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {tab === 'map' ? (
          <div className="relative h-[calc(100vh-170px)] min-h-[560px] overflow-hidden rounded-xl border bg-[var(--surface,var(--background))]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, n) =>
                n.type === 'table' && setSelected(selected === n.id ? null : n.id)
              }
              onPaneClick={() => setSelected(null)}
              nodesConnectable={false}
              nodesDraggable={false}
              fitView
              fitViewOptions={{ padding: 0.08 }}
              minZoom={0.1}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={24} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={n =>
                  n.type === 'area' ? 'transparent' : ((n.data as TableData).color ?? '#94a3b8')
                }
              />
            </ReactFlow>
            <div className="pointer-events-none absolute bottom-3 left-14 rounded-md bg-card/90 px-2.5 py-1 text-[11.5px] text-muted-foreground shadow-sm">
              <KeyRound className="mr-1 inline size-3 text-amber-500" />
              id ·
              <Link2 className="mx-1 inline size-3" />
              key to another table · arrow starts at the table holding the key · dashed = optional ·
              click a table to light up its links
            </div>
            {selected && (
              <TablePanel
                map={map}
                name={selected}
                onPick={setSelected}
                onClose={() => setSelected(null)}
              />
            )}
          </div>
        ) : (
          <HistoryList history={map.history} onPick={pick} />
        )}
      </div>
    </TooltipProvider>
  );
}
