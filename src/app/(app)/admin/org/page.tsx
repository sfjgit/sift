// File: page.tsx
// Path: src/app/(app)/admin/org/page.tsx
//
// Org structure masters, one tab each. Only the active tab's table is mounted,
// so each keeps its own URL-synced search / sort.

'use client';

import { useState } from 'react';
import { Briefcase, Building, Layers, Network } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { MASTER_META, MasterTable } from '@/features/admin/MasterTable';
import type { MasterKind } from '@/lib/api/endpoints';

const TABS: { kind: MasterKind; icon: typeof Network }[] = [
  { kind: 'business-units', icon: Building },
  { kind: 'service-lines', icon: Layers },
  { kind: 'departments', icon: Network },
  { kind: 'designations', icon: Briefcase },
];

const initialTab = (): MasterKind => {
  if (typeof window === 'undefined') return 'business-units';
  const t = new URLSearchParams(window.location.search).get('tab');
  return TABS.some(x => x.kind === t) ? (t as MasterKind) : 'business-units';
};

function OrgPage() {
  const [tab, setTab] = useState<MasterKind>(initialTab);

  const change = (next: string) => {
    // drop the previous table's search / filters from the URL before the next one reads it
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?tab=${next}`);
    setTab(next as MasterKind);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Org structure"
        description="The building blocks of your organisation. Used on user profiles, SPOCs and for scoped access."
      />
      <Tabs value={tab} onValueChange={change} className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          {TABS.map(t => (
            <TabsTrigger key={t.kind} value={t.kind} className="flex-none px-3">
              <t.icon /> {MASTER_META[t.kind].plural}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(t => (
          <TabsContent key={t.kind} value={t.kind}>
            <MasterTable kind={t.kind} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="admin.manage_lookups">
      <OrgPage />
    </RequirePermission>
  );
}
