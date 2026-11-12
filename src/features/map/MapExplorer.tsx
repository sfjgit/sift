// File: MapExplorer.tsx
// Path: src/features/map/MapExplorer.tsx
//
// The map with its floating panel: Offices / SPOCs, colour by, height by,
// 3D / flat, and a legend that is also a filter (click a group to hide it).
// Full page on /map; small on a client's Locations tab (fit, compact).

'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Building2, Map as MapIcon, Users } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  COLOUR_BY,
  SPOC_COLOURS,
  buildLegend,
  heightsWithData,
  type ClientMapData,
  type ColourBy,
  type HeightBy,
} from './types';

// WebGL — browser only, loaded with the first map on screen
const OfficeMap = dynamic(() => import('./OfficeMap'), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-xl" />,
});

const rgb = (c: [number, number, number]) => `rgb(${c.join(',')})`;
const count = (n: number, one: string) =>
  `${n.toLocaleString('en-IN')} ${one}${n === 1 ? '' : 's'}`;

export function MapExplorer({
  data,
  search = '',
  fit = false,
  compact = false,
  initialMode = 'offices',
}: {
  data: ClientMapData;
  /** client, city, state, industry or SPOC name */
  search?: string;
  fit?: boolean;
  compact?: boolean;
  initialMode?: 'offices' | 'spocs';
}) {
  const [mode, setMode] = useState<'offices' | 'spocs'>(initialMode);
  const [colourBy, setColourBy] = useState<ColourBy>('type');
  const [heightBy, setHeightBy] = useState<HeightBy>('csrSpend');
  // the clean map first (clusters, like Google Maps); 3D pins on request
  const [threeD, setThreeD] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hiddenSpocs, setHiddenSpocs] = useState<Set<string>>(new Set());

  const s = search.trim().toLowerCase();
  const points = useMemo(
    () =>
      s
        ? data.points.filter(p =>
            [p.client, p.place, p.state, p.industry].some(v => v?.toLowerCase().includes(s))
          )
        : data.points,
    [data.points, s]
  );
  const spocsAll = useMemo(
    () =>
      s
        ? data.spocs.filter(x =>
            [x.name, x.client, x.designation].some(v => v?.toLowerCase().includes(s))
          )
        : data.spocs,
    [data.spocs, s]
  );
  const spocs = spocsAll.filter(x => !hiddenSpocs.has(x.approvalStatus));

  const legend = useMemo(() => buildLegend(points, colourBy), [points, colourBy]);
  const heights = useMemo(() => heightsWithData(data.points), [data.points]);
  const height = heights.some(h => h.value === heightBy) ? heightBy : (heights[0]?.value ?? 'same');

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const spocCounts = Object.fromEntries(
    Object.keys(SPOC_COLOURS).map(k => [k, spocsAll.filter(x => x.approvalStatus === k).length])
  );

  return (
    <div className="relative size-full">
      <OfficeMap
        points={points}
        spocs={spocs}
        mode={mode}
        colourBy={colourBy}
        heightBy={height}
        legend={legend}
        hidden={hidden}
        threeD={threeD}
        fit={fit}
      />

      <div
        className={cn(
          'pointer-events-auto absolute top-3 left-3 w-60 space-y-2.5 rounded-xl border bg-card/92 p-3 text-xs shadow-float backdrop-blur',
          compact && 'p-2.5'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {data.canSpocs ? (
            <Segmented
              size="xs"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'offices', label: 'Offices', icon: Building2 },
                { value: 'spocs', label: 'SPOCs', icon: Users },
              ]}
            />
          ) : (
            <span className="font-medium">Offices</span>
          )}
          {mode === 'offices' && (
            <Segmented
              size="xs"
              value={threeD ? '3d' : 'flat'}
              onChange={v => setThreeD(v === '3d')}
              options={[
                { value: 'flat', icon: MapIcon, title: 'Map — nearby offices grouped' },
                { value: '3d', icon: Box, title: '3D pins' },
              ]}
            />
          )}
        </div>

        <p className="text-[13px] font-semibold tabular-nums">
          {mode === 'offices'
            ? `${count(points.length, 'office')} · ${count(new Set(points.map(p => p.clientId)).size, 'client')}`
            : `${count(spocs.length, 'SPOC')} · ${count(new Set(spocs.map(x => x.clientId)).size, 'client')}`}
        </p>

        {mode === 'offices' ? (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="space-y-1">
                <span className="text-muted-foreground">Colour by</span>
                <Select
                  value={colourBy}
                  onValueChange={v => {
                    setColourBy(v as ColourBy);
                    setHidden(new Set());
                  }}
                >
                  <SelectTrigger size="sm" className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOUR_BY.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className={cn('space-y-1', !threeD && 'opacity-50')}>
                <span className="text-muted-foreground">Height by</span>
                <Select
                  value={height}
                  onValueChange={v => setHeightBy(v as HeightBy)}
                  disabled={!threeD}
                >
                  <SelectTrigger size="sm" className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {heights.map(h => (
                      <SelectItem key={h.value} value={h.value} title={h.hint}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <ul className={cn('space-y-0.5 overflow-y-auto', compact ? 'max-h-32' : 'max-h-64')}>
              {legend.map(l => (
                <li key={l.key}>
                  <button
                    type="button"
                    onClick={() => setHidden(h => toggle(h, l.key))}
                    title={hidden.has(l.key) ? 'Show' : 'Hide'}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted',
                      hidden.has(l.key) && 'opacity-40'
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: rgb(l.rgb) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{l.label}</span>
                    <span className="text-muted-foreground tabular-nums">{l.count}</span>
                  </button>
                </li>
              ))}
            </ul>
            {data.withoutCoords > 0 && !compact && (
              <p className="text-muted-foreground">
                {data.withoutCoords} more offices without a map position
              </p>
            )}
          </>
        ) : (
          <>
            <ul className="space-y-0.5">
              {Object.entries(SPOC_COLOURS).map(([k, c]) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setHiddenSpocs(h => toggle(h, k))}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted',
                      hiddenSpocs.has(k) && 'opacity-40'
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: rgb(c.rgb) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    <span className="text-muted-foreground tabular-nums">{spocCounts[k]}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              SPOCs sit around their office; without one, around the client’s main office.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
