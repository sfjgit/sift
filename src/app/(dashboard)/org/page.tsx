'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Network, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { OrgCanvas } from '@/components/org/OrgCanvas';
import { OrgStatsBar } from '@/components/org/OrgStatsBar';
import { UserDetailPanel } from '@/components/org/UserDetailPanel';
import type { OrgNode } from '@/components/org/types';

function CanvasSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm">Loading org tree...</span>
      </div>
    </div>
  );
}

export default function OrgPage() {
  const { user } = useAuth();
  const axios = useAxios();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useSWR<{ success: boolean; data: OrgNode }>(
    user?.id ? `/users/${user.id}/tree` : null,
    url => axios.get(url).then(r => r.data),
    { revalidateOnFocus: false }
  );

  const tree = data?.data;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* topbar */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-card shrink-0 flex-wrap">
        <div>
          <h1 className="text-base font-bold">Organisation</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Full reporting hierarchy</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, role, dept…"
            className="pl-8 h-8 w-56 text-xs"
          />
        </div>
      </div>

      {/* stats */}
      {tree && (
        <div className="px-6 py-2.5 border-b bg-muted/20 shrink-0">
          <OrgStatsBar tree={tree} />
        </div>
      )}

      {/* body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* canvas */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {isLoading ? (
            <CanvasSkeleton />
          ) : !tree ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Network className="h-10 w-10 opacity-20" />
                <p className="text-sm">No org tree available</p>
              </div>
            </div>
          ) : (
            <OrgCanvas
              tree={tree}
              searchQuery={search}
              selectedId={selectedId}
              onSelect={id => setSelectedId(prev => (prev === id ? null : id))}
            />
          )}
        </div>

        {/* right panel */}
        {selectedId && <UserDetailPanel userId={selectedId} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  );
}
