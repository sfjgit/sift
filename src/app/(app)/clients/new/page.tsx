// File: page.tsx
// Path: src/app/(app)/clients/new/page.tsx
// New client — a full page with the add-ons (registration, CSR profile, government, contact & group).

'use client';

import { RequirePermission } from '@/features/auth/RequirePermission';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';

export default function Page() {
  return (
    <RequirePermission perm="clients.create">
      <ClientFormDialog asPage />
    </RequirePermission>
  );
}
