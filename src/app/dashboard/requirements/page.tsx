'use client';

import CreateRequirementDialog from '@/components/requirements/CreateRequirementDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PermissionGate from '@/components/ui/PermissionGate';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRequirementsApi } from '@/lib/requirements.api';
import { Edit } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// ✅ Types for Requirement
export type RequirementStatus = 'ACTIVE' | 'DRAFT' | 'CLOSED';

export interface Requirement {
  id: string;
  title: string;
  reqCode: string;
  client?: {
    id: string;
    name: string;
  };
  status: RequirementStatus;
  totalOpenings: number;
  filledOpenings: number;
}

// =========================
// Main Page
// =========================
export default function RequirementsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <RequirementsHeader />
      <RequirementStats />
      <RequirementFilters />
      <RequirementList />
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
function RequirementStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total" value={120} loading={false} />
      <StatCard label="Active" value={80} loading={false} highlight />
      <StatCard label="Closed" value={20} loading={false} />
      <StatCard label="On Hold" value={10} loading={false} />
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  highlight,
}: {
  label: string;
  value?: number;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? 'border-primary/20 bg-primary/4' : 'border-border bg-card'
      }`}
    >
      {loading ? (
        <div className="h-7 w-12 bg-muted/40 rounded animate-pulse mb-1" />
      ) : (
        <p
          className={`text-2xl font-bold tracking-tight ${
            highlight ? 'text-primary' : 'text-foreground'
          }`}
          style={{ letterSpacing: '-0.03em' }}
        >
          {value ?? '—'}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// =========================
// Filters
// =========================
function RequirementFilters() {
  return (
    <div className="flex gap-5 justify-end">
      <Select>
        <SelectTrigger className="w-45">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Input placeholder="Search title or code..." className="input w-64" />
    </div>
  );
}

// =========================
// Requirement List
// =========================
function RequirementList() {
  const requirementsApi = useRequirementsApi();
  const [data, setData] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await requirementsApi.getAll({ limit: 20 });
        setData(res.data.data ?? []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">No requirements found</div>;
  }

  return (
    <div className="space-y-2">
      {data.map(req => (
        <RequirementRow key={req.id} req={req} />
      ))}
    </div>
  );
}

// =========================
// Requirement Row
// =========================
function RequirementRow({ req }: { req: Requirement }) {
  return (
    <Link
      href={`/dashboard/requirements/${req.id}`}
      className="flex justify-between items-center p-4 rounded-lg border bg-card hover:bg-muted/30"
    >
      <div>
        <p className="text-sm font-medium">{req.title}</p>
        <p className="text-xs text-muted-foreground">
          {req.reqCode} · {req.client?.name ?? 'No Client'}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <p className="text-xs text-muted-foreground">
          {req.filledOpenings}/{req.totalOpenings}
        </p>

        <StatusBadge status={req.status} />
        <Button variant="outline" size="sm">
          <Edit className="w-2 h-2" />
        </Button>
      </div>
    </Link>
  );
}

// =========================
// Status Badge
// =========================
function StatusBadge({ status }: { status: RequirementStatus }) {
  const styles: Record<RequirementStatus, string> = {
    ACTIVE: 'text-green-600 bg-green-500/10',
    DRAFT: 'text-muted-foreground bg-muted',
    CLOSED: 'text-muted-foreground bg-muted',
  };

  return <span className={`text-xs px-2 py-1 rounded ${styles[status]}`}>{status}</span>;
}
