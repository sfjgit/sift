'use client';

import CreateRequirementDialog from '@/components/requirements/CreateRequirementDialog';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/ui/PermissionGate';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { useRequirementsApi } from '@/lib/requirements.api';
import { Edit, Search, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export type RequirementStatus = 'ACTIVE' | 'DRAFT' | 'CLOSED';

export interface Requirement {
  id: string;
  title: string;
  reqCode: string;
  client?: { id: string; name: string };
  businessUnit?: { id: string; name: string };
  location?: string;
  status: RequirementStatus;
  totalOpenings: number;
  filledOpenings: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  jobType?: string;
}

interface Stats {
  total: number;
  active: number;
  closed: number;
  draft: number;
}

interface BusinessUnit {
  id: string;
  name: string;
}

// =========================
// Main Page
// =========================
export default function RequirementsPage() {
  const requirementsApi = useRequirementsApi();
  const [data, setData] = useState<Requirement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('ALL');
  const [businessUnitId, setBusinessUnitId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await requirementsApi.getAll({
          limit: 20,
          ...(status !== 'ALL' && { status }),
          ...(businessUnitId !== 'ALL' && { businessUnitId }),
          ...(debouncedSearch && { search: debouncedSearch }),
        });
        const requirements: Requirement[] = res.data.data ?? [];
        setData(requirements);
        setStats({
          total: res.data.total ?? requirements.length,
          active: requirements.filter(r => r.status === 'ACTIVE').length,
          closed: requirements.filter(r => r.status === 'CLOSED').length,
          draft: requirements.filter(r => r.status === 'DRAFT').length,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [status, businessUnitId, debouncedSearch]);
  // const [editingReq, setEditingReq] = useState<Requirement | null>(null);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RequirementsHeader />
      <RequirementStats stats={stats} loading={loading} />
      <RequirementFilters
        status={status}
        search={search}
        businessUnitId={businessUnitId}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
        onBusinessUnitChange={setBusinessUnitId}
      />
      <RequirementTable data={data} loading={loading} />
    </div>
  );
}

// =========================
// Header
// =========================
function RequirementsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Requirements</h1>
        <p className="text-sm text-muted-foreground">Manage and track hiring needs</p>
      </div>
      <PermissionGate module="requirements" action="canAdd">
        <CreateRequirementDialog />
      </PermissionGate>
    </div>
  );
}

