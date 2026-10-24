// File: AssignDialog.tsx
// Path: src/features/spocs/AssignDialog.tsx
//
// Reassign one or many SPOCs. Only people inside your spocs.assign scope are
// offered; the backend re-checks every SPOC and reports what it skipped.

'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog } from '@/components/forms/FormDialog';
import { Field } from '@/components/forms/fields';
import { Textarea } from '@/components/ui/textarea';
import { UserPicker } from '@/components/pickers/pickers';
import { spocsApi } from '@/lib/api/endpoints';
import { clientHooks, spocHooks } from '@/hooks/queries';
import { fullName } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import type { Spoc } from '@/types/crm';

export function AssignDialog({
  spocs,
  open,
  onOpenChange,
  onDone,
}: {
  spocs: Pick<Spoc, 'id' | 'firstName' | 'lastName' | 'handler'>[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const [to, setTo] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const single = spocs.length === 1 ? spocs[0] : null;

  useEffect(() => {
    if (open) {
      setTo(null);
      setReason('');
      setError(undefined);
    }
  }, [open]);

  const submit = async () => {
    if (!to) return setError('Choose who should own these SPOCs');
    setBusy(true);
    try {
      if (single) {
        await spocsApi.assign(single.id, to, reason.trim() || undefined);
        toast.success(`${fullName(single)} reassigned`);
      } else {
        const r = await spocsApi.bulkAssign(
          spocs.map(s => s.id),
          to,
          reason.trim() || undefined
        );
        if (r.skipped.length) {
          toast.warning(`${r.updated} reassigned, ${r.skipped.length} skipped`, {
            description: [...new Set(r.skipped.map(s => s.reason))].join(' · '),
          });
        } else toast.success(`${r.updated} SPOCs reassigned`);
      }
      qc.invalidateQueries({ queryKey: spocHooks.keys.all });
      qc.invalidateQueries({ queryKey: clientHooks.keys.all });
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={single ? `Reassign ${fullName(single)}` : `Reassign ${spocs.length} SPOCs`}
      description={
        single
          ? `Currently handled by ${fullName(single.handler)}. The new handler gets notified.`
          : 'The new handler gets one notification with the count.'
      }
      onSubmit={submit}
      submitLabel="Reassign"
      busy={busy}
    >
      <Field label="New handler" required error={error}>
        <UserPicker
          value={to}
          onChange={v => {
            setTo(v);
            setError(undefined);
          }}
          purpose="assign"
          placeholder="Search people you can assign to…"
          invalid={!!error}
        />
      </Field>
      <Field label="Reason" hint="Optional — shown in the SPOC’s handler history.">
        <Textarea value={reason} maxLength={500} rows={3} onChange={e => setReason(e.target.value)} placeholder="e.g. Territory change" />
      </Field>
    </FormDialog>
  );
}
