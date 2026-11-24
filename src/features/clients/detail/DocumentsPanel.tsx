// File: DocumentsPanel.tsx
// Path: src/features/clients/detail/DocumentsPanel.tsx
//
// Reports & attachments of a client: annual / CSR reports the pipeline found
// and files people upload. One file per type + FY — uploading again replaces it.

'use client';

import { useRecordCan } from '@/components/record/RecordMode';
import { useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Paperclip,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineEmpty, SubSection } from '@/components/common/SubSection';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { FormDialog } from '@/components/forms/FormDialog';
import { Field } from '@/components/forms/fields';
import { LookupPicker } from '@/components/pickers/pickers';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDate, fmtInr } from '@/lib/format';
import { FY_PATTERN, lastClosedFy } from '@/lib/fy';
import { csrBand } from './ClientInfo';
import type { ApiError } from '@/lib/api/client';
import type { ClientDetail, ClientDocument } from '@/types/crm';

const MAX_MB = 25;
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp';

// CASPA "Saved attachments — by financial year": one column per report type.
// BRSR applies to listed companies only.
const YEAR_COLUMNS = ['BRSR', 'CSR_REPORT', 'IMPACT_REPORT', 'ANNUAL_REPORT', 'CSR_ACTION_PLAN'];

export function UploadDialog({
  client,
  open,
  onOpenChange,
  preset,
}: {
  client: ClientDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** opened from a cell of the by-year grid */
  preset?: { typeId: string; fy: string };
}) {
  const [typeId, setTypeId] = useState<string | null>(preset?.typeId ?? null);
  const [fy, setFy] = useState(preset?.fy ?? lastClosedFy);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useAction(() => clientsApi.uploadDocument(client.id, file!, typeId!, fy.trim()), {
    success: d => `${d.type.label} (FY ${d.fy}) uploaded`,
    invalidate: [clientHooks.keys.all],
    onSuccess: () => {
      onOpenChange(false);
      setFile(null);
      setTypeId(null);
    },
  });

  const submit = () => {
    if (!typeId) return setError('Pick what kind of document this is');
    if (!FY_PATTERN.test(fy.trim())) return setError('Financial year looks like 2025-2026');
    if (!file) return setError('Choose a file');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Files can be up to ${MAX_MB} MB`);
    setError(null);
    upload.mutate(undefined, { onError: e => setError((e as ApiError).message) });
  };

  const replaces = client.documents?.find(d => d.type.id === typeId && d.fy === fy.trim());

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload a report or attachment"
      description={`Stored with ${client.name}. One file per type and year.`}
      onSubmit={submit}
      submitLabel="Upload"
      busy={upload.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          <LookupPicker
            type="DOCUMENT_TYPE"
            value={typeId}
            onChange={setTypeId}
            placeholder="Annual report, CSR report…"
          />
        </Field>
        <Field label="Financial year" required hint="April to March, e.g. 2025-2026">
          <Input value={fy} onChange={e => setFy(e.target.value)} placeholder="2025-2026" />
        </Field>
      </div>
      <Field
        label="File"
        required
        hint={`PDF, Word, Excel, PowerPoint, CSV, text or image — up to ${MAX_MB} MB`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-surface/60 px-4 py-5 text-center text-[14px] transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <Paperclip className="size-4 text-muted-foreground" />
          {file ? (
            <span className="font-medium">
              {file.name}{' '}
              <span className="text-muted-foreground">
                ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Click to choose a file</span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      {replaces && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs">
          This replaces <b>{replaces.fileName ?? replaces.type.label}</b> already held for FY{' '}
          {replaces.fy}.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </FormDialog>
  );
}

export function DocumentsPanel({ client, limit }: { client: ClientDetail; limit?: number }) {
  const { can: rawCan } = usePermissions();
  const can = useRecordCan(rawCan);
  const confirm = useConfirm();
  const [uploading, setUploading] = useState<false | { typeId: string; fy: string } | true>(false);
  const docs = [...(client.documents ?? [])].sort(
    (a, b) => a.type.label.localeCompare(b.type.label) || b.fy.localeCompare(a.fy)
  );
  const shown = limit ? docs.slice(0, limit) : docs;

  const remove = useAction((d: ClientDocument) => clientsApi.removeDocument(client.id, d.id), {
    success: 'Document removed',
    invalidate: [clientHooks.keys.all],
  });

  const open = async (d: ClientDocument, download?: boolean) => {
    try {
      const { url } = await clientsApi.documentUrl(client.id, d.id, download);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  if (!can('client_documents.read')) return null;

  return (
    <SubSection
      title="Reports & attachments"
      description={`${docs.length} file${docs.length === 1 ? '' : 's'} — annual reports, CSR reports, filings and anything uploaded`}
      actions={
        <>
          {can('client_documents.upload') && (
            <Button size="sm" variant="outline" onClick={() => setUploading(true)}>
              <Upload /> Upload
            </Button>
          )}
        </>
      }
    >
      {docs.length === 0 ? (
        <InlineEmpty>
          No reports yet. The pipeline adds the reports it finds; you can upload files too.
        </InlineEmpty>
      ) : (
        <div className="crm-box overflow-x-auto">
          <table className="crm-sheet">
            <thead>
              <tr>
                <th>Attachment</th>
                <th>FY</th>
                <th>File</th>
                <th>Added</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {shown.map(d => (
                <tr key={d.id}>
                  <td className="font-medium whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5 text-destructive" />
                      {d.type.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap tabular">{d.fy}</td>
                  <td className="max-w-96">
                    <button
                      type="button"
                      onClick={() => void open(d)}
                      className="block max-w-full truncate text-left text-primary hover:underline"
                      title={d.fileName ?? d.type.label}
                    >
                      {d.fileName ?? d.type.label}
                    </button>
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {fmtDate(d.createdAt)}
                  </td>
                  <td className="px-1!">
                    <span className="flex justify-end">
                      {d.sourceUrl && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Where it was found"
                        >
                          <a href={d.sourceUrl} target="_blank" rel="noreferrer">
                            <ExternalLink />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Download"
                        onClick={() => void open(d, true)}
                      >
                        <Download />
                      </Button>
                      {can('client_documents.delete') && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: `Remove ${d.fileName ?? d.type.label}?`,
                                description: 'The file is deleted from storage.',
                                destructive: true,
                                confirmLabel: 'Remove',
                              })
                            )
                              remove.mutate(d);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {limit && docs.length > limit && (
        <p className="mt-3 text-xs text-muted-foreground">
          {docs.length - limit} more on the Financials &amp; reports tab.
        </p>
      )}
      {uploading && (
        <UploadDialog
          client={client}
          open
          onOpenChange={o => !o && setUploading(false)}
          {...(typeof uploading === 'object' && { preset: uploading })}
        />
      )}
    </SubSection>
  );
}

/** rows = financial years, columns = report types, plus the CSR figures of that year */
export function YearGrid({
  client,
  types,
  onOpen,
  onUpload,
}: {
  client: ClientDetail;
  types: { id: string; code: string; label: string }[];
  onOpen: (d: ClientDocument) => void;
  onUpload?: (typeId: string, fy: string) => void;
}) {
  const docs = client.documents ?? [];
  const fin = client.csrFinancials;
  const hasBrsr = docs.some(d => d.type.code === 'BRSR');
  const cols = YEAR_COLUMNS.filter(c => c !== 'BRSR' || client.isListed || hasBrsr)
    .map(code => types.find(t => t.code === code))
    .filter((t): t is { id: string; code: string; label: string } => !!t);
  const others = docs.filter(d => !YEAR_COLUMNS.includes(d.type.code));
  const years = [
    ...new Set([...docs.map(d => d.fy), ...(fin ?? []).map(f => f.fy), lastClosedFy()]),
  ].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {client.isListed
          ? 'Listed company — BRSR applies.'
          : 'BRSR applies to listed companies only (set “Listed” under Client information).'}
        {onUpload && ' Click + in a cell to upload that report for that year.'}
      </p>
      <div className="crm-box overflow-x-auto">
        <table className="crm-sheet">
          <thead>
            <tr>
              {fin && <th>CSR spent category</th>}
              <th>FY</th>
              {cols.map(c => (
                <th key={c.id} className="text-center whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              {others.length > 0 && <th>Other files</th>}
              {fin && (
                <>
                  <th className="text-right">CSR fund</th>
                  <th className="text-right">CSR spent</th>
                  <th className="text-right">CSR unspent</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {years.map(fy => {
              const f = fin?.find(x => x.fy === fy);
              const extra = others.filter(d => d.fy === fy);
              return (
                <tr key={fy}>
                  {fin && <td className="whitespace-nowrap">{csrBand(f?.spentRs) ?? '—'}</td>}
                  <td className="whitespace-nowrap tabular font-medium">{fy}</td>
                  {cols.map(c => {
                    const d = docs.find(x => x.type.id === c.id && x.fy === fy);
                    return (
                      <td key={c.id} className="text-center">
                        {d ? (
                          <button
                            type="button"
                            onClick={() => onOpen(d)}
                            title={d.fileName ?? c.label}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Eye className="size-3.5" /> View
                          </button>
                        ) : onUpload ? (
                          <button
                            type="button"
                            onClick={() => onUpload(c.id, fy)}
                            aria-label={`Upload ${c.label} for FY ${fy}`}
                            className="rounded p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-primary"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                  {others.length > 0 && (
                    <td>
                      {extra.length ? (
                        <span className="flex flex-wrap gap-x-2">
                          {extra.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => onOpen(d)}
                              className="text-primary hover:underline"
                            >
                              {d.type.label}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  {fin && (
                    <>
                      <td className="text-right tabular">
                        {f?.budgetRs ? fmtInr(f.budgetRs) : '—'}
                      </td>
                      <td className="text-right tabular">{f?.spentRs ? fmtInr(f.spentRs) : '—'}</td>
                      <td className="text-right tabular">
                        {f?.unspentRs ? fmtInr(f.unspentRs) : '—'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
