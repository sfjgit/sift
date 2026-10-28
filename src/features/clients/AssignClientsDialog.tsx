// File: AssignClientsDialog.tsx
// Path: src/features/clients/AssignClientsDialog.tsx
//
// Who works a client. One client: the people list becomes exactly what is
// picked. Several clients: add / remove / replace the picked people.
// Assigned people see the client and can run the pipeline for it; the SPOCs
// each of them finds stay theirs. Needs clients.assign; the picker only lists
// people inside that scope.

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/forms/fields';
import { FormDialog } from '@/components/forms/FormDialog';
import { UserPicker } from '@/components/pickers/pickers';
import { UserAvatar } from '@/components/common/UserAvatar';
import { clientHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { clientsApi } from '@/lib/api/endpoints';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Person } from '@/types/api';
import type { ClientListItem } from '@/types/crm';

type Mode = 'add' | 'remove' | 'replace';

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'add', label: 'Add', hint: 'Keep who is there, add these people' },
  { value: 'remove', label: 'Remove', hint: 'Take these people off' },
  { value: 'replace', label: 'Replace', hint: 'Only these people from now on' },
];

export function AssignClientsDialog({
  clients,
  open,
  onOpenChange,
  onDone,
}: {
  clients: Pick<ClientListItem, 'id' | 'name' | 'assignments'>[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}) {
  const single = clients.length === 1 ? clients[0]! : null;
  const [people, setPeople] = useState<Person[]>(() =>
    single ? single.assignments.map(a => a.user) : []
  );
  const [mode, setMode] = useState<Mode>('add');
  const [note, setNote] = useState('');

  const save = useAction(
    () =>
      single
        ? clientsApi.setAssignments(
            single.id,
            people.map(p => p.id),
            note || undefined
          )
        : clientsApi.bulkAssign(
            clients.map(c => c.id),
            people.map(p => p.id),
            mode,
            note || undefined
          ),
    {
      success: r =>
        r.added || r.removed ? `${r.added} added, ${r.removed} removed` : 'Nothing changed',
      invalidate: [clientHooks.keys.all],
      onSuccess: () => {
        onOpenChange(false);
        onDone?.();
      },
    }
  );

  const add = (id: string | null, label?: string) => {
    if (!id || people.some(p => p.id === id)) return;
    const [firstName = label ?? '', ...rest] = (label ?? '').split(' ');
    setPeople(p => [...p, { id, firstName, lastName: rest.join(' ') }]);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={single ? `Who works ${single.name}?` : `Assign ${clients.length} clients`}
      description="Assigned people see the client and can run the pipeline for it. The SPOCs each person finds are theirs — others don’t see them; managers see their team’s."
      submitLabel="Save"
      busy={save.isPending}
      submitDisabled={!single && !people.length}
      onSubmit={() => save.mutate(undefined)}
    >
      <Field label="People" hint="Only people you are allowed to assign are listed.">
        <div className="space-y-2">
          <UserPicker
            purpose="client_assign"
            value={null}
            onChange={(v, o) => add(v, o?.label)}
            placeholder="Add a person…"
          />
          {people.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {people.map(p => (
                <li
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-surface py-0.5 pr-1 pl-0.5 text-[13px]"
                >
                  <UserAvatar person={p} size="xs" />
                  {fullName(p)}
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove ${fullName(p)}`}
                    onClick={() => setPeople(x => x.filter(y => y.id !== p.id))}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {single
                ? 'Nobody — only its creator, SPOC handlers and admins will see it.'
                : 'Pick at least one person.'}
            </p>
          )}
        </div>
      </Field>

      {!single && (
        <Field label="What to do">
          <div role="radiogroup" className="grid gap-1.5 sm:grid-cols-3">
            {MODES.map(m => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border bg-surface px-3 py-2 text-left text-[13px] font-medium transition-colors hover:border-primary/40',
                  mode === m.value && 'border-primary bg-primary/5 ring-1 ring-primary/30'
                )}
              >
                {m.label}
                <span className="text-xs font-normal text-muted-foreground">{m.hint}</span>
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Note (optional)" hint="Sent to the people you add.">
        <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} />
      </Field>
    </FormDialog>
  );
}
