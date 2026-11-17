// File: AssetsSections.tsx
// Path: src/features/clients/detail/AssetsSections.tsx
//
// "Sales assets" (pitch deck, sales brief) and "Marketing assets" (per-SPOC
// email / LinkedIn / WhatsApp templates) — the CASPA sections. The engine that
// builds decks and templates isn't connected yet, so each card shows a
// work-in-progress state; the personalised email card already shows the
// outreach draft the pipeline wrote for the chosen SPOC.

'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Linkedin,
  Mail,
  MailOpen,
  MessageCircle,
  Presentation,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pill } from '@/components/common/badges';
import { outreachApi } from '@/lib/api/endpoints';
import { fmtRelative } from '@/lib/format';

/** a small "being built" drawing: a page on a board with a gear and sparkles */
export function WipArt({ className = 'h-24' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden fill="none">
      <rect x="8" y="96" width="144" height="4" rx="2" className="fill-muted" />
      <rect
        x="34"
        y="14"
        width="70"
        height="82"
        rx="8"
        className="fill-card stroke-border"
        strokeWidth="2"
      />
      <rect x="45" y="28" width="40" height="6" rx="3" className="fill-primary/25" />
      <rect x="45" y="42" width="48" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="45" y="51" width="44" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="45" y="60" width="30" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="45" y="72" width="22" height="12" rx="3" className="fill-primary/15" />
      <g className="origin-[112px_62px] animate-[spin_6s_linear_infinite] motion-reduce:animate-none">
        <circle
          cx="112"
          cy="62"
          r="13"
          className="fill-primary/10 stroke-primary"
          strokeWidth="2.5"
        />
        <circle cx="112" cy="62" r="4.5" className="fill-primary" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
          <rect
            key={a}
            x="110"
            y="44"
            width="4"
            height="6"
            rx="1"
            className="fill-primary"
            transform={`rotate(${a} 112 62)`}
          />
        ))}
      </g>
      <path d="M128 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" className="fill-warning" />
      <path
        d="M22 40l1.5 3.5 3.5 1.5-3.5 1.5L22 50l-1.5-3.5L17 45l3.5-1.5z"
        className="fill-primary/60"
      />
    </svg>
  );
}

function AssetCard({
  icon: Icon,
  title,
  what,
  children,
  live,
}: {
  icon: LucideIcon;
  title: string;
  what: string;
  children?: ReactNode;
  /** real content to show instead of the work-in-progress state */
  live?: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </span>
        {live ? (
          <Pill tone="success">Available</Pill>
        ) : (
          <Pill tone="warning">Work in progress</Pill>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{what}</p>
      {live ?? (
        <div className="mt-2 flex flex-1 flex-col items-center justify-center gap-1 py-2 text-center">
          <WipArt />
          <p className="text-xs text-muted-foreground">
            Being built — this will fill in automatically.
          </p>
        </div>
      )}
      <div className="mt-3 flex gap-2">{children}</div>
    </div>
  );
}

/** a button that will work once the engine is connected */
function Soon({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button size="sm" variant="outline" disabled>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Coming soon</TooltipContent>
    </Tooltip>
  );
}

export function SalesAssets() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        What sales takes into the meeting. Requested here; the engine builds them and they appear
        for everyone on this client.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <AssetCard
          icon={Presentation}
          title="Pitch deck (PPT)"
          what="A partnership proposal deck made from this client’s CSR record: why now, their CSR snapshot, where we fit, three ways to start, proof."
        >
          <Soon>Request deck</Soon>
        </AssetCard>
        <AssetCard
          icon={ClipboardList}
          title="Sales brief"
          what="An internal one-pager: snapshot, CSR themes, programmes to upgrade, primary SPOC, the wedge and guardrails."
        >
          <Soon>Request brief</Soon>
        </AssetCard>
      </div>
    </div>
  );
}

export function MarketingAssets({
  clientId,
  spocs,
}: {
  clientId: string;
  spocs: { id: string; name: string }[];
}) {
  const [spocId, setSpocId] = useState<string | null>(null);
  const current = spocId ?? spocs[0]?.id ?? null;

  // the personalised email = the outreach draft the pipeline wrote for this SPOC
  const draft = useQuery({
    queryKey: ['outreach', clientId, current ?? ''],
    queryFn: () => outreachApi.list({ clientId, spocId: current!, limit: 1 }),
    enabled: !!current,
  });
  const pack = draft.data?.data[0];
  const first = pack?.messages[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Templates for</span>
        {spocs.length ? (
          <Select value={current ?? undefined} onValueChange={setSpocId}>
            <SelectTrigger className="h-8 w-64">
              <SelectValue placeholder="Pick a SPOC" />
            </SelectTrigger>
            <SelectContent>
              {spocs.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">— add a SPOC first</span>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <AssetCard
          icon={Mail}
          title="Generic email"
          what="One email for every SPOC of this client."
        >
          <Soon>Request</Soon>
        </AssetCard>
        <AssetCard
          icon={MailOpen}
          title="Personalised email"
          what="Written for this SPOC from their role and the client’s CSR work."
          live={
            first ? (
              <div className="mt-2 flex-1 rounded-lg bg-surface px-3 py-2">
                <p className="text-[13px] font-semibold">{first.subject}</p>
                <p className="mt-1 line-clamp-5 text-xs whitespace-pre-wrap text-muted-foreground">
                  {first.body}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {pack.messages.length} mail{pack.messages.length === 1 ? '' : 's'} · written{' '}
                  {fmtRelative(pack.createdAt)} · full drafts under Outreach
                </p>
              </div>
            ) : undefined
          }
        >
          {!first && <Soon>Request</Soon>}
        </AssetCard>
        <AssetCard
          icon={Linkedin}
          title="LinkedIn message"
          what="A short connection note and follow-up for this SPOC."
        >
          <Soon>Request</Soon>
        </AssetCard>
        <AssetCard
          icon={MessageCircle}
          title="WhatsApp message"
          what="A brief, friendly first message for this SPOC."
        >
          <Soon>Request</Soon>
        </AssetCard>
      </div>
      <div className="flex justify-end">
        <Soon>Request campaign</Soon>
      </div>
    </div>
  );
}
