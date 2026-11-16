// File: usePageStats.ts
// Path: src/hooks/usePageStats.ts
//
// Open / closed state of a list page's Stats panel. Remembered in this browser,
// and opened when the assistant is told "show stats" (PAGE_STATS_EVENT).

'use client';

import { useCallback, useEffect, useState } from 'react';
import { PAGE_STATS_EVENT } from '@/features/ai/speech';

export function usePageStats(page: string) {
  const key = `crm:${page}-stats-open`;
  const [open, setOpen] = useState(false);

  const save = useCallback(
    (next: boolean) => {
      setOpen(next);
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        /* not remembered */
      }
    },
    [key]
  );

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount (no localStorage on the server)
      setOpen(localStorage.getItem(key) === '1');
    } catch {
      /* closed */
    }
    const show = (e: Event) => {
      if ((e as CustomEvent<boolean | undefined>).detail === false) return save(false);
      save(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener(PAGE_STATS_EVENT, show);
    return () => window.removeEventListener(PAGE_STATS_EVENT, show);
  }, [key, save]);

  return [open, () => save(!open)] as const;
}
