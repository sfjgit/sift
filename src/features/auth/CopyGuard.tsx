// File: CopyGuard.tsx
// Path: src/features/auth/CopyGuard.tsx
//
// Client and SPOC data must not leave the app: for everyone but the super
// admin, page text can't be selected, copied or cut. Typing fields (inputs,
// text areas, editors) still work normally so people can edit and paste.

'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { usePermissions } from './usePermissions';

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

export function CopyGuard() {
  const { isSuperAdmin } = usePermissions();

  useEffect(() => {
    if (isSuperAdmin) return;
    const root = document.documentElement;
    root.classList.add('no-copy');
    // text can't be selected; input boxes and editors stay selectable (they ignore this)
    const before = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    document.body.style.setProperty('-webkit-user-select', 'none');
    let warned = 0;
    const block = (e: ClipboardEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.(EDITABLE)) return;
      e.preventDefault();
      if (Date.now() - warned > 4000) {
        warned = Date.now();
        toast.info('Copying is turned off to protect client data.');
      }
    };
    document.addEventListener('copy', block, true);
    document.addEventListener('cut', block, true);
    return () => {
      root.classList.remove('no-copy');
      document.body.style.userSelect = before;
      document.body.style.removeProperty('-webkit-user-select');
      document.removeEventListener('copy', block, true);
      document.removeEventListener('cut', block, true);
    };
  }, [isSuperAdmin]);

  return null;
}
