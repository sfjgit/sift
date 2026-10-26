// File: page.tsx
// Path: src/app/(app)/help/page.tsx
//
// Help center: searchable FAQs grouped by category, product tours, shortcuts.
// Help admins can switch to "Manage FAQs" to see drafts and edit content.

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { BookOpen, Keyboard, LifeBuoy, MessageCircleQuestion, Plus, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { EmptyState, ErrorState } from '@/components/common/states';
import { usePermissions } from '@/features/auth/usePermissions';
import { FaqAccordion } from '@/features/help/FaqAccordion';
import { FaqFormDialog } from '@/features/help/FaqFormDialog';
import { TourCards } from '@/features/help/TourCards';
import { useAction } from '@/hooks/useResource';
import { faqsApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils';
import { useUi } from '@/stores/ui';
import type { Faq } from '@/types/org';

function SectionTitle({ icon: Icon, title, description }: { icon: typeof BookOpen; title: string; description?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="mt-0.5 flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const confirm = useConfirm();
  const { can } = usePermissions();
  const canManage = can('help.manage');
  const [search, setSearch] = useState('');
  const [debounced] = useDebounce(search.trim(), 250);
  const [category, setCategory] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const [dialog, setDialog] = useState<{ faq: Faq | null } | null>(null);

  const managing = canManage && manage;

  const categories = useQuery({
    queryKey: ['faqs', 'categories'],
    queryFn: () => faqsApi.categories(),
    staleTime: 5 * 60_000,
  });
  const faqs = useQuery({
    queryKey: ['faqs', 'list', { search: debounced, category, managing }],
    queryFn: () =>
      faqsApi.list({
        search: debounced || undefined,
        category: category ?? undefined,
        includeUnpublished: managing || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const remove = useAction((id: string) => faqsApi.remove(id), { success: 'FAQ deleted', invalidate: [['faqs']] });

  const grouped = useMemo(() => {
    const map = new Map<string, Faq[]>();
    for (const f of faqs.data ?? []) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return [...map.entries()];
  }, [faqs.data]);

  const categoryNames = useMemo(() => {
    const set = new Set((categories.data ?? []).map(c => c.category));
    for (const f of faqs.data ?? []) set.add(f.category);
    return [...set].sort();
  }, [categories.data, faqs.data]);

  const totalPublished = (categories.data ?? []).reduce((n, c) => n + c.count, 0);

  const askDelete = async (f: Faq) => {
    const ok = await confirm({
      title: 'Delete this FAQ?',
      description: `“${f.question}” is removed for everyone, along with its feedback counts.`,
      destructive: true,
      confirmLabel: 'Delete FAQ',
    });
    if (ok) remove.mutate(f.id);
  };

  return (
    <div className="space-y-10">
      {/* hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-card px-5 py-10 shadow-card sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <LifeBuoy className="size-3.5 text-primary" /> Help center
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">How can we help?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Answers to common questions, guided tours and shortcuts for getting around the CRM.
          </p>
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions and answers…"
              aria-label="Search help"
              className="h-11 rounded-xl bg-background pr-10 pl-10 text-[15px] shadow-card"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle icon={MessageCircleQuestion} title="Frequently asked questions" />
          {canManage && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[13px]">
                <Switch checked={manage} onCheckedChange={setManage} aria-label="Manage FAQs" />
                Manage FAQs
              </label>
              {managing && (
                <Button size="sm" onClick={() => setDialog({ faq: null })}>
                  <Plus /> New FAQ
                </Button>
              )}
            </div>
          )}
        </div>

        {/* category chips */}
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {categories.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-24 rounded-full" />)
          ) : (
            <>
              <CategoryChip active={!category} onClick={() => setCategory(null)} label="All" count={totalPublished} />
              {(categories.data ?? []).map(c => (
                <CategoryChip
                  key={c.category}
                  active={category === c.category}
                  onClick={() => setCategory(category === c.category ? null : c.category)}
                  label={c.category}
                  count={c.count}
                />
              ))}
            </>
          )}
        </div>

        <div className={cn('rounded-xl border bg-card shadow-card', faqs.isFetching && !faqs.isLoading && 'opacity-80')}>
          {faqs.isLoading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className={cn('h-5', i % 2 ? 'w-2/3' : 'w-5/6')} />
              ))}
            </div>
          ) : faqs.error ? (
            <ErrorState error={faqs.error} onRetry={() => faqs.refetch()} />
          ) : grouped.length === 0 ? (
            <EmptyState
              icon={debounced || category ? Search : MessageCircleQuestion}
              title={debounced || category ? 'No answers match' : 'No FAQs yet'}
              description={
                debounced || category
                  ? 'Try different words, or clear the category filter.'
                  : managing
                    ? 'Write the first one — common questions from your team are a good start.'
                    : 'Your admins haven’t added any FAQs yet. The product tours below are a good place to start.'
              }
              action={
                debounced || category ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setCategory(null);
                    }}
                  >
                    Clear search
                  </Button>
                ) : managing ? (
                  <Button size="sm" onClick={() => setDialog({ faq: null })}>
                    <Plus /> New FAQ
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y">
              {grouped.map(([cat, list]) => (
                <div key={cat} className="px-5 py-4">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {cat} <span className="font-normal normal-case">· {list.length}</span>
                  </h3>
                  <FaqAccordion
                    faqs={list}
                    manage={managing}
                    onEdit={f => setDialog({ faq: f })}
                    onDelete={askDelete}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* tours */}
      <section>
        <SectionTitle
          icon={Sparkles}
          title="Product tours"
          description="Short guided walkthroughs that point at the real thing. Skip any time with Esc."
        />
        <TourCards />
      </section>

      {/* shortcuts + still stuck */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-card">
          <SectionTitle icon={Keyboard} title="Keyboard shortcuts" description="Get around without reaching for the mouse." />
          <ul className="space-y-2 text-[13px]">
            <li className="flex items-center justify-between">
              Search anything <Kbd>⌘ K</Kbd>
            </li>
            <li className="flex items-center justify-between">
              Focus a table’s search <Kbd>/</Kbd>
            </li>
            <li className="flex items-center justify-between">
              Show all shortcuts <Kbd>?</Kbd>
            </li>
          </ul>
          <Button variant="outline" size="sm" className="mt-auto self-start" onClick={() => useUi.getState().setShortcutsOpen(true)}>
            <Keyboard /> View all shortcuts
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-card">
          <SectionTitle
            icon={LifeBuoy}
            title="Still stuck?"
            description="Your CRM admins can grant access, fix data and reset passwords."
          />
          <p className="text-[13px] text-muted-foreground">
            When you reach out, include the page link and what you expected to happen — it gets you an answer much faster.
          </p>
          <div className="mt-auto flex flex-wrap gap-2">
            {can('users.read') && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/users">Find an admin</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/settings?tab=preferences">Replay tours in settings</Link>
            </Button>
          </div>
        </div>
      </section>

      <FaqFormDialog
        open={!!dialog}
        onOpenChange={o => !o && setDialog(null)}
        faq={dialog?.faq ?? null}
        categories={categoryNames}
        defaultCategory={category ?? undefined}
      />
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground/80 hover:border-primary/40 hover:text-foreground'
      )}
    >
      {label}
      <span className={cn('tabular', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{count}</span>
    </button>
  );
}
