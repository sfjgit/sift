// File: RecordMode.tsx
// Path: src/components/record/RecordMode.tsx
//
// Detail pages read like a document (view mode) and switch to a form to edit (Edit → Save / Cancel).
// The edit rule (21 Nov 2026, enforced by the API too): a value that is already filled is changed
// only by a super admin — others fill empty fields and add new rows. Daily work fields (status,
// sales status, call status …) are marked `work` and stay open.
//
//   <RecordModeProvider>            ← wraps the page
//     <RecordToolbar />             ← Edit / Print, or Cancel / Save while editing
//     <InlineText … />              ← fields read the mode (src/components/record/InlineField.tsx)
//   </RecordModeProvider>

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Download, Loader2, Lock, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/features/auth/usePermissions';
import type { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface Pending {
  label: string;
  run: () => Promise<unknown>;
}

interface RecordModeValue {
  editing: boolean;
  /** bumps on every Edit / Cancel / Save — fields reset their drafts */
  session: number;
  superAdmin: boolean;
  /** may this user change a value? (empty → yes; filled → super admin, or a work field) */
  canChange: (filled: boolean, work?: boolean) => boolean;
  /** a field's unsaved change (null = back to the saved value) */
  setPending: (key: string, p: Pending | null) => void;
  pendingCount: number;
  saving: boolean;
  start: () => void;
  cancel: () => void;
  save: () => Promise<void>;
}

const Ctx = createContext<RecordModeValue | null>(null);

/** null outside a RecordModeProvider (fields then keep their old click-to-edit behaviour) */
export const useRecordMode = () => useContext(Ctx);

export function RecordModeProvider({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = usePermissions();
  const [editing, setEditing] = useState(false);
  const [session, setSession] = useState(0);
  const [saving, setSaving] = useState(false);
  const pending = useRef(new Map<string, Pending>());
  const [pendingCount, setPendingCount] = useState(0);

  const setPending = useCallback((key: string, p: Pending | null) => {
    if (p) pending.current.set(key, p);
    else pending.current.delete(key);
    setPendingCount(pending.current.size);
  }, []);

  const reset = useCallback(() => {
    pending.current.clear();
    setPendingCount(0);
    setSession(s => s + 1);
  }, []);

  const start = useCallback(() => {
    reset();
    setEditing(true);
  }, [reset]);

  const cancel = useCallback(() => {
    if (pending.current.size && !window.confirm('Discard your unsaved changes?')) return;
    reset();
    setEditing(false);
  }, [reset]);

  const save = useCallback(async () => {
    if (!pending.current.size) {
      reset();
      setEditing(false);
      return;
    }
    setSaving(true);
    const failed: string[] = [];
    // one field at a time: a refused field stays in the form with its message, the rest are saved
    for (const [key, p] of [...pending.current]) {
      try {
        await p.run();
        pending.current.delete(key);
      } catch (e) {
        failed.push(`${p.label}: ${(e as ApiError).message ?? 'couldn’t save'}`);
      }
    }
    setSaving(false);
    setPendingCount(pending.current.size);
    if (failed.length) {
      toast.error(failed.length === 1 ? failed[0] : `${failed.length} fields not saved`, {
        description: failed.length > 1 ? failed.join('\n') : undefined,
      });
      return;
    }
    toast.success('Saved');
    reset();
    setEditing(false);
  }, [reset]);

  // leaving the page with unsaved changes asks first
  useEffect(() => {
    if (!editing || !pendingCount) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editing, pendingCount]);

  const value = useMemo<RecordModeValue>(
    () => ({
      editing,
      session,
      superAdmin: isSuperAdmin,
      canChange: (filled, work) => !filled || !!work || isSuperAdmin,
      setPending,
      pendingCount,
      saving,
      start,
      cancel,
      save,
    }),
    [editing, session, isSuperAdmin, setPending, pendingCount, saving, start, cancel, save]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** the browser's print dialog (Save as PDF), with the file named after the record */
function downloadPdf(name: string) {
  const was = document.title;
  document.title = name;
  window.addEventListener('afterprint', () => (document.title = was), { once: true });
  window.print();
}

/** Edit (+ Download PDF for super admins) in view mode; Cancel / Save while editing */
export function RecordToolbar({
  canEdit = true,
  pdfName,
  className,
}: {
  canEdit?: boolean;
  /** super admins get "Download PDF" (the report, one sheet per page) saved under this name */
  pdfName?: string;
  className?: string;
}) {
  const m = useRecordMode();
  if (!m) return null;
  if (!m.editing) {
    const pdf = !!pdfName && m.superAdmin;
    if (!canEdit && !pdf) return null;
    return (
      <div className={cn('flex items-center gap-2 print:hidden', className)}>
        {pdf && (
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            onClick={() => downloadPdf(pdfName!)}
          >
            <Download /> Download PDF
          </Button>
        )}
        {canEdit && (
          <Button size="sm" onClick={m.start}>
            <Pencil /> Edit
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 print:hidden', className)}>
      <span className="text-xs text-muted-foreground">
        {m.pendingCount
          ? `${m.pendingCount} unsaved change${m.pendingCount > 1 ? 's' : ''}`
          : 'Editing'}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="bg-card"
        disabled={m.saving}
        onClick={m.cancel}
      >
        <X /> Cancel
      </Button>
      <Button size="sm" disabled={m.saving} onClick={m.save}>
        {m.saving ? <Loader2 className="animate-spin" /> : <Save />} Save
      </Button>
    </div>
  );
}

/** the strip on top of the page while editing — what the rule is, and Save / Cancel always in reach */
export function RecordEditBar() {
  const m = useRecordMode();
  if (!m?.editing) return null;
  return (
    <div className="sticky top-0 z-30 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 backdrop-blur print:hidden">
      <p className="flex items-center gap-1.5 text-[13px] text-foreground">
        <Pencil className="size-3.5 text-primary" />
        <b>Edit mode.</b>
        {m.superAdmin ? (
          <span className="text-muted-foreground">You can change any field.</span>
        ) : (
          <span className="text-muted-foreground">
            Fill empty fields and add new entries. Filled values (<Lock className="inline size-3" />
            ) are changed by a super admin.
          </span>
        )}
      </p>
      <RecordToolbar />
    </div>
  );
}

/**
 * buttons of a record page's sections (offices, CSR years, programmes, documents …):
 *   add(perm)    — "Add …" buttons: edit mode + the permission
 *   change(perm) — edit / delete an existing row: edit mode + super admin (+ the permission)
 * Outside a RecordModeProvider both just return the permission.
 */
export function useRecordActions() {
  const m = useRecordMode();
  return useMemo(
    () => ({
      add: (perm: boolean) => perm && (!m || m.editing),
      change: (perm: boolean) => perm && (!m || (m.editing && m.superAdmin)),
    }),
    [m]
  );
}

/**
 * a record-aware `can` for a section: *.create / *.upload → add rule, *.update / *.delete* → change rule,
 * anything else (read …) unchanged. Swap it in for usePermissions().can inside record sections.
 */
export function useRecordCan<K extends string>(can: (key: K) => boolean) {
  const { add, change } = useRecordActions();
  return useCallback(
    (key: K) =>
      /\.(create|upload)$/.test(key)
        ? add(can(key))
        : /\.(update|delete|delete_any)$/.test(key)
          ? change(can(key))
          : can(key),
    [can, add, change]
  );
}
