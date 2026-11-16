// File: page.tsx
// Path: src/app/(app)/admin/org/page.tsx
//
// Org structure masters, one tab each. Only the active tab's table is mounted,
// so each keeps its own URL-synced search / sort.

'use client';

import { useState } from 'react';
import { Briefcase, Building, GitFork, Layers, Network } from 'lucide-react';
import { OrgView } from '@/features/org/OrgView';
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

type Tab = MasterKind | 'tree';
const initialTab = (): Tab => {
  if (typeof window === 'undefined') return 'tree';
  const t = new URLSearchParams(window.location.search).get('tab');
  return t === 'tree' || TABS.some(x => x.kind === t) ? (t as Tab) : 'tree';
};

function OrgPage() {
  const [tab, setTab] = useState<Tab>(initialTab);

  const change = (next: string) => {
    // drop the previous table's search / filters from the URL before the next one reads it
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?tab=${next}`);
    setTab(next as Tab);
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Org structure"
        description="The building blocks of your organisation. Used on user profiles, SPOCs and for scoped access."
      />
      <Tabs value={tab} onValueChange={change} className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="tree" className="flex-none px-3">
            <GitFork /> Reporting tree
          </TabsTrigger>
          {TABS.map(t => (
            <TabsTrigger key={t.kind} value={t.kind} className="flex-none px-3">
              <t.icon /> {MASTER_META[t.kind].plural}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="tree">{tab === 'tree' && <OrgView embedded />}</TabsContent>
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
    <RequirePermission perm="org.manage">
      <OrgPage />
    </RequirePermission>
  );
}
