// File: TechnologyTab.tsx
// Path: src/features/clients/detail/TechnologyTab.tsx
//
// One card per TECH_CATEGORY lookup (Cloud, Cyber security, ERP…). Filled cards
// show what the client uses / needs; empty ones invite you to add it.

'use client';

import { useState } from 'react';
import { Cpu, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FormDialog } from '@/components/forms/FormDialog';
import { Field } from '@/components/forms/fields';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { clientHooks, useLookups } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtRelative, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ClientDetail } from '@/types/crm';

export function TechnologyTab({ client }: { client: ClientDetail }) {
  const { can } = usePermissions();
  const confirm = useConfirm();
  const { data: categories = [], isLoading } = useLookups('TECH_CATEGORY');
  const [editing, setEditing] = useState<{
    categoryId: string;
    label: string;
    details: string;
  } | null>(null);
  const canEdit = can('client_technologies.update');
  const canRemove = can('client_technologies.delete');
  const key = clientHooks.keys.detail(client.id);

  const save = useAction(
    (v: { categoryId: string; details: string }) =>
      clientsApi.saveTechnology(client.id, v.categoryId, v.details),
    { success: 'Saved', invalidate: [key], onSuccess: () => setEditing(null) }
  );
  const remove = useAction((id: string) => clientsApi.removeTechnology(client.id, id), {
    success: 'Removed',
    invalidate: [key],
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const byCategory = new Map(client.technologies.map(t => [t.category.id, t]));
  // also show filled categories whose lookup was deactivated
  const cards = [
    ...categories.map(c => ({ id: c.id, label: c.label })),
    ...client.technologies
      .filter(t => !categories.some(c => c.id === t.category.id))
      .map(t => t.category),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        What the client runs today and where they need help — {client.technologies.length} of{' '}
        {cards.length} areas captured.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(c => {
          const t = byCategory.get(c.id);
          return (
            <article
              key={c.id}
              className={cn(
                'group flex flex-col rounded-xl border p-4 transition-colors',
                t ? 'bg-card shadow-card' : 'border-dashed bg-transparent'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Cpu className={cn('size-4', t ? 'text-primary' : 'text-muted-foreground')} />{' '}
                  {c.label}
                </span>
                {(canEdit || canRemove) && t && (
                  <span className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Edit ${c.label}`}
                        onClick={() =>
                          setEditing({ categoryId: c.id, label: c.label, details: t.details })
                        }
                      >
                        <Pencil />
                      </Button>
                    )}
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${c.label}`}
                        onClick={async () => {
                          if (
                            await confirm({
                              title: `Remove ${c.label}?`,
                              destructive: true,
                              confirmLabel: 'Remove',
                            })
                          )
                            remove.mutate(t.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </span>
                )}
              </div>
              {t ? (
                <>
                  <p className="mt-2 flex-1 text-[13px] whitespace-pre-line">{t.details}</p>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {t.addedBy ? fullName(t.addedBy) : 'Pipeline'} · {fmtRelative(t.updatedAt)}
                  </p>
                </>
              ) : canEdit ? (
                <button
                  type="button"
                  onClick={() => setEditing({ categoryId: c.id, label: c.label, details: '' })}
                  className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="size-3.5" /> Add details
                </button>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Not captured</p>
              )}
            </article>
          );
        })}
      </div>

      <FormDialog
        open={!!editing}
        onOpenChange={o => !o && setEditing(null)}
        size="sm"
        title={editing?.label ?? ''}
        description="What they use or need in this area."
        onSubmit={() =>
          editing?.details.trim() &&
          save.mutate({ categoryId: editing.categoryId, details: editing.details.trim() })
        }
        busy={save.isPending}
      >
        <Field label="Details" required>
          <Textarea
            autoFocus
            rows={5}
            maxLength={2000}
            value={editing?.details ?? ''}
            placeholder="e.g. AWS + Azure hybrid, evaluating GCP for analytics"
            onChange={e => setEditing(s => (s ? { ...s, details: e.target.value } : s))}
          />
        </Field>
      </FormDialog>
    </div>
  );
}
