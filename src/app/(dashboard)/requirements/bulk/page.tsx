/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/bulk/page.tsx

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAxios } from '@/hooks/useAxios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
  X,
  Info,
  RotateCcw,
  TableProperties,
  Building2,
  User,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Spoc {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  isPrimary: boolean;
  serviceLine: { id: string; name: string };
  businessUnit: { id: string; name: string };
}

interface Client {
  id: string;
  name: string;
  vmsName: string;
  industry: string;
  businessUnit: { id: string; name: string } | null;
  spocs: Spoc[];
}

interface RowValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkUploadResult {
  totalRows: number;
  created: number;
  skipped: number;
  failed: number;
  errors: RowValidationError[];
  createdRequirementIds: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const MAX_ROWS = 25;

const TEMPLATE_COLUMNS = [
  { name: 'title', required: true, example: 'Senior React Developer' },
  { name: 'jobType', required: true, example: 'PERMANENT' },
  { name: 'remoteType', required: true, example: 'ONSITE' },
  { name: 'primarySkills', required: true, example: 'React, TypeScript' },
  { name: 'totalOpenings', required: true, example: '2' },
  { name: 'priority', required: false, example: 'MEDIUM' },
  { name: 'jobOpenFor', required: false, example: 'EXTERNAL' },
  { name: 'status', required: false, example: 'DRAFT' },
  { name: 'keySkills', required: false, example: 'Redux, REST APIs' },
  { name: 'city', required: false, example: 'Bengaluru' },
  { name: 'state', required: false, example: 'Karnataka' },
  { name: 'country', required: false, example: 'India' },
  { name: 'experienceMin', required: false, example: '4' },
  { name: 'experienceMax', required: false, example: '8' },
  { name: 'salaryMin', required: false, example: '1200000' },
  { name: 'salaryMax', required: false, example: '1800000' },
  { name: 'salaryType', required: false, example: 'ANNUAL' },
  { name: 'salaryCurrency', required: false, example: 'INR' },
  { name: 'hideSalaryFromCandidate', required: false, example: 'FALSE' },
  { name: 'education', required: false, example: 'B.Tech / B.E.' },
  { name: 'functionalArea', required: false, example: 'Engineering' },
  { name: 'shift', required: false, example: 'Morning' },
  { name: 'targetCompanies', required: false, example: 'Infosys, TCS' },
  { name: 'noPoachCompanies', required: false, example: 'Accenture' },
  { name: 'startDate', required: false, example: '2025-08-01' },
  { name: 'targetDate', required: false, example: '2025-09-30' },
  { name: 'description', required: false, example: 'Full JD text here…' },
];

// ─── Utils ────────────────────────────────────────────────────────────────────

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

// ─── ClientSpocSelector ───────────────────────────────────────────────────────

function ClientSpocSelector({
  onSelect,
  disabled,
}: {
  onSelect: (
    spocId: string,
    meta: { clientName: string; spocName: string; serviceLine: string; businessUnit: string }
  ) => void;
  disabled?: boolean;
}) {
  const axios = useAxios();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSpoc, setSelectedSpoc] = useState<Spoc | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [spocOpen, setSpocOpen] = useState(false);

  // Tracks whether user manually cleared the auto-selected SPOC
  // Same pattern as single requirement page (userClearedSpoc.current)
  const [userClearedSpoc, setUserClearedSpoc] = useState(false);

  const clientRef = useRef<HTMLDivElement>(null);
  const spocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios
      .get('/clients/mine')
      .then(res => setClients(res.data.data ?? []))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setClientOpen(false);
      if (spocRef.current && !spocRef.current.contains(e.target as Node)) setSpocOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSelectedSpoc(null);
    setUserClearedSpoc(false);
    setClientOpen(false);
    setSpocOpen(false);

    // Auto-select primary SPOC if exists, else auto-select if only one
    const primary = client.spocs.find(s => s.isPrimary);
    const autoSelect = primary ?? (client.spocs.length === 1 ? client.spocs[0] : null);

