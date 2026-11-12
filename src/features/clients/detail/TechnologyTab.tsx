// File: TechnologyTab.tsx
// Path: src/features/clients/detail/TechnologyTab.tsx
//
// One row per TECH_CATEGORY lookup (Cloud, Cyber security, ERP…): what the
// client uses / needs; empty rows invite you to add it.

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

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  const byCategory = new Map(client.technologies.map(t => [t.category.id, t]));
  // every area in the list, plus any captured under an area no longer listed
  const cards = [
    ...categories.map(c => ({ id: c.id, label: c.label })),
    ...client.technologies
      .filter(t => !categories.some(c => c.id === t.category.id))
      .map(t => t.category),
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        What the client runs today and where they need help — {client.technologies.length} of{' '}
        {cards.length} areas captured.
      </p>
      <div className="crm-box overflow-x-auto">
        <table className="crm-sheet">
          <thead>
            <tr>
              <th className="w-56">Area</th>
              <th>What they use / need</th>
              <th className="w-48">Added by</th>
              <th className="w-36">Updated</th>
              {(canEdit || canRemove) && <th className="w-20" />}
            </tr>
          </thead>
          <tbody>
            {cards.map(c => {
              const t = byCategory.get(c.id);
              return (
                <tr key={c.id}>
                  <td className="font-medium">
                    <span className="flex items-center gap-2">
                      <Cpu
                        className={cn('size-3.5', t ? 'text-primary' : 'text-muted-foreground')}
                      />
                      {c.label}
                    </span>
                  </td>
                  <td className="whitespace-pre-line">
                    {t ? (
                      t.details
                    ) : canEdit ? (
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({ categoryId: c.id, label: c.label, details: '' })
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Plus className="size-3.5" /> Add details
                      </button>
                    ) : (
                      <span className="text-muted-foreground">Not captured</span>
                    )}
                  </td>
                  <td className="text-muted-foreground">
                    {t ? (t.addedBy ? fullName(t.addedBy) : 'Pipeline') : '—'}
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {t ? fmtRelative(t.updatedAt) : '—'}
                  </td>
                  {(canEdit || canRemove) && (
                    <td className="px-1!">
                      {t && (
                        <span className="flex justify-end">
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
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
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
