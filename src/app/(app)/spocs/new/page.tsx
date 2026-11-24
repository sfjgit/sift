// File: page.tsx
// Path: src/app/(app)/spocs/new/page.tsx
// New SPOC — a full page; ?clientId= preselects the client (from a client page's "Add SPOC").

'use client';

import { useSearchParams } from 'next/navigation';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { SpocFormDialog } from '@/features/spocs/SpocFormDialog';

function NewSpoc() {
  const clientId = useSearchParams().get('clientId') ?? undefined;
  return <SpocFormDialog asPage pageClientId={clientId} />;
}

export default function Page() {
  return (
    <RequirePermission perm="spocs.create">
      <NewSpoc />
    </RequirePermission>
  );
}