    if (autoSelect) {
      setSelectedSpoc(autoSelect);
      onSelect(autoSelect.id, {
        clientName: client.name,
        spocName: `${autoSelect.firstName} ${autoSelect.lastName}`,
        serviceLine: autoSelect.serviceLine.name,
        businessUnit: autoSelect.businessUnit.name,
      });
    }
  };

  const handleSpocSelect = (spoc: Spoc) => {
    setSelectedSpoc(spoc);
    setUserClearedSpoc(false);
    setSpocOpen(false);
    if (selectedClient) {
      onSelect(spoc.id, {
        clientName: selectedClient.name,
        spocName: `${spoc.firstName} ${spoc.lastName}`,
        serviceLine: spoc.serviceLine.name,
        businessUnit: spoc.businessUnit.name,
      });
    }
  };

  const handleChangeSpoc = () => {
    setUserClearedSpoc(true);
    setSelectedSpoc(null);
    setSpocOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-slate-400 text-[13px]">
        <Loader2 size={14} className="animate-spin" />
        Loading clients…
      </div>
    );
  }

  // Determine SPOC display mode (mirrors single requirement page logic)
  const hasMultipleSpocs = (selectedClient?.spocs.length ?? 0) > 1;
  const isAutoSelected = selectedSpoc && !userClearedSpoc;
  const showSpocDropdown = selectedClient && (!selectedSpoc || userClearedSpoc);
  const showSpocStatic = selectedClient && isAutoSelected && !userClearedSpoc;

  return (
    <div className="space-y-3">
      {/* ── Client dropdown ──────────────────────────────────────────────── */}
      <div ref={clientRef} className="relative">
        <p className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
          Client
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setClientOpen(p => !p);
            setSpocOpen(false);
          }}
          className={`w-full flex items-center justify-between px-3.5 h-10 border rounded-xl text-[13px] transition-colors
            ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                : selectedClient
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
            }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">
              {selectedClient ? selectedClient.name : 'Select client…'}
            </span>
          </div>
          <ChevronDown
            size={13}
            className={`text-slate-400 shrink-0 transition-transform ${clientOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {clientOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
            {clients.length === 0 ? (
              <div className="px-4 py-3 text-[12px] text-slate-400">No clients found</div>
            ) : (
              clients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors
                    ${selectedClient?.id === client.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">
                      {client.name}
                    </p>
                    {client.industry && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{client.industry}</p>
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0 mt-0.5">
                    {client.spocs.length} SPOC{client.spocs.length !== 1 ? 's' : ''}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── SPOC section — shown once client is selected ─────────────────── */}
      {selectedClient && (
        <div ref={spocRef} className="relative">
          <p className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
            SPOC
          </p>

          {/* Static display — auto-selected SPOC with optional Change button */}
          {showSpocStatic && selectedSpoc && (
            <div className="flex items-center gap-2.5 px-3.5 h-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <User size={13} className="text-slate-400 shrink-0" />
              <span className="text-[13px] text-slate-700 font-medium flex-1 truncate">
                {selectedSpoc.firstName} {selectedSpoc.lastName}
              </span>
              {selectedSpoc.isPrimary && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold shrink-0">
                  Primary
                </span>
              )}
              {/* Show Change button only if there are multiple SPOCs to pick from */}
              {hasMultipleSpocs && !disabled && (
                <button
                  type="button"
                  onClick={handleChangeSpoc}
                  className="text-[11px] text-primary underline underline-offset-2 shrink-0 ml-auto"
                >
                  Change
                </button>
              )}
            </div>
          )}

          {/* Dropdown — shown when no SPOC selected or user clicked Change */}
          {showSpocDropdown && (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSpocOpen(p => !p)}
                className={`w-full flex items-center justify-between px-3.5 h-10 border rounded-xl text-[13px] transition-colors
                  ${
                    disabled
                      ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                      : selectedSpoc
                        ? 'bg-white border-slate-300 text-slate-800'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {selectedSpoc
                      ? `${selectedSpoc.firstName} ${selectedSpoc.lastName}`
                      : 'Select SPOC…'}
                  </span>
                </div>
                <ChevronDown
                  size={13}
                  className={`text-slate-400 shrink-0 transition-transform ${spocOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {spocOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  {selectedClient.spocs.map(spoc => (
                    <button
                      key={spoc.id}
                      type="button"
                      onClick={() => handleSpocSelect(spoc)}
                      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors
                        ${selectedSpoc?.id === spoc.id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-slate-800">
                            {spoc.firstName} {spoc.lastName}
                          </p>
                          {spoc.isPrimary && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {spoc.designation} · {spoc.serviceLine.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Derived info — SL + BU auto-filled from selected SPOC ─────────── */}
      {selectedSpoc && !userClearedSpoc && (
        <div className="grid grid-cols-2 gap-2">
          <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
              Service Line
            </p>
            <p className="text-[12px] font-semibold text-slate-700 truncate">
              {selectedSpoc.serviceLine.name}
            </p>
          </div>
          <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
              Business Unit
            </p>
            <p className="text-[12px] font-semibold text-slate-700 truncate">
              {selectedSpoc.businessUnit.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && isValidFile(file)) onFile(file);
      else toast.error('Only .xlsx, .xls, and .csv files are accepted');
    },
    [disabled, onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isValidFile(file)) onFile(file);
      else if (file) toast.error('Only .xlsx, .xls, and .csv files are accepted');
      if (inputRef.current) inputRef.current.value = '';
    },
    [onFile]
  );

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-4 w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none py-12
        ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
            : dragging
              ? 'border-blue-400 bg-blue-50/60 scale-[1.01]'
              : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-blue-100' : 'bg-slate-100'}`}
      >
        <FileSpreadsheet size={26} className={dragging ? 'text-blue-500' : 'text-slate-400'} />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-slate-700">
          {dragging ? 'Drop to upload' : 'Drop your spreadsheet here'}
        </p>
        <p className="text-[12px] text-slate-400 mt-1">
          or{' '}
          <span className="text-blue-600 font-semibold underline underline-offset-2">browse</span>{' '}
          to choose a file
        </p>
        <p className="text-[11px] text-slate-400 mt-2">
          .xlsx · .xls · .csv &nbsp;·&nbsp; max {MAX_ROWS} rows &nbsp;·&nbsp; max 2 MB
        </p>
      </div>
    </div>
  );
}

// ─── FilePreviewCard ──────────────────────────────────────────────────────────

function FilePreviewCard({
  file,
  onRemove,
  disabled,
}: {
  file: File;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
  const extColor: Record<string, string> = {
    XLSX: 'bg-emerald-100 text-emerald-700',
    XLS: 'bg-emerald-100 text-emerald-700',
    CSV: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl">
      <div
        className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${extColor[ext] ?? 'bg-slate-100 text-slate-600'}`}
      >
        {ext}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 truncate">{file.name}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{fileSize(file.size)}</p>
      </div>
      {!disabled && (
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ─── ResultSummary ────────────────────────────────────────────────────────────

function ResultSummary({
  result,
  onReset,
  onViewCreated,
}: {
  result: BulkUploadResult;
  onReset: () => void;
  onViewCreated: () => void;
}) {
  const allSuccess = result.failed === 0 && result.created > 0;
  const allFailed = result.created === 0;

  const errorsByRow = result.errors.reduce<Record<number, RowValidationError[]>>((acc, e) => {
    if (!acc[e.row]) acc[e.row] = [];
    acc[e.row].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl p-5 border ${allSuccess ? 'bg-emerald-50 border-emerald-200' : allFailed ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${allSuccess ? 'bg-emerald-100' : allFailed ? 'bg-red-100' : 'bg-amber-100'}`}
          >
            {allSuccess ? (
              <CheckCircle2 size={20} className="text-emerald-600" />
            ) : allFailed ? (
              <XCircle size={20} className="text-red-500" />
            ) : (
              <AlertTriangle size={20} className="text-amber-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-[15px] font-bold ${allSuccess ? 'text-emerald-800' : allFailed ? 'text-red-700' : 'text-amber-800'}`}
            >
              {allSuccess
                ? 'Upload successful'
                : allFailed
                  ? 'Upload failed — no rows created'
                  : 'Partial success'}
            </p>
            <p
              className={`text-[12px] mt-1 ${allSuccess ? 'text-emerald-600' : allFailed ? 'text-red-500' : 'text-amber-700'}`}
            >
              {allSuccess
                ? `All ${result.created} requirement${result.created !== 1 ? 's' : ''} created successfully.`
                : allFailed
                  ? `All ${result.totalRows} rows had errors. Fix them and try again.`
                  : `${result.created} created, ${result.failed} row${result.failed !== 1 ? 's' : ''} had errors.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Total rows', value: result.totalRows, color: 'text-slate-700' },
            { label: 'Created', value: result.created, color: 'text-emerald-700' },
            {
              label: 'Failed',
              value: result.failed,
              color: result.failed > 0 ? 'text-red-600' : 'text-slate-400',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white/70 rounded-xl px-3 py-2.5 text-center border border-white"
            >
              <p className={`text-[22px] font-bold tabular-nums leading-none ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle size={13} className="text-red-500" />
            <p className="text-[12px] font-bold text-slate-700">
              {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} to fix
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {Object.entries(errorsByRow).map(([rowNum, errors]) => (
              <div key={rowNum} className="px-4 py-3">
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">Row {rowNum}</p>
                <div className="space-y-1">
                  {errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600 shrink-0 mt-0.5">
                        {err.field}
                      </span>
                      <span className="text-[12px] text-slate-600">{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onReset}
          className="flex-1 h-10 gap-2 border-slate-200 text-slate-600 font-semibold text-[13px]"
        >
          <RotateCcw size={14} />
          Upload another file
        </Button>
        {result.created > 0 && (
          <Button
            onClick={onViewCreated}
            className="flex-1 h-10 gap-2 bg-blue-600 hover:bg-blue-700 font-semibold text-[13px]"
          >
            View Requirements
            <ChevronRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── TemplateReference ────────────────────────────────────────────────────────

function TemplateReference({ onDownload }: { onDownload: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const required = TEMPLATE_COLUMNS.filter(c => c.required);
  const optional = TEMPLATE_COLUMNS.filter(c => !c.required);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <TableProperties size={14} className="text-slate-400" />
          <span className="text-[13px] font-semibold text-slate-700">Column reference</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">
            {required.length} required
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
            {optional.length} optional
          </span>
        </div>
        <ChevronRight
          size={14}
          className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2">
              Required columns
            </p>
            <div className="space-y-1.5">
              {required.map(col => (
                <div key={col.name} className="flex items-center gap-3">
                  <code className="text-[11px] font-mono font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded w-44 shrink-0">
                    {col.name}
                  </code>
                  <span className="text-[11px] text-slate-400 truncate">e.g. {col.example}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 bg-amber-50 border-y border-amber-100 flex items-start gap-2 my-2">
            <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">
              <strong>Do not include</strong> clientId, clientSpocId, businessUnitId, or
              serviceLineId in the sheet — these are set from the Client & SPOC selection above.
            </p>
          </div>
          <div className="px-4 pt-2 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 mt-1">
              Optional columns
            </p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {optional.map(col => (
                <div key={col.name} className="flex items-center gap-3">
                  <code className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded w-44 shrink-0">
                    {col.name}
                  </code>
                  <span className="text-[11px] text-slate-400 truncate">e.g. {col.example}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Download size={13} />
              Download filled template (.xlsx)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'done';

export default function BulkRequirementUploadPage() {
  const axios = useAxios();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [selectedSpocId, setSelectedSpocId] = useState<string | null>(null);
  const [spocMeta, setSpocMeta] = useState<{
    clientName: string;
    spocName: string;
    serviceLine: string;
    businessUnit: string;
  } | null>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
  }, []);

  const handleSpocSelect = useCallback((spocId: string, meta: typeof spocMeta) => {
    setSelectedSpocId(spocId);
    setSpocMeta(meta);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setResult(null);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setUploadState('idle');
    setSelectedSpocId(null);
    setSpocMeta(null);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/templates/Talentos_BulkRequirement_Template.xlsx';
    link.setAttribute('download', 'TalentOS_BulkRequirement_Template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !selectedSpocId) return;
    setUploadState('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientSpocId', selectedSpocId);

      const response = await axios.post('/requirements/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data: BulkUploadResult = response.data;
      setResult(data);
      setUploadState('done');

      if (data.created > 0 && data.failed === 0) {
        toast.success(`${data.created} requirement${data.created !== 1 ? 's' : ''} created`);
      } else if (data.created > 0) {
        toast.warning(`${data.created} created, ${data.failed} failed — fix errors and retry`);
      } else {
        toast.error('No rows were created — check errors below');
      }
    } catch (err: any) {
      setUploadState('idle');
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? 'Upload failed';
      toast.error(msg);
    }
  }, [axios, file, selectedSpocId]);

  const uploading = uploadState === 'uploading';
  const done = uploadState === 'done';
  const canUpload = !!file && !!selectedSpocId;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 leading-none">
            Bulk Upload Requirements
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Create up to {MAX_ROWS} requirements at once via Excel or CSV
          </p>
        </div>
        <div className="ml-auto">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3.5 h-9 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Download size={13} />
            Download Template
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
          {/* Step 1 — Client & SPOC selection */}
          {!done && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-1 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-900">Select client & SPOC</p>
                  <p className="text-[11px] text-slate-400">
                    All requirements in this upload will be created under this client and SPOC
                  </p>
                </div>
              </div>
              <ClientSpocSelector onSelect={handleSpocSelect} disabled={uploading} />
            </div>
          )}

          {/* Step 2 — File upload */}
          {!done && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-1 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Upload size={14} className="text-blue-600" />
                </div>
                <p className="text-[14px] font-bold text-slate-900">Upload file</p>
              </div>

              {!file ? (
                <DropZone onFile={handleFile} disabled={uploading || !selectedSpocId} />
              ) : (
                <div className="space-y-3">
                  <FilePreviewCard file={file} onRemove={handleRemoveFile} disabled={uploading} />

                  {/* Selected SPOC summary */}
                  {spocMeta && (
                    <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-violet-50 border border-violet-100">
                      <User size={13} className="text-violet-500 shrink-0 mt-0.5" />
                      <p className="text-[11.5px] text-violet-700 leading-relaxed">
                        Creating under <strong>{spocMeta.clientName}</strong> · SPOC:{' '}
                        <strong>{spocMeta.spocName}</strong> · {spocMeta.serviceLine} ·{' '}
                        {spocMeta.businessUnit}
                      </p>
                    </div>
                  )}

                  <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                    <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11.5px] text-amber-700 leading-relaxed">
                      Max <strong>{MAX_ROWS} rows</strong> per upload. Requirements are created as{' '}
                      <strong>DRAFT</strong> — activate manually after review.
                    </p>
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !canUpload}
                    className="w-full h-11 font-bold text-[13px] bg-blue-600 hover:bg-blue-700 gap-2 rounded-xl"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload size={15} />
                        Upload & Create Requirements
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Hint when no SPOC selected yet */}
              {!selectedSpocId && !file && (
                <p className="text-[11px] text-slate-400 text-center">
                  Select a client and SPOC above before uploading
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {done && result && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={14} className="text-slate-500" />
                </div>
                <p className="text-[14px] font-bold text-slate-900">Upload result</p>
              </div>
              <ResultSummary
                result={result}
                onReset={handleReset}
                onViewCreated={() => router.push('/requirements')}
              />
            </div>
          )}

          {/* How it works */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Info size={13} className="text-slate-400" />
              <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">
                How it works
              </p>
            </div>
            {[
              {
                num: '1',
                title: 'Select client & SPOC',
                desc: 'All requirements in this upload go under the selected client and SPOC. Service line and business unit are auto-derived.',
                color: 'bg-violet-100 text-violet-700',
              },
              {
                num: '2',
                title: 'Download & fill the template',
                desc: `Add up to ${MAX_ROWS} rows. Do not include clientId or spocId columns — those come from step 1.`,
                color: 'bg-blue-100 text-blue-700',
              },
              {
                num: '3',
                title: 'Upload & review',
                desc: 'Valid rows are created instantly as DRAFT. Errors are shown row-by-row so you can fix and retry.',
                color: 'bg-emerald-100 text-emerald-700',
              },
            ].map(step => (
              <div key={step.num} className="flex gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${step.color}`}
                >
                  {step.num}
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-slate-800">{step.title}</p>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Column reference */}
          <TemplateReference onDownload={handleDownloadTemplate} />
        </div>
      </div>
    </div>
  );
}
