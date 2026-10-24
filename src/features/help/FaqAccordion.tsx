// File: FaqAccordion.tsx
// Path: src/features/help/FaqAccordion.tsx
//
// FAQ list used by the help center and the in-page help sheet. Each answer
// ends with "Was this helpful?" — one vote per FAQ per browser (remembered in
// localStorage) so the counters stay meaningful.

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EyeOff, Pencil, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/common/badges';
import { MarkdownLite } from '@/components/common/MarkdownLite';
import { faqsApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/lib/api/client';
import type { Faq } from '@/types/org';

const VOTES_KEY = 'crm:faq-votes';
type Vote = 'up' | 'down';

const readVotes = (): Record<string, Vote> => {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const writeVote = (id: string, vote: Vote) => {
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify({ ...readVotes(), [id]: vote }));
  } catch {
    /* private mode — vote still counted server-side, just not remembered */
  }
};

export function FaqFeedback({ faq }: { faq: Faq }) {
  const [vote, setVote] = useState<Vote | undefined>(() =>
    typeof window === 'undefined' ? undefined : readVotes()[faq.id]
  );
  const [busy, setBusy] = useState(false);

  const send = async (helpful: boolean) => {
    if (vote || busy) return;
    setBusy(true);
    try {
      await faqsApi.feedback(faq.id, helpful);
      const v: Vote = helpful ? 'up' : 'down';
      writeVote(faq.id, v);
      setVote(v);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  if (vote)
    return (
      <p className="text-xs text-muted-foreground">
        {vote === 'up' ? 'Thanks — glad it helped.' : 'Thanks — we’ll use that to improve this answer.'}
      </p>
    );

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Was this helpful?</span>
      <Button variant="ghost" size="icon-xs" aria-label="Yes, this was helpful" disabled={busy} onClick={() => send(true)}>
        <ThumbsUp />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="No, this wasn’t helpful" disabled={busy} onClick={() => send(false)}>
        <ThumbsDown />
      </Button>
    </div>
  );
}

export function FaqAccordion({
  faqs,
  manage,
  onEdit,
  onDelete,
  className,
}: {
  faqs: Faq[];
  /** admin mode: drafts are badged, edit / delete per item */
  manage?: boolean;
  onEdit?: (faq: Faq) => void;
  onDelete?: (faq: Faq) => void;
  className?: string;
}) {
  return (
    <Accordion type="multiple" className={cn('w-full', className)}>
      {faqs.map(f => (
        <AccordionItem key={f.id} value={f.id}>
          <AccordionTrigger className={cn(!f.isPublished && 'text-muted-foreground')}>
            <span className="flex flex-wrap items-center gap-2">
              {f.question}
              {manage && !f.isPublished && (
                <Pill tone="warning" dot={false}>
                  <EyeOff className="size-3" /> Draft
                </Pill>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <MarkdownLite text={f.answer} className="text-[13.5px] leading-relaxed text-foreground/85" />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {f.isPublished ? <FaqFeedback faq={f} /> : <span className="text-xs">Not visible to users yet.</span>}
              {manage && (
                <div className="flex items-center gap-1">
                  <span className="mr-2 text-xs text-muted-foreground tabular">
                    👍 {f.helpfulCount} · 👎 {f.notHelpfulCount}
                  </span>
                  {onEdit && (
                    <Button variant="ghost" size="xs" onClick={() => onEdit(f)}>
                      <Pencil /> Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="xs" className="text-destructive" onClick={() => onDelete(f)}>
                      <Trash2 /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
