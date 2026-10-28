// File: geo.ts
// Path: src/hooks/geo.ts
//
// Country → state → city lists for forms and filters. The data never changes
// while the app runs, so it is cached for the session.

import { useQuery } from '@tanstack/react-query';
import { geoApi } from '@/lib/api/endpoints';

const forever = { staleTime: Infinity, gcTime: Infinity } as const;
const sorted = (v?: string[]) => [...(v ?? [])].sort();

export const useGeoCountries = (enabled = true) =>
  useQuery({ queryKey: ['geo', 'countries'], queryFn: geoApi.countries, ...forever, enabled });

export const useGeoStates = (countries?: string[], enabled = true) =>
  useQuery({
    queryKey: ['geo', 'states', sorted(countries)],
    queryFn: () => geoApi.states(countries),
    ...forever,
    enabled,
  });

export const useGeoCities = (
  p: { countries?: string[]; states?: string[]; q?: string; limit?: number },
  enabled = true
) =>
  useQuery({
    queryKey: ['geo', 'cities', sorted(p.countries), sorted(p.states), p.q ?? '', p.limit ?? 100],
    queryFn: () => geoApi.cities(p),
    ...forever,
    enabled,
  });
