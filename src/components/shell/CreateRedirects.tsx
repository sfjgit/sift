// File: CreateRedirects.tsx
// Path: src/components/shell/CreateRedirects.tsx
//
// "New client" / "Add SPOC" everywhere (buttons, quick-add, ⌘K, the N hotkey) still call the UI store's
// openClientDialog / openSpocDialog — this turns those calls into the full create pages
// (/clients/new, /spocs/new?clientId=…), so no caller had to change.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUi } from '@/stores/ui';

export function CreateRedirects() {
  const router = useRouter();
  const clientDialog = useUi(s => s.clientDialog);
  const spocDialog = useUi(s => s.spocDialog);
  const openClientDialog = useUi(s => s.openClientDialog);
  const openSpocDialog = useUi(s => s.openSpocDialog);

  useEffect(() => {
    if (!clientDialog) return;
    openClientDialog(false);
    router.push('/clients/new');
  }, [clientDialog, openClientDialog, router]);

  useEffect(() => {
    if (!spocDialog) return;
    openSpocDialog(null);
    router.push(
      spocDialog.clientId
        ? `/spocs/new?clientId=${encodeURIComponent(spocDialog.clientId)}`
        : '/spocs/new'
    );
  }, [spocDialog, openSpocDialog, router]);

  return null;
}
