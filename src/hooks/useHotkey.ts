// File: useHotkey.ts
// Path: src/hooks/useHotkey.ts

'use client';

import { useEffect, useRef } from 'react';

/** Single-key page shortcut ("n" = new). Ignored while typing or when a dialog is open. */
export function useHotkey(key: string, handler: () => void, enabled = true) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== key) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return;
      if (document.querySelector('[role=dialog],[role=menu]')) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, enabled]);
}
