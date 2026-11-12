// File: OfficeMap.tsx
// Path: src/features/map/OfficeMap.tsx
//
// The CRM's map (MapLibre, CARTO Voyager / Dark Matter tiles — no key).
//   Map view (default): like Google Maps — nearby offices (or SPOCs) merge into
//     a numbered bubble that splits as you zoom in; single ones are clean dots
//     with the client's name once you are close. Click a bubble to zoom in.
//   3D view: a thin pin per office (deck.gl), height = the chosen measure.
// Used full screen on /map and small on a client's Locations tab (fit = zoom
// to its offices). Browser only — load it with next/dynamic.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox';
import { ColumnLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import {
  Layer,
  Map as MapGL,
  NavigationControl,
  Popup,
  Source,
  useControl,
  type MapLayerMouseEvent,
  type MapRef,
} from 'react-map-gl/maplibre';
import { setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  SPOC_COLOURS,
  categoryOf,
  heightValue,
  type ColourBy,
  type HeightBy,
  type LegendItem,
  type MapPoint,
  type MapSpoc,
  type RGB,
} from './types';

// the worker from public/ (scripts/copy-maplibre-worker.mjs): the bundler breaks the library's own path to it
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

const STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};
const FONT = ['Montserrat SemiBold', 'Open Sans Bold'];
const INDIA = { longitude: 80.5, latitude: 22, zoom: 4.2, pitch: 0, bearing: 0 };
const TILT = { pitch: 50, bearing: -12 };
const MAX_HEIGHT = 160_000; // metres, the tallest 3D pin
const MIN_HEIGHT = 6_000;

