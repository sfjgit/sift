// File: InlineField.tsx
// Path: src/components/record/InlineField.tsx
//
// Record-page fields, Zoho style: a grid of "label  value" rows. Hover a value
// and a pencil appears; click it and the value turns into its input right
// there (Enter / ✓ saves, Esc / ✕ cancels). There are no popup dialogs.
//
//   <FieldGrid>
//     <InlineText label="Designation" value={s.designation} canEdit onSave={v => save({ designation: v })} />
//     <InlinePick label="Status" display={s.status?.label} value={s.status?.id} canEdit
//                 onSave={v => save({ statusId: v })} render={p => <LookupPicker type="X" {...p} />} />
//   </FieldGrid>

'use client';

import { useState, type ReactNode } from 'react';
import { Check, Loader2, Lock, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/** two columns of rows on wide screens, one on phones */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid gap-x-10 md:grid-cols-2', className)}>{children}</dl>;
}

export function Empty({ children = '—' }: { children?: ReactNode }) {
  return <span className="text-muted-foreground/60">{children}</span>;
}

/** one "label  value" row; `wide` spans both columns */
export function FieldRow({
  label,
  wide,
  children,
}: {
  label: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid min-h-10 grid-cols-[132px_minmax(0,1fr)] items-start gap-3 border-b border-border/50 py-1.5',
        wide && 'md:col-span-2'
      )}
    >
      <dt className="pt-1 text-[13px] leading-5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-[14px] leading-5">{children}</dd>
    </div>
  );
}

/** the read view of an editable value: hover shows the pencil, click edits */
function ValueView({
  canEdit,
  onEdit,
  children,
}: {
  canEdit: boolean;
  onEdit: () => void;
  children: ReactNode;
}) {
  if (!canEdit) return <div className="py-1 break-words">{children}</div>;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={e => {
        // links and buttons inside the value keep working
        if ((e.target as HTMLElement).closest('a,button')) return;
        onEdit();
      }}
      onKeyDown={e => e.key === 'Enter' && onEdit()}
      className="group/v -mx-1.5 flex min-h-7 cursor-text items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1 break-words">{children}</div>
      <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover/v:opacity-100" />
    </div>
  );
}

function useSaving() {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (e) {
      toast.error((e as ApiError).message ?? 'Couldn’t save');
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function EditActions({ busy, onSave, onCancel }: { busy: boolean; onSave?: () => void; onCancel: () => void }) {
  return (
    <span className="flex shrink-0 gap-1">
      {onSave && (
        <button
          type="button"
          aria-label="Save"
          disabled={busy}
          onClick={onSave}
          className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </button>
      )}
      <button
        type="button"
        aria-label="Cancel"
        disabled={busy}
        onClick={onCancel}
        className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {busy && !onSave ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      </button>
    </span>
  );
}

/** free text / email / phone / url / number; blank saves as null */
export function InlineText({
  label,
  value,
  display,
  canEdit,
  onSave,
  multiline,
  type = 'text',
  placeholder,
  wide,
  locked,
}: {
  label: ReactNode;
  value: string | number | null | undefined;
  /** what the read view shows (defaults to the value) */
  display?: ReactNode;
  canEdit: boolean;
  onSave: (next: string | null) => Promise<unknown>;
  multiline?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number';
  placeholder?: string;
  wide?: boolean;
  /** shown instead of the value when the caller may not see it */
  locked?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const { busy, run } = useSaving();
  const current = value === null || value === undefined ? '' : String(value);

  const save = async () => {
    const next = draft.trim();
    if (next === current) return setEditing(false);
    if (await run(() => onSave(next || null))) setEditing(false);
  };

  if (locked)
    return (
      <FieldRow label={label} wide={wide}>
        <span className="inline-flex items-center gap-1 py-1 text-[13px] text-muted-foreground">
          <Lock className="size-3" /> Hidden for your role
        </span>
      </FieldRow>
    );

  return (
    <FieldRow label={label} wide={wide}>
      {editing ? (
        <div className="flex items-start gap-1.5">
          {multiline ? (
            <Textarea
              autoFocus
              rows={4}
              value={draft}
              placeholder={placeholder}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setEditing(false);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
              }}
              className="min-h-20 text-[14px]"
            />
          ) : (
            <Input
              autoFocus
              type={type}
              inputMode={type === 'number' ? 'decimal' : undefined}
              value={draft}
              placeholder={placeholder}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setEditing(false);
                if (e.key === 'Enter') save();
              }}
              className="h-7 text-[14px]"
            />
          )}
          <EditActions busy={busy} onSave={save} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <ValueView
          canEdit={canEdit}
          onEdit={() => {
            setDraft(current);
            setEditing(true);
          }}
        >
          {display ?? (current ? <span className={multiline ? 'whitespace-pre-line' : undefined}>{current}</span> : <Empty />)}
        </ValueView>
      )}
    </FieldRow>
  );
}

export interface InlinePickRenderProps {
  value: string | null;
  onChange: (v: string | null) => void;
  defaultOpen: boolean;
  size: 'sm';
  disabled: boolean;
}

/** a picker (lookup, master, location…): choosing an option saves at once */
export function InlinePick({
  label,
  value,
  display,
  canEdit,
  onSave,
  render,
  wide,
}: {
  label: ReactNode;
  value: string | null | undefined;
  display?: ReactNode;
  canEdit: boolean;
  onSave: (next: string | null) => Promise<unknown>;
  render: (p: InlinePickRenderProps) => ReactNode;
  wide?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { busy, run } = useSaving();
  return (
    <FieldRow label={label} wide={wide}>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            {render({
              value: value ?? null,
              defaultOpen: true,
              size: 'sm',
              disabled: busy,
              onChange: async v => {
                if (v === (value ?? null)) return setEditing(false);
                if (await run(() => onSave(v))) setEditing(false);
              },
            })}
          </div>
          <EditActions busy={busy} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <ValueView canEdit={canEdit} onEdit={() => setEditing(true)}>
          {display ?? <Empty />}
        </ValueView>
      )}
    </FieldRow>
  );
}

/** Yes / No / not set, saved on click */
export function InlineBool({
  label,
  value,
  canEdit,
  onSave,
  yes = 'Yes',
  no = 'No',
}: {
  label: ReactNode;
  value: boolean | null | undefined;
  canEdit: boolean;
  onSave: (next: boolean) => Promise<unknown>;
  yes?: string;
  no?: string;
}) {
  const { busy, run } = useSaving();
  if (!canEdit)
    return (
      <FieldRow label={label}>
        <div className="py-1">{value === true ? yes : value === false ? no : <Empty />}</div>
      </FieldRow>
    );
  const pill = (v: boolean) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => value !== v && run(() => onSave(v))}
      className={cn(
        'rounded-full border px-2.5 py-px text-[12px] font-medium disabled:opacity-60',
        value === v
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted'
      )}
    >
      {v ? yes : no}
    </button>
  );
  return (
    <FieldRow label={label}>
      <div className="flex gap-1 py-1">
        {pill(true)}
        {pill(false)}
      </div>
    </FieldRow>
  );
}
