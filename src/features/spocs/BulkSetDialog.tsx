// File: BulkSetDialog.tsx
// Path: src/features/spocs/BulkSetDialog.tsx
//
// One bulk action for many fields (not a button per field): pick the field,
// pick the value, apply to the selected SPOCs. PATCH /spocs/bulk-update.

'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog } from '@/components/forms/FormDialog';
import { Field } from '@/components/forms/fields';
import { Combobox } from '@/components/pickers/Combobox';
import { LookupPicker } from '@/components/pickers/pickers';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { DATA_FLAG } from '@/features/marks/SalesMarks';
import { clientHooks, spocHooks, useLookups } from '@/hooks/queries';
import { spocsApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { SpocDataFlag } from '@/types/crm';

type FieldKey = 'salesStatus' | 'dataFlag' | 'projects' | 'erp';
type ProjectMode = 'add' | 'remove' | 'replace';

const FIELDS: { value: FieldKey; label: string }[] = [
  { value: 'salesStatus', label: 'Sales status' },
  { value: 'dataFlag', label: 'Data flag' },
  { value: 'projects', label: 'Projects' },
  { value: 'erp', label: 'ERP' },
];

export function BulkSetDialog({
  spocIds,
  open,
  onOpenChange,
  onDone,
}: {
  spocIds: string[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const { data: projects = [] } = useLookups('PROJECT');
  const [field, setField] = useState<FieldKey>('salesStatus');
  const [status, setStatus] = useState<string | null>(null);
  const [flag, setFlag] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState<ProjectMode>('add');
  const [erp, setErp] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setField('salesStatus');
    setStatus(null);
    setFlag(null);
    setPicked([]);
    setMode('add');
    setErp('');
  }, [open]);

  const n = spocIds.length;

  const submit = async () => {
    // an empty value clears the field (status / flag / ERP)
    const set =
      field === 'salesStatus'
        ? { salesStatusId: status }
        : field === 'dataFlag'
          ? { dataFlag: (flag === 'NONE' ? null : flag) as SpocDataFlag | null }
          : field === 'erp'
            ? { erp: erp.trim() || null }
            : { projectIds: picked, projectMode: mode };
    if (field === 'projects' && !picked.length && mode !== 'replace')
      return toast.error('Pick at least one project');
    setBusy(true);
    try {
      const r = await spocsApi.bulkUpdate(spocIds, set);
      if (r.skipped.length)
        toast.warning(`${r.updated} updated, ${r.skipped.length} skipped`, {
          description: [...new Set(r.skipped.map(s => s.reason))].join(' · '),
        });
      else toast.success(`${r.updated} SPOC${r.updated === 1 ? '' : 's'} updated`);
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
      title={`Update ${n} SPOC${n === 1 ? '' : 's'}`}
      description="Pick a field and a value. Other fields stay as they are."
      onSubmit={submit}
      submitLabel="Apply"
      busy={busy}
    >
      <Field label="Field">
        <Segmented<FieldKey> value={field} onChange={setField} options={FIELDS} />
      </Field>

      {field === 'salesStatus' && (
        <Field label="Sales status" hint="Leave empty to clear the status.">
          <LookupPicker type="SALES_STATUS" value={status} onChange={setStatus} clearable placeholder="Choose a status…" />
        </Field>
      )}

      {field === 'dataFlag' && (
        <Field label="Data flag" hint="“Both wrong” hides these SPOCs from lists.">
          <Combobox
            value={flag}
            onChange={setFlag}
            placeholder="Choose a flag…"
            options={[
              { value: 'NONE', label: 'Clear the flag' },
              ...(Object.keys(DATA_FLAG) as SpocDataFlag[]).map(value => ({
                value,
                label: DATA_FLAG[value].label,
                hint: DATA_FLAG[value].hint,
              })),
            ]}
          />
        </Field>
      )}

      {field === 'projects' && (
        <>
          <Field label="Projects">
            <div className="flex flex-wrap gap-1.5">
              {projects.map(p => {
                const on = picked.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPicked(on ? picked.filter(x => x !== p.id) : [...picked, p.id])}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm',
                      on ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field
            label="How"
            hint={
              mode === 'add'
                ? 'Adds these; keeps the projects each SPOC already has.'
                : mode === 'remove'
                  ? 'Removes these; keeps the rest.'
                  : 'Each SPOC gets exactly these (none = clear all).'
            }
          >
            <Segmented<ProjectMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'add', label: 'Add' },
                { value: 'remove', label: 'Remove' },
                { value: 'replace', label: 'Replace' },
              ]}
            />
          </Field>
        </>
      )}

      {field === 'erp' && (
        <Field label="ERP" hint="Leave empty to clear it.">
          <Input value={erp} maxLength={100} onChange={e => setErp(e.target.value)} placeholder="e.g. SAP S/4HANA" />
        </Field>
      )}
    </FormDialog>
  );
}