const hex = (c: RGB) => `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
const crore = (rs: number) =>
  `₹${rs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; // in full, like everywhere else

// people at the same office: a tiny ring (~40 m) so they come apart at street level
const jitter = (i: number): [number, number] => {
  if (i === 0) return [0, 0];
  const ring = Math.floor((i - 1) / 8) + 1;
  const angle = ((i - 1) % 8) * (Math.PI / 4) + ring * 0.4;
  return [Math.cos(angle) * 0.0004 * ring, Math.sin(angle) * 0.0004 * ring];
};

type Hover = { lng: number; lat: number; kind: 'office' | 'spoc'; id: string };

export default function OfficeMap({
  points,
  spocs = [],
  mode = 'offices',
  colourBy,
  heightBy,
  legend,
  hidden,
  threeD,
  fit = false,
}: {
  points: MapPoint[];
  spocs?: MapSpoc[];
  mode?: 'offices' | 'spocs';
  colourBy: ColourBy;
  heightBy: HeightBy;
  legend: LegendItem[];
  /** legend keys switched off */
  hidden: Set<string>;
  threeD: boolean;
  /** zoom to the points instead of all-India (the client page) */
  fit?: boolean;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const mapRef = useRef<MapRef>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const offices = mode === 'offices';

  const shown = useMemo(
    () => points.filter(p => !hidden.has(categoryOf(p, colourBy, legend)?.key ?? '')),
    [points, hidden, colourBy, legend]
  );
  const colour = (p: MapPoint): RGB => categoryOf(p, colourBy, legend)?.rgb ?? [148, 163, 184];
  const pointById = useMemo(() => new Map(points.map(p => [p.id, p])), [points]);
  const spocById = useMemo(() => new Map(spocs.map(s => [s.id, s])), [spocs]);

  // ── map view: GeoJSON the map clusters itself
  const geojson = useMemo(() => {
    if (offices) {
      return {
        type: 'FeatureCollection' as const,
        features: shown.map(p => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
          properties: {
            id: p.id,
            kind: 'office',
            color: hex(colour(p)),
            label: p.client,
            primary: p.isPrimary ? 1 : 0,
          },
        })),
      };
    }
    const seen = new Map<string, number>();
    return {
      type: 'FeatureCollection' as const,
      features: spocs.map(s => {
        const i = seen.get(s.officeId) ?? 0;
        seen.set(s.officeId, i + 1);
        const [dx, dy] = jitter(i);
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [s.lng + dx, s.lat + dy] },
          properties: {
            id: s.id,
            kind: 'spoc',
            color: hex(SPOC_COLOURS[s.approvalStatus]?.rgb ?? [148, 163, 184]),
            label: s.name,
            primary: 0,
          },
        };
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offices, shown, spocs, colourBy, legend]);

  // ── 3D view: thin pins (offices only)
  const maxLog = useMemo(
    () => Math.max(1e-6, ...points.map(p => Math.log10(1 + (heightValue(p, heightBy) ?? 0)))),
    [points, heightBy]
  );
  const pins = new ColumnLayer<MapPoint>({
    id: 'office-pins',
    data: shown,
    diskResolution: 16,
    radius: 2_400,
    extruded: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 220],
    material: { ambient: 0.55, diffuse: 0.6, shininess: 40, specularColor: [255, 255, 255] },
    getPosition: p => [p.lng, p.lat],
    getFillColor: p => [...colour(p), 235],
    getElevation: p =>
      heightBy === 'same'
        ? MAX_HEIGHT * 0.35
        : MIN_HEIGHT +
          (Math.log10(1 + (heightValue(p, heightBy) ?? 0)) / maxLog) * (MAX_HEIGHT - MIN_HEIGHT),
    updateTriggers: { getElevation: [heightBy, maxLog], getFillColor: [colourBy, legend] },
    transitions: { getElevation: { duration: 700 } },
  });
  const use3D = threeD && offices;

  // 3D ↔ map: tilt, keep where the user is looking
  useEffect(() => {
    mapRef.current?.easeTo({ ...(use3D ? TILT : { pitch: 0, bearing: 0 }), duration: 700 });
  }, [use3D]);

  const onMove = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f || f.layer.id !== 'one') return setHover(null);
    const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
    setHover({ lng, lat, kind: f.properties.kind, id: f.properties.id });
  };

  const onClick = async (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) return;
    if (f.layer.id === 'clusters') {
      // open the bubble: zoom to where it splits
      const src = mapRef.current?.getSource('points') as GeoJSONSource | undefined;
      const zoom = await src?.getClusterExpansionZoom(f.properties.cluster_id);
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      mapRef.current?.easeTo({
        center: [lng, lat],
        zoom: (zoom ?? e.target.getZoom() + 2) + 0.3,
        duration: 600,
      });
      return;
    }
    if (f.properties.kind === 'spoc') router.push(`/spocs/${f.properties.id}`);
    else router.push(`/clients/${pointById.get(f.properties.id)?.clientId}`);
  };

  const tooltip3d = ({ object }: PickingInfo<MapPoint>) =>
    object ? { html: card(object), style: { borderRadius: '10px', padding: '8px 10px' } } : null;

  return (
    <MapGL
      ref={mapRef}
      initialViewState={INDIA}
      maxPitch={70}
      mapStyle={dark ? STYLES.dark : STYLES.light}
      attributionControl={{ compact: true }}
      style={{ position: 'absolute', inset: 0 }}
      interactiveLayerIds={use3D ? [] : ['clusters', 'one']}
      onMouseMove={use3D ? undefined : onMove}
      onMouseLeave={() => setHover(null)}
      onClick={use3D ? undefined : onClick}
      cursor={hover ? 'pointer' : undefined}
      // the first view once the map is ready (asked for earlier, it can be lost)
      onLoad={e => {
        const m = e.target;
        if (fit && points.length) {
          const lngs = points.map(p => p.lng);
          const lats = points.map(p => p.lat);
          m.fitBounds(
            [
              [Math.min(...lngs) - 0.05, Math.min(...lats) - 0.05],
              [Math.max(...lngs) + 0.05, Math.max(...lats) + 0.05],
            ],
            { padding: 70, maxZoom: 12, duration: 0 }
          );
        }
        if (use3D) m.easeTo({ ...TILT, duration: 0 });
      }}
    >
      <NavigationControl position="bottom-right" visualizePitch />

      {!use3D && (
        <Source
          id="points"
          type="geojson"
          data={geojson}
          cluster
          clusterMaxZoom={13}
          clusterRadius={48}
        >
          <Layer
            id="clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#818cf8',
                10,
                '#6366f1',
                50,
                '#4f46e5',
                200,
                '#4338ca',
              ],
              'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 50, 24, 200, 30],
              'circle-stroke-width': 3,
              'circle-stroke-color': dark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)',
              'circle-opacity': 0.92,
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': FONT,
              'text-size': 12,
            }}
            paint={{ 'text-color': '#ffffff' }}
          />
          <Layer
            id="one"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4,
                ['+', 5, ['get', 'primary']],
                12,
                ['+', 8, ['get', 'primary']],
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': dark ? '#0f172a' : '#ffffff',
            }}
          />
          <Layer
            id="one-label"
            type="symbol"
            minzoom={7}
            filter={['!', ['has', 'point_count']]}
            layout={{
              'text-field': ['get', 'label'],
              'text-font': FONT,
              'text-size': 11,
              'text-offset': [0, 1.1],
              'text-anchor': 'top',
              'text-max-width': 10,
              'text-optional': true,
            }}
            paint={{
              'text-color': dark ? '#e2e8f0' : '#1e293b',
              'text-halo-color': dark ? '#0f172a' : '#ffffff',
              'text-halo-width': 1.5,
            }}
          />
        </Source>
      )}

      {use3D && (
        <DeckOverlay
          interleaved={false}
          layers={[pins]}
          getTooltip={tooltip3d as never}
          getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
          onClick={({ object }) => {
            if (object) router.push(`/clients/${(object as MapPoint).clientId}`);
          }}
        />
      )}

      {hover && !use3D && (
        <Popup
          longitude={hover.lng}
          latitude={hover.lat}
          closeButton={false}
          closeOnClick={false}
          offset={12}
          maxWidth="300px"
          className="crm-map-popup"
        >
          <div
            // built from escaped text only
            dangerouslySetInnerHTML={{
              __html:
                hover.kind === 'office'
                  ? card(pointById.get(hover.id)!)
                  : spocCard(spocById.get(hover.id)!),
            }}
          />
        </Popup>
      )}
    </MapGL>
  );
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

