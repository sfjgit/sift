// File: ReportBuilder.tsx
// Path: src/features/reports/ReportBuilder.tsx
//
// Left rail: entity, group / split, top-N, filters, created-date range.

'use client';

import { ArrowLeftRight, Building2, ContactRound, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterControl } from '@/components/data-table/FilterBar';
import { tourTarget } from '@/features/tour/tour.constants';
import type { ReportEntity } from '@/types/reports';
import { DIMS, FILTERS, type ReportSpec } from './spec';

const NONE = '__none_split';

function Section({ title, children, ...rest }: { title: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className="space-y-3 border-b px-4 py-4 last:border-b-0" {...rest}>
      <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function ReportBuilder({ spec, onChange }: { spec: ReportSpec; onChange: (s: ReportSpec) => void }) {
  const dims = DIMS[spec.entity];
  const set = (p: Partial<ReportSpec>) => onChange({ ...spec, ...p });
  const activeFilters = Object.keys(spec.filters).length;

  return (
    <aside className="rounded-xl border bg-card shadow-card">
      <Section title="Count" {...tourTarget('reports-entity')}>
        <Segmented<ReportEntity>
          className="w-full [&>*]:flex-1 [&>*]:justify-center"
          value={spec.entity}
          onChange={entity =>
            onChange({
              ...spec,
              entity,
              groupBy: DIMS[entity][0].key,
              splitBy: null,
              filters: {},
              filterLabels: {},
              viz: spec.viz === 'trend' ? 'trend' : 'bar',
            })
          }
          options={[
            { value: 'spocs', label: 'SPOCs', icon: ContactRound },
            { value: 'clients', label: 'Clients', icon: Building2 },
          ]}
        />
      </Section>

      <Section title="Group & split" {...tourTarget('reports-group')}>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Rows — group by</Label>
          <Select
            value={spec.groupBy}
            onValueChange={groupBy => set({ groupBy, splitBy: spec.splitBy === groupBy ? null : spec.splitBy })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dims.map(d => (
                <SelectItem key={d.key} value={d.key}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Columns — split by</Label>
            {spec.splitBy && (
              <button
                type="button"
                title="Swap rows and columns"
                onClick={() => set({ groupBy: spec.splitBy!, splitBy: spec.groupBy })}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <ArrowLeftRight className="size-3" /> Swap
              </button>
            )}
          </div>
          <Select
            value={spec.splitBy ?? NONE}
            onValueChange={v =>
              set({
                splitBy: v === NONE ? null : v,
                viz: v === NONE ? (spec.viz === 'stacked' ? 'bar' : spec.viz) : spec.viz === 'bar' || spec.viz === 'donut' ? 'stacked' : spec.viz,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No split</SelectItem>
              {dims
                .filter(d => d.key !== spec.groupBy)
                .map(d => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Show top</Label>
          <Select value={String(spec.limit)} onValueChange={v => set({ limit: Number(v) })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 20, 50, 100, 200].map(n => (
                <SelectItem key={n} value={String(n)}>
                  {n} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title={`Filters${activeFilters ? ` · ${activeFilters}` : ''}`} {...tourTarget('reports-filters')}>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Created from</Label>
            <Input type="date" className="h-7 text-xs" value={spec.from ?? ''} onChange={e => set({ from: e.target.value || null })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">to</Label>
            <Input type="date" className="h-7 text-xs" value={spec.to ?? ''} onChange={e => set({ to: e.target.value || null })} />
          </div>
        </div>
        {FILTERS[spec.entity].map(def => (
          <div key={def.key} className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{def.label}</Label>
            <FilterControl
              def={def}
              value={spec.filters[def.key]}
              label={spec.filterLabels?.[def.key]}
              onChange={(v, label) => {
                const filters = { ...spec.filters };
                const filterLabels = { ...(spec.filterLabels ?? {}) };
                if (v) {
                  filters[def.key] = v;
                  if (label) filterLabels[def.key] = label;
                } else {
                  delete filters[def.key];
                  delete filterLabels[def.key];
                }
                set({ filters, filterLabels });
              }}
            />
          </div>
        ))}
        {(activeFilters > 0 || spec.from || spec.to) && (
          <button
            type="button"
            onClick={() => set({ filters: {}, filterLabels: {}, from: null, to: null })}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" /> Clear filters
          </button>
        )}
      </Section>
    </aside>
  );
}
