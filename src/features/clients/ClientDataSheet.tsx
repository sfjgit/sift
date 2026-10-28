// File: ClientDataSheet.tsx
// Path: src/features/clients/ClientDataSheet.tsx
//
// Opened from the clients list "Have" icons: what the CRM holds for one client
// — reports (view / download), the SPOCs you can see, CSR figures and
// programmes, email packs — without leaving the list.

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  ReceiptIndianRupee,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApprovalBadge, BandBadge, OutreachStatusBadge } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { usePermissions } from '@/features/auth/usePermissions';
import { clientHooks } from '@/hooks/queries';
import { clientsApi, outreachApi, spocsApi } from '@/lib/api/endpoints';
import { fmtDate, fmtInr, fullName } from '@/lib/format';

export type DataTab = 'reports' | 'spocs' | 'figures' | 'emails';

const TABS: { value: DataTab; label: string; icon: typeof FileText }[] = [
  { value: 'reports', label: 'Reports', icon: FileText },
  { value: 'spocs', label: 'SPOCs', icon: Users },
  { value: 'figures', label: 'CSR figures', icon: ReceiptIndianRupee },
  { value: 'emails', label: 'Emails', icon: Mail },
];

function Loading() {
  return <Skeleton className="h-32 w-full rounded-lg" />;
}

function Reports({ clientId }: { clientId: string }) {
  const { can } = usePermissions();
  const q = clientHooks.useDetail(clientId);
  if (!can('client_documents.read'))
    return <EmptyState icon={FileText} title="You can’t view documents" />;
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const docs = q.data?.documents ?? [];
  if (!docs.length)
    return (
      <EmptyState
        icon={FileText}
        title="No reports yet"
        description="Run “Find CSR reports” for this client."
      />
    );

  // a fresh signed link per click; download = the browser saves it
  const open = async (docId: string, download: boolean) => {
    try {
      const { url } = await clientsApi.documentUrl(clientId, docId, download);
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.rel = 'noopener';
        a.click();
      } else window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open the document');
    }
  };

  return (
    <ul className="divide-y rounded-lg border">
      {docs.map(d => (
        <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{d.type.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              FY {d.fy} · {d.fileName ?? 'file'}
            </p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            title="View"
            aria-label={`View ${d.type.label}`}
            onClick={() => open(d.id, false)}
          >
            <Eye />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title="Download"
            aria-label={`Download ${d.type.label}`}
            onClick={() => open(d.id, true)}
          >
            <Download />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Spocs({ clientId }: { clientId: string }) {
  const q = useQuery({
    queryKey: ['spocs', 'client-sheet', clientId],
    queryFn: () => spocsApi.list({ clientId, limit: 50 }),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const rows = q.data?.data ?? [];
  if (!rows.length)
    return (
      <EmptyState
        icon={Users}
        title="No SPOCs you can see"
        description="SPOCs found by other people stay with them. Find your own with the pipeline or add one."
      />
    );
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map(s => (
        <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{fullName(s)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[s.designation, s.email].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <BandBadge band={s.validationBand} score={s.validationScore} />
          <ApprovalBadge status={s.approvalStatus} />
        </li>
      ))}
    </ul>
  );
}

function Figures({ clientId }: { clientId: string }) {
  const { can } = usePermissions();
  const q = clientHooks.useDetail(clientId);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const fin = q.data?.financials ?? [];
  const progs = q.data?.programs ?? [];
  if (!can('client_financials.read') && !can('client_programs.read'))
    return <EmptyState icon={ReceiptIndianRupee} title="You can’t view CSR figures" />;
  if (!fin.length && !progs.length)
    return (
      <EmptyState
        icon={ReceiptIndianRupee}
        title="No CSR figures yet"
        description="Run “CSR figures & programs” after the reports are in."
      />
    );
  return (
    <div className="space-y-4">
      {fin.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-[13px]">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">FY</th>
                <th className="px-3 py-2 text-right font-medium">Obligation</th>
                <th className="px-3 py-2 text-right font-medium">Spent</th>
                <th className="px-3 py-2 text-right font-medium">Unspent</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fin.map(f => (
                <tr key={f.id}>
                  <td className="px-3 py-2">{f.fy}</td>
                  <td className="px-3 py-2 text-right tabular">
                    {fmtInr(f.obligationRs ?? f.budgetRs)}
                  </td>
                  <td className="px-3 py-2 text-right tabular">{fmtInr(f.spentRs)}</td>
                  <td className="px-3 py-2 text-right tabular">{fmtInr(f.unspentRs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {progs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Programmes ({progs.length})
          </p>
          <ul className="divide-y rounded-lg border">
            {progs.slice(0, 30).map(p => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">FY {p.fy}</span>
                {p.budgetRs && (
                  <span className="shrink-0 text-xs tabular">{fmtInr(p.budgetRs)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Emails({ clientId }: { clientId: string }) {
  const q = useQuery({
    queryKey: ['outreach', 'client-sheet', clientId],
    queryFn: () => outreachApi.list({ clientId, limit: 50 }),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const packs = q.data?.data ?? [];
  if (!packs.length)
    return (
      <EmptyState
        icon={Mail}
        title="No email packs you can see"
        description="Run “Write outreach emails” for your approved SPOCs."
      />
    );
  return (
    <ul className="divide-y rounded-lg border">
      {packs.map(p => (
        <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{fullName(p.spoc)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {p.messages.filter(m => m.sentAt).length} of {p.messages.length} sent · written{' '}
              {fmtDate(p.createdAt)}
            </p>
          </div>
          <OutreachStatusBadge status={p.status} />
        </li>
      ))}
    </ul>
  );
}

export function ClientDataSheet({
  client,
  tab,
  onTabChange,
  onOpenChange,
}: {
  client: { id: string; name: string } | null;
  tab: DataTab;
  onTabChange: (t: DataTab) => void;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Sheet open={!!client} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{client?.name}</SheetTitle>
          <SheetDescription>
            What the CRM holds for this client. SPOCs and emails: only the ones you can see.
          </SheetDescription>
        </SheetHeader>
        {client && (
          <Tabs
            value={tab}
            onValueChange={v => onTabChange(v as DataTab)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <TabsList className="mx-5 mt-3 w-auto self-start">
              {TABS.map(t => (
                <TabsTrigger key={t.value} value={t.value}>
                  <t.icon /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <TabsContent value="reports">
                <Reports clientId={client.id} />
              </TabsContent>
              <TabsContent value="spocs">
                <Spocs clientId={client.id} />
              </TabsContent>
              <TabsContent value="figures">
                <Figures clientId={client.id} />
              </TabsContent>
              <TabsContent value="emails">
                <Emails clientId={client.id} />
              </TabsContent>
            </div>
            <div className="border-t px-5 py-3">
              <Button asChild variant="outline" size="sm">
                <Link href={`/clients/${client.id}`}>
                  <ExternalLink /> Open the client page
                </Link>
              </Button>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