const card = (p: MapPoint) => {
  if (!p) return '';
  const facts = [
    p.csrSpentRs !== null && `CSR spend ${crore(p.csrSpentRs)}`,
    `${p.clientSpocs} SPOC${p.clientSpocs === 1 ? '' : 's'}`,
    `${p.reports} report${p.reports === 1 ? '' : 's'}`,
    p.employees !== null
      ? `${p.employees.toLocaleString('en-IN')} employees`
      : p.employeeSize && esc(p.employeeSize),
  ].filter(Boolean);
  return `<div style="font:13px/1.45 system-ui">
    <b>${esc(p.client)}</b><br/>${esc(p.typeLabel)}${p.isPrimary ? ' · main office' : ''}${p.name ? ` — ${esc(p.name)}` : ''}
    <br/><span style="opacity:.7">${esc(p.place ?? '')}${p.industry ? ` · ${esc(p.industry)}` : ''}</span>
    <br/>${facts.join(' · ')}<br/><span style="opacity:.55">Click to open the client</span></div>`;
};

const spocCard = (s: MapSpoc) =>
  !s
    ? ''
    : `<div style="font:13px/1.45 system-ui"><b>${esc(s.name)}</b>${s.designation ? `<br/>${esc(s.designation)}` : ''}
    <br/><span style="opacity:.7">${esc(s.client)}${s.atOwnOffice ? '' : ' · at the main office'}</span>
    <br/>${esc(SPOC_COLOURS[s.approvalStatus]?.label ?? s.approvalStatus)}${s.validationBand ? ` · ${esc(s.validationBand.toLowerCase().replace('_', ' '))}` : ''}
    <br/><span style="opacity:.55">Click to open the SPOC</span></div>`;

// deck.gl inside the MapLibre map (one camera)
function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}
