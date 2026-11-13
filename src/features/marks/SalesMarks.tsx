// File: SalesMarks.tsx
// Path: src/features/marks/SalesMarks.tsx
//
// The small inline "sales marks" (CASPA parity, 12 Nov 2026), shared by the
// clients and SPOCs tables and the detail pages:
//  - Key account star: per user on clients (many), one holder on SPOCs
//  - Data flag pills on SPOCs (contact / email / both wrong)
//  - Project tags (Admin → Lookups → Projects)
//  - CSR eligible Yes / No on clients
// Every control saves on click; there are no extra dialogs.

'use client';

import { useMemo, useState } from 'react';
import { Check, Lock, Plus, Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/features/auth/AuthProvider';
import { clientHooks, spocHooks, useLookups } from '@/hooks/queries';
import { clientsApi, spocsApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ClientListItem, Spoc, SpocDataFlag } from '@/types/crm';

/** runs a save, refreshes the lists, shows the error if any */
function useSave() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (done) toast.success(done);
      qc.invalidateQueries({ queryKey: clientHooks.keys.all });
      qc.invalidateQueries({ queryKey: spocHooks.keys.all });
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/**
 * What the cell shows: the saved value right after a save, until the row is
 * refetched (a new server value). Lists in scroll mode never refetch earlier
 * pages, and a refetch takes a second or two — the cell must not wait for it.
 */
function useShown<T>(server: T) {
  const [local, setLocal] = useState<{ base: T; value: T } | null>(null);
  const shown = local && Object.is(local.base, server) ? local.value : server;
  return [shown, (value: T) => setLocal({ base: server, value })] as const;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

// ── key account ──────────────────────────────────────────────────────────────

/** client star: mine is filled; the count shows how many others starred it */
export function ClientKeyStar({ client }: { client: ClientListItem }) {
  const { user } = useAuth();
  const { busy, run } = useSave();
  const [shownStars, setStars] = useShown(client.keyAccounts);
  const stars = shownStars ?? [];
  const mine = stars.some(k => k.user.id === user?.id);
  const others = stars.length - (mine ? 1 : 0);
  const names = stars.map(k => fullName(k.user)).join(', ');
  return (
    <button
      type="button"
      data-no-row-click
      disabled={busy}
      onClick={e => {
        stop(e);
        run(async () => setStars((await clientsApi.toggleKeyAccount(client.id)).keyAccounts));
      }}
      title={
        stars.length
          ? `Key account of ${names}${mine ? '' : ' — click to add yourself'}`
          : 'Mark as my key account'
      }
      className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
    >
      <Star className={cn('size-4', mine ? 'fill-warning text-warning' : others && 'text-warning')} />
      {others > 0 && <span className="text-xs tabular">{mine ? `+${others}` : others}</span>}
    </button>
  );
}

/** SPOC star: one holder. Someone else's star shows locked (an admin can take it). */
export function SpocKeyStar({ spoc, canEdit }: { spoc: Spoc; canEdit: boolean }) {
  const { user } = useAuth();
  const { busy, run } = useSave();
  const [holder, setHolder] = useShown(spoc.keyAccountUser);
  const mine = !!holder && holder.id === user?.id;
  const locked = !!holder && !mine && !user?.isSuperAdmin;
  if (locked || !canEdit) {
    return holder ? (
      <span
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        title={`Key account of ${fullName(holder)}`}
      >
        <Star className={cn('size-4', mine ? 'fill-warning text-warning' : 'text-warning')} />
        {!mine && <Lock className="size-3" />}
      </span>
    ) : (
      <span className="text-muted-foreground/50">—</span>
    );
  }
  return (
    <button
      type="button"
      data-no-row-click
      disabled={busy}
      onClick={e => {
        stop(e);
        run(async () => setHolder((await spocsApi.toggleKeyAccount(spoc.id)).keyAccountUser));
      }}
      title={
        mine
          ? 'Your key account — click to remove'
          : holder
            ? `Key account of ${fullName(holder)} — click to take over (admin)`
            : 'Mark as my key account'
      }
      className="inline-flex items-center rounded px-1 py-0.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
    >
      <Star className={cn('size-4', mine ? 'fill-warning text-warning' : holder && 'text-warning')} />
    </button>
  );
}

// ── data flag ────────────────────────────────────────────────────────────────

export const DATA_FLAG: Record<SpocDataFlag, { label: string; short: string; hint: string }> = {
  CONTACT_WRONG: { label: 'Wrong contact', short: 'Contact', hint: 'The phone number is wrong' },
  EMAIL_WRONG: { label: 'Wrong email', short: 'Email', hint: 'The email address is wrong' },
  BOTH_WRONG: {
    label: 'Both wrong',
    short: 'Both',
    hint: 'Phone and email are wrong — hidden from lists unless you filter for it',
  },
};

/** three pills; click the picked one again to clear */
export function DataFlagPills({ spoc, canEdit }: { spoc: Spoc; canEdit: boolean }) {
  const { busy, run } = useSave();
  const [flag, setFlag] = useShown(spoc.dataFlag);
  const flags = Object.keys(DATA_FLAG) as SpocDataFlag[];
  if (!canEdit)
    return flag ? (
      <span className="text-xs font-medium text-destructive">{DATA_FLAG[flag].label}</span>
    ) : (
      <span className="text-muted-foreground/50">—</span>
    );
  return (
    <span className="inline-flex gap-1" data-no-row-click onClick={stop}>
      {flags.map(f => {
        const on = flag === f;
        return (
          <button
            key={f}
            type="button"
            disabled={busy}
            title={on ? `${DATA_FLAG[f].hint} — click to clear` : DATA_FLAG[f].hint}
            onClick={() =>
              run(
                async () => setFlag((await spocsApi.update(spoc.id, { dataFlag: on ? null : f })).dataFlag),
                f === 'BOTH_WRONG' && !on ? 'Flagged — hidden from the list' : undefined
              )
            }
            className={cn(
              'rounded-full border px-2 py-px text-[11px] font-medium transition-colors disabled:opacity-50',
              on
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive'
            )}
          >
            {DATA_FLAG[f].short}
          </button>
        );
      })}
    </span>
  );
}

// ── projects ─────────────────────────────────────────────────────────────────

/** PROJECT labels for a set of ids (for cells and exports) */
export function useProjectLabels() {
  const { data } = useLookups('PROJECT', { includeInactive: true });
  return useMemo(() => {
    const byId = new Map((data ?? []).map(l => [l.id, l.label]));
    return (ids: string[] | undefined) => (ids ?? []).map(id => byId.get(id) ?? '?');
  }, [data]);
}

/** chips + a "+" picker; every tick saves at once */
export function ProjectTags({
  ids: savedIds,
  canEdit,
  onSave,
  setBy,
}: {
  ids: string[];
  canEdit: boolean;
  onSave: (next: string[]) => Promise<unknown>;
  /** "who · when" shown on hover */
  setBy?: string;
}) {
  const { data: options = [] } = useLookups('PROJECT', { includeInactive: true });
  const { busy, run } = useSave();
  const [ids, setIds] = useShown(savedIds);
  const label = (id: string) => options.find(o => o.id === id)?.label ?? '?';
  const chips = (
    <span className="flex gap-1 whitespace-nowrap" title={setBy}>
      {ids.length ? (
        ids.map(id => (
          <span
            key={id}
            className="rounded-full bg-primary/10 px-2 py-px text-[11px] font-medium text-primary"
          >
            {label(id)}
          </span>
        ))
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )}
    </span>
  );
  if (!canEdit) return chips;
  const active = options.filter(o => o.isActive || ids.includes(o.id));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-no-row-click
          onClick={stop}
          className="group inline-flex items-center gap-1 rounded px-0.5 hover:bg-muted"
        >
          {chips}
          <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start" onClick={stop}>
        <p className="px-2 py-1 text-xs text-muted-foreground">Projects</p>
        {active.map(o => {
          const on = ids.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              disabled={busy}
              onClick={() => {
                const next = on ? ids.filter(x => x !== o.id) : [...ids, o.id];
                run(async () => {
                  await onSave(next);
                  setIds(next);
                });
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded border',
                  on && 'border-primary bg-primary text-primary-foreground'
                )}
              >
                {on && <Check className="size-3" />}
              </span>
              {o.label}
            </button>
          );
        })}
        {!active.length && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No projects yet — add them in Admin → Lookups → Projects.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── CSR eligible ─────────────────────────────────────────────────────────────

/** Yes / No; click the picked one again to clear */
export function CsrEligibleToggle({ client, canEdit }: { client: ClientListItem; canEdit: boolean }) {
  const { busy, run } = useSave();
  const [v, setV] = useShown(client.csrEligible);
  if (!canEdit)
    return v === null ? (
      <span className="text-muted-foreground/50">—</span>
    ) : (
      <span className={cn('text-xs font-medium', v ? 'text-success' : 'text-muted-foreground')}>
        {v ? 'Yes' : 'No'}
      </span>
    );
  const pill = (val: boolean) => {
    const on = v === val;
    return (
      <button
        type="button"
        disabled={busy}
        title={on ? 'Click to clear' : undefined}
        onClick={() =>
          run(async () => {
            const next = on ? null : val;
            await clientsApi.update(client.id, { csrEligible: next });
            setV(next);
          })
        }
        className={cn(
          'rounded-full border px-2 py-px text-[11px] font-medium disabled:opacity-50',
          on
            ? val
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-border bg-muted text-foreground'
            : 'border-border text-muted-foreground hover:bg-muted'
        )}
      >
        {val ? 'Yes' : 'No'}
      </button>
    );
  };
  return (
    <span className="inline-flex gap-1" data-no-row-click onClick={stop}>
      {pill(true)}
      {pill(false)}
    </span>
  );
}
