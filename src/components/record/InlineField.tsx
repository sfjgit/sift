// File: InlineField.tsx
// Path: src/components/record/InlineField.tsx
//
// Record-page fields, Zoho style: a grid of "label  value" rows. Hover a value
// and a pencil appears; click it and the value turns into its input right
// there (Enter / ✓ saves, Esc / ✕ cancels). There are no popup dialogs.
//
// Inside a RecordModeProvider (client / SPOC pages) the fields follow the page instead:
// view mode = plain values like a document; edit mode = a form (Save / Cancel for the whole page),
// and a filled value is locked for everyone but a super admin unless the field is `work`.
//
//   <FieldGrid>
//     <InlineText label="Designation" value={s.designation} canEdit onSave={v => save({ designation: v })} />
//     <InlinePick label="Status" display={s.status?.label} value={s.status?.id} canEdit
//                 onSave={v => save({ statusId: v })} render={p => <LookupPicker type="X" {...p} />} />
//   </FieldGrid>

'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { Check, Loader2, Lock, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useRecordMode } from './RecordMode';

const labelText = (l: ReactNode) => (typeof l === 'string' ? l : 'A field');

/** a filled value the user may not change (edit mode) */
function LockedValue({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-start gap-1.5 py-1 break-words text-foreground/80"
      title="Already filled — only a super admin can change it"
    >
      <div className="min-w-0 flex-1">{children}</div>
      <Lock className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
    </div>
  );
}

/**
 * edit-mode draft for one field: starts at the saved value (again after every Edit / Cancel / Save)
 * and tells the page when it differs, so the page's Save sends it
 */
function useDraft<T>(
  saved: T,
  label: ReactNode,
  save: (v: T) => Promise<unknown>,
  same: (a: T, b: T) => boolean
) {
  const m = useRecordMode();
  const key = useId();
  const stamp = `${m?.session ?? 0}|${JSON.stringify(saved)}`;
  const [draft, setDraftState] = useState(saved);
  const [seen, setSeen] = useState(stamp);
  if (seen !== stamp) {
    setSeen(stamp);
    setDraftState(saved);
  }
  const setPending = m?.setPending;
  useEffect(() => () => setPending?.(key, null), [key, setPending]);
  const setDraft = (v: T) => {
    setDraftState(v);
    setPending?.(key, same(v, saved) ? null : { label: labelText(label), run: () => save(v) });
  };
  return [draft, setDraft] as const;
}

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

function EditActions({
  busy,
  onSave,
  onCancel,
}: {
  busy: boolean;
  onSave?: () => void;
  onCancel: () => void;
}) {
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
        {busy && !onSave ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <X className="size-3.5" />
        )}
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
  work,
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
  /** daily work (status …), not data: stays changeable when filled */
  work?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const { busy, run } = useSaving();
  const current = value === null || value === undefined ? '' : String(value);
  const m = useRecordMode();
  const [formDraft, setFormDraft] = useDraft(
    current,
    label,
    v => onSave(v.trim() || null),
    (a, b) => a.trim() === b.trim()
  );

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

  const shown =
    display ??
    (current ? (
      <span className={multiline ? 'whitespace-pre-line' : undefined}>{current}</span>
    ) : (
      <Empty />
    ));
  if (m) {
    if (!m.editing || !canEdit)
      return (
        <FieldRow label={label} wide={wide}>
          <div className="py-1 break-words">{shown}</div>
        </FieldRow>
      );
    if (!m.canChange(!!current, work))
      return (
        <FieldRow label={label} wide={wide}>
          <LockedValue>{shown}</LockedValue>
        </FieldRow>
      );
    return (
      <FieldRow label={label} wide={wide}>
        {multiline ? (
          <Textarea
            rows={3}
            value={formDraft}
            placeholder={placeholder}
            onChange={e => setFormDraft(e.target.value)}
            className="min-h-16 text-[14px]"
          />
        ) : (
          <Input
            type={type}
            inputMode={type === 'number' ? 'decimal' : undefined}
            value={formDraft}
            placeholder={placeholder}
            onChange={e => setFormDraft(e.target.value)}
            className="h-8 text-[14px]"
          />
        )}
      </FieldRow>
    );
  }

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
          {display ??
            (current ? (
              <span className={multiline ? 'whitespace-pre-line' : undefined}>{current}</span>
            ) : (
              <Empty />
            ))}
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
  work,
}: {
  label: ReactNode;
  value: string | null | undefined;
  display?: ReactNode;
  canEdit: boolean;
  onSave: (next: string | null) => Promise<unknown>;
  render: (p: InlinePickRenderProps) => ReactNode;
  wide?: boolean;
  /** daily work (status …), not data: stays changeable when filled */
  work?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { busy, run } = useSaving();
  const m = useRecordMode();
  const [formDraft, setFormDraft] = useDraft<string | null>(
    value ?? null,
    label,
    onSave,
    (a, b) => a === b
  );
  if (m) {
    if (!m.editing || !canEdit)
      return (
        <FieldRow label={label} wide={wide}>
          <div className="py-1 break-words">{display ?? <Empty />}</div>
        </FieldRow>
      );
    if (!m.canChange(!!value, work))
      return (
        <FieldRow label={label} wide={wide}>
          <LockedValue>{display ?? <Empty />}</LockedValue>
        </FieldRow>
      );
    return (
      <FieldRow label={label} wide={wide}>
        {render({
          value: formDraft,
          defaultOpen: false,
          size: 'sm',
          disabled: m.saving,
          onChange: setFormDraft,
        })}
      </FieldRow>
    );
  }
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
  work,
}: {
  label: ReactNode;
  value: boolean | null | undefined;
  canEdit: boolean;
  onSave: (next: boolean) => Promise<unknown>;
  yes?: string;
  no?: string;
  /** daily work, not data: stays changeable when set */
  work?: boolean;
}) {
  const { busy, run } = useSaving();
  const m = useRecordMode();
  const [formDraft, setFormDraft] = useDraft<boolean | null>(
    value ?? null,
    label,
    v => onSave(!!v),
    (a, b) => a === b
  );
  if (m && (!m.editing || !canEdit || !m.canChange(value !== null && value !== undefined, work))) {
    const text = value === true ? yes : value === false ? no : <Empty />;
    return (
      <FieldRow label={label}>
        {m.editing && canEdit ? (
          <LockedValue>{text}</LockedValue>
        ) : (
          <div className="py-1">{text}</div>
        )}
      </FieldRow>
    );
  }
  if (m)
    return (
      <FieldRow label={label}>
        <div className="flex gap-1 py-1">
          {[true, false].map(v => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setFormDraft(v)}
              className={cn(
                'rounded-full border px-2.5 py-px text-[12px] font-medium',
                formDraft === v
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {v ? yes : no}
            </button>
          ))}
        </div>
      </FieldRow>
    );
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