// =========================
// Stats
// =========================
function RequirementStats({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Total', value: stats?.total, highlight: false },
        { label: 'Active', value: stats?.active, highlight: true },
        { label: 'Closed', value: stats?.closed, highlight: false },
        { label: 'Draft', value: stats?.draft, highlight: false },
      ].map(card => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${
            card.highlight ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
          }`}
        >
          {loading ? (
            <div className="h-7 w-10 bg-muted/40 rounded animate-pulse mb-1" />
          ) : (
            <p
              className={`text-2xl font-bold ${card.highlight ? 'text-primary' : 'text-foreground'}`}
              style={{ letterSpacing: '-0.03em' }}
            >
              {card.value ?? '—'}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

// =========================
// Filters
// =========================
const STATUS_OPTIONS = [
  { label: 'All Status', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Closed', value: 'CLOSED' },
];

function RequirementFilters({
  status,
  search,
  businessUnitId,
  onStatusChange,
  onSearchChange,
  onBusinessUnitChange,
}: {
  status: string;
  search: string;
  businessUnitId: string;
  onStatusChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onBusinessUnitChange: (v: string) => void;
}) {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const buApi = useBusinessUnitsApi();

  useEffect(() => {
    async function load() {
      const res = await buApi.getAll();
      setBusinessUnits(res.data.data ?? []);
    }
    load();
  }, []);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* BU pill tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60 flex-wrap">
        <button
          onClick={() => onBusinessUnitChange('ALL')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            businessUnitId === 'ALL'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Units
        </button>
        {businessUnits.map(bu => (
          <button
            key={bu.id}
            onClick={() => onBusinessUnitChange(bu.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              businessUnitId === bu.id
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {bu.name}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border/60 shrink-0" />

      {/* Status dropdown */}
      <select
        value={status}
        onChange={e => onStatusChange(e.target.value)}
        className={[
          'h-9 px-3 pr-8 text-sm rounded-lg appearance-none cursor-pointer shrink-0',
          'bg-muted/30 border border-border text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40',
          'transition-[border-color,box-shadow]',
        ].join(' ')}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Search — pushed to the right */}
      <div className="relative ml-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search title, code, client..."
          className={[
            'h-9 w-64 pl-8 pr-3 text-sm rounded-lg',
            'bg-muted/30 border border-border',
            'placeholder:text-muted-foreground/40 text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40',
            'transition-[border-color,box-shadow]',
          ].join(' ')}
        />
      </div>
    </div>
  );
}

// =========================
// Table
// =========================
const COLUMNS = [
  { key: 'title', label: 'Job Title' },
  { key: 'client', label: 'Client' },
  { key: 'businessUnit', label: 'Business Unit' },
  { key: 'location', label: 'Location' },
  { key: 'jobType', label: 'Type' },
  { key: 'openings', label: 'Openings' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
];

function RequirementTable({
  data,
  loading,
  // onEdit,
}: {
  data: Requirement[];
  loading: boolean;
  // onEdit: (req: Requirement) => void;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Sticky header */}
      <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_0.8fr_0.8fr_40px] bg-muted/30 border-b border-border px-4">
        {COLUMNS.map(col => (
          <div
            key={col.key}
            className="py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 flex items-center gap-1"
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto max-h-[60vh]">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_0.8fr_0.8fr_40px] px-4 py-3.5 gap-2"
              >
                {[...Array(8)].map((_, j) => (
                  <div
                    key={j}
                    className="h-4 bg-muted/40 rounded animate-pulse"
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Users className="w-4 h-4 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground/60">No requirements found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map(req => (
              <RequirementTableRow key={req.id} req={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================
// Table Row
// =========================
function RequirementTableRow({
  req,
  // onEdit,
}: {
  req: Requirement;
  // onEdit: (req: Requirement) => void;
}) {
  return (
    <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_0.8fr_0.8fr_40px] px-4 py-3.5 items-center hover:bg-muted/20 transition-colors group">
      <Link href={`/dashboard/requirements/${req.id}`} className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {req.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{req.reqCode}</p>
      </Link>

      <div className="text-sm text-foreground/80 truncate">
        {req.client?.name ?? <span className="text-muted-foreground/40 text-xs italic">—</span>}
      </div>

      <div className="text-sm text-foreground/80 truncate">
        {req.businessUnit?.name ?? (
          <span className="text-muted-foreground/40 text-xs italic">—</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 min-w-0">
        {req.location ? (
          <>
            <MapPin className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <span className="text-sm text-foreground/70 truncate">{req.location}</span>
          </>
        ) : (
          <span className="text-muted-foreground/40 text-xs italic">—</span>
        )}
      </div>

      <div>
        <JobTypeBadge type={req.jobType} />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-foreground">{req.filledOpenings}</span>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-sm text-muted-foreground">{req.totalOpenings}</span>
      </div>

      <div>
        <StatusBadge status={req.status} />
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => {
            e.preventDefault();
            // onEdit(req);
          }}
        >
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// =========================
// Status Badge
// =========================
function StatusBadge({ status }: { status: RequirementStatus }) {
  const styles: Record<RequirementStatus, string> = {
    ACTIVE: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    DRAFT: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    CLOSED: 'text-muted-foreground bg-muted border-border',
  };
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border ${styles[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// =========================
// Job Type Badge
// =========================
function JobTypeBadge({ type }: { type?: string }) {
  if (!type) return <span className="text-muted-foreground/40 text-xs italic">—</span>;
  const labels: Record<string, string> = {
    PERMANENT: 'Full Time',
    CONTRACT: 'Contract',
    CONTRACT_TO_HIRE: 'C2H',
    FREELANCE: 'Freelance',
  };
  return (
    <span className="text-[11px] font-medium text-foreground/60 bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
      {labels[type] ?? type}
    </span>
  );
}
