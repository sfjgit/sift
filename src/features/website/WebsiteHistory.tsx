// File: WebsiteHistory.tsx
// Path: src/features/website/WebsiteHistory.tsx
//
// Every website a client has had: who changed it, when, old → new, and how
// (the website check, or by hand). Opened from the client header.

'use client';

import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/common/states';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDate, fullName, hostOf } from '@/lib/format';

const VIA = {
  website_check: 'found by the website check',
  suggestion_manual: 'typed after a website check',
  edit: 'edited by hand',
} as const;

export function WebsiteHistory({ clientId }: { clientId: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon-xs" variant="ghost" aria-label="Website history" title="Website history">
          <History />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0">
        <HistoryList clientId={clientId} />
      </PopoverContent>
    </Popover>
  );
}

function HistoryList({ clientId }: { clientId: string }) {
  const q = useQuery({
    queryKey: ['website-history', clientId],
    queryFn: () => clientsApi.websiteHistory(clientId),
  });
  return (
    <div>
      <p className="border-b px-3 py-2 text-sm font-semibold">Website history</p>
      {q.isLoading ? (
        <div className="p-4">
          <Spinner />
        </div>
      ) : !q.data?.length ? (
        <p className="p-3 text-xs text-muted-foreground">Not changed since it was added.</p>
      ) : (
        <ol className="max-h-80 divide-y overflow-y-auto">
          {q.data.map(h => (
            <li key={h.id} className="space-y-0.5 px-3 py-2 text-[13px]">
              <p className="break-all">
                <span className="text-muted-foreground line-through">
                  {h.old ? hostOf(h.old) : '—'}
                </span>
                {' → '}
                {h.new ? (
                  <a
                    href={h.new}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {hostOf(h.new)}
                  </a>
                ) : (
                  '—'
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {h.by ? fullName(h.by) : 'System'} · {fmtDate(h.at)} · {VIA[h.via] ?? h.via}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
