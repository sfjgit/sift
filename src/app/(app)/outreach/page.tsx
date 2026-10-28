// File: page.tsx
// Path: src/app/(app)/outreach/page.tsx
//
// Outreach across all clients: every pack the pipeline wrote, by where it is
// (Draft → Reviewed → Sent → Replied / No reply / Bounced). People send from
// Outlook and track it here, so nothing goes out unreviewed or is forgotten.

'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { Mail, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { OUTREACH_STATUS } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { OutreachPackCard } from '@/features/outreach/OutreachPackCard';
import { outreachApi } from '@/lib/api/endpoints';
import type { OutreachStatus } from '@/types/crm';

const TABS: (OutreachStatus | 'ALL')[] = ['ALL', 'DRAFT', 'REVIEWED', 'SENT', 'REPLIED', 'NO_REPLY', 'BOUNCED'];

function OutreachPage() {
  const [tab, setTab] = useState<OutreachStatus | 'ALL'>('DRAFT');
  const [search, setSearch] = useState('');
  const [q] = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['outreach', 'all', tab, q, page],
    queryFn: () => outreachApi.list({ ...(tab !== 'ALL' && { status: tab }), search: q || undefined, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const by = query.data?.meta.byStatus ?? {};
  const all = Object.values(by).reduce((n, v) => n + (v ?? 0), 0);
  const pages = query.data?.meta.pages ?? 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Outreach"
        description="Every email pack the pipeline wrote. Review it, send each mail from your Outlook, mark it sent here, then record the reply — so nothing goes out unchecked or gets forgotten."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={v => {
            setTab(v as typeof tab);
            setPage(1);
          }}
        >
          <TabsList className="flex-wrap">
            {TABS.map(t => (
              <TabsTrigger key={t} value={t}>
                {t === 'ALL' ? 'All' : OUTREACH_STATUS[t].label}
                <span className="ml-1 text-xs text-muted-foreground">{t === 'ALL' ? all : (by[t] ?? 0)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search client or SPOC"
            className="pl-8"
          />
        </div>
      </div>

      {tab !== 'ALL' && <p className="text-sm text-muted-foreground">{OUTREACH_STATUS[tab].hint}.</p>}

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data?.data.length ? (
        <EmptyState
          icon={Mail}
          title={tab === 'ALL' ? 'No outreach written yet' : `Nothing in ${OUTREACH_STATUS[tab].label}`}
          description="Packs appear here after “Write outreach emails” runs for approved SPOCs."
        />
      ) : (
        <div className="space-y-3">
          {query.data.data.map(p => (
            <OutreachPackCard key={p.id} pack={p} showClient />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="outreach.read">
      <OutreachPage />
    </RequirePermission>
  );
}
