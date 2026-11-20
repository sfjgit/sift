// File: useMediaQuery.ts
// Path: src/hooks/useMediaQuery.ts
//
// Live CSS media query match. false on the server render, real value after mount.
//   const phone = useIsPhone();   // < 768px — cards instead of grids, bottom nav

'use client';

import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** below Tailwind's md breakpoint */
export const useIsPhone = () => useMediaQuery('(max-width: 767.98px)');
