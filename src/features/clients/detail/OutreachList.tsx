// File: OutreachList.tsx
// Path: src/features/clients/detail/OutreachList.tsx
//
// Generated outreach packs (first mail + follow-ups) for a client or a SPOC.

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Copy, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { outreachApi } from '@/lib/api/endpoints';
import { fmtDate, fullName } from '@/lib/format';

export function OutreachList({ clientId, spocId }: { clientId?: string; spocId?: string }) {
  const q = useQuery({
    queryKey: ['outreach', clientId ?? '', spocId ?? ''],
    queryFn: () => outreachApi.list({ clientId, spocId, limit: 50 }),
  });

  if (q.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.data.length)
    return (
      <EmptyState
        icon={Mail}
        title="No outreach generated yet"
        description="Personalised first mails and follow-ups appear here once the pipeline drafts them."
      />
    );

  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Couldn’t copy')
    );

  return (
    <Accordion type="multiple" defaultValue={[q.data.data[0].id]} className="rounded-xl border bg-card px-4 shadow-card">
      {q.data.data.map(pack => (
        <AccordionItem key={pack.id} value={pack.id}>
          <AccordionTrigger>
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/spocs/${pack.spoc.id}`} className="font-medium hover:text-primary" onClick={e => e.stopPropagation()}>
                {fullName(pack.spoc)}
              </Link>
              {pack.spoc.designation && <span className="text-xs font-normal text-muted-foreground">{pack.spoc.designation}</span>}
              <Pill dot={false}>{pack.messages.length} messages</Pill>
              <span className="text-xs font-normal text-muted-foreground">{fmtDate(pack.createdAt)}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-foreground">
            {pack.messages
              .slice()
              .sort((a, b) => a.sequenceNo - b.sequenceNo)
              .map(m => (
                <div key={m.id} className="rounded-lg border bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {m.sequenceNo === 0 ? 'First mail' : `Follow-up ${m.sequenceNo}`}
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => copy(`Subject: ${m.subject}\n\n${m.body}`)}>
                      <Copy /> Copy
                    </Button>
                  </div>
                  <p className="mt-1 text-sm font-medium">{m.subject}</p>
                  <p className="mt-2 text-[13px] whitespace-pre-line text-muted-foreground">{m.body}</p>
                </div>
              ))}
            {pack.model && <p className="text-[11px] text-muted-foreground">Drafted by {pack.model}</p>}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
