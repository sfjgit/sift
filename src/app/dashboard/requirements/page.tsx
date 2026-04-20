'use client';

import CreateRequirementDialog from '@/components/requirements/CreateRequirementDialog';
import PermissionGate from '@/components/ui/PermissionGate';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { useRequirementsApi } from '@/lib/requirements.api';
import {
  Search,
  SlidersHorizontal,
  Columns3,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

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

interface BusinessUnit {
  id: string;
  name: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const ALL_COLUMNS = [
  { key: 'reqCode', label: 'Job Code', sortable: true },
  { key: 'title', label: 'Job Title', sortable: true },
  { key: 'businessUnit', label: 'Business Unit', sortable: false },
  { key: 'client', label: 'Client', sortable: true },
  { key: 'location', label: 'Location', sortable: false },
  { key: 'jobType', label: 'Type', sortable: false },
  { key: 'openings', label: 'Openings', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Closed', value: 'CLOSED' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: RequirementStatus }) {
  const cfg: Record<RequirementStatus, { dot: string; text: string; bg: string }> = {
    ACTIVE: { dot: '#22c55e', text: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
    DRAFT: { dot: '#f59e0b', text: '#d97706', bg: 'rgba(245,158,11,0.08)' },
    CLOSED: { dot: '#94a3b8', text: '#64748b', bg: 'rgba(148,163,184,0.1)' },
  };
  const c = cfg[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: c.bg,
        color: c.text,
        fontSize: 12,
        fontWeight: 500,
        padding: '2px 9px',
        borderRadius: 20,
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }}
      />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function JobTypeBadge({ type }: { type?: string }) {
  const labels: Record<string, string> = {
    PERMANENT: 'Full Time',
    CONTRACT: 'Contract',
    CONTRACT_TO_HIRE: 'C2H',
    FREELANCE: 'Freelance',
  };
  if (!type) return <span style={{ color: '#94a3b8' }}>—</span>;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: '#475569',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        padding: '2px 7px',
        borderRadius: 4,
      }}
    >
      {labels[type] ?? type}
    </span>
  );
}

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: string;
  sortKey: string;
  sortDir: 'asc' | 'desc';
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        marginLeft: 3,
        opacity: sortKey === col ? 1 : 0.3,
      }}
    >
      <ChevronUp
        style={{
          width: 10,
          height: 10,
          marginBottom: -2,
          color: sortKey === col && sortDir === 'asc' ? '#3b82f6' : '#94a3b8',
        }}
      />
      <ChevronDown
        style={{
          width: 10,
          height: 10,
          color: sortKey === col && sortDir === 'desc' ? '#3b82f6' : '#94a3b8',
        }}
      />
    </span>
  );
}

// ─── sort helper — no `any` ────────────────────────────────────────────────────

type SortValue = string | number | undefined;

function getSortValue(req: Requirement, key: string): SortValue {
  switch (key) {
    case 'client':
      return req.client?.name ?? '';
    case 'businessUnit':
      return req.businessUnit?.name ?? '';
    case 'openings':
      return req.totalOpenings;
    case 'status':
      return req.status;
    case 'reqCode':
      return req.reqCode;
    case 'title':
      return req.title;
    default:
      return undefined;
  }
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RequirementsPage() {
  const requirementsApi = useRequirementsApi();
  const buApi = useBusinessUnitsApi();
  const router = useRouter();

  // filters
  const [buFilter, setBuFilter] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebounced] = useState('');

  // table controls
  const [sortKey, setSortKey] = useState('reqCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_COLUMNS.map(c => c.key));
  const [showColPicker, setShowColPicker] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── React Query: business units ────────────────────────────────────────────
  const { data: buData } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => buApi.getAll(),
    staleTime: Infinity,
  });
  const businessUnits: BusinessUnit[] = buData?.data?.data ?? [];

  // ── React Query: requirements ──────────────────────────────────────────────
  const queryParams = {
    page,
    limit: pageSize,
    ...(status !== 'ALL' && { status }),
    ...(buFilter !== 'ALL' && { businessUnitId: buFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const {
    data: reqData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['requirements', queryParams],
    queryFn: () => requirementsApi.getAll(queryParams),
  });

  const data: Requirement[] = reqData?.data?.data ?? [];
  const total: number = reqData?.data?.total ?? data.length;

  // ── client-side sort ───────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      let av: SortValue = getSortValue(a, sortKey);
      let bv: SortValue = getSortValue(b, sortKey);
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allChecked = sorted.length > 0 && sorted.every(r => selectedRows.has(r.id));
  const loading = isLoading || isFetching;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) setSelectedRows(new Set());
    else setSelectedRows(new Set(sorted.map(r => r.id)));
  };

  const activeCols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key));
  const colTemplate = `40px 50px ${activeCols.map(c => (c.key === 'actions' ? '110px' : '1fr')).join(' ')}`;

  return (
    <div
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: '#0f172a',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── BU Tabs + New Button ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 0 }}>
          {([{ id: 'ALL', name: 'All Jobs' }, ...businessUnits] as BusinessUnit[]).map(bu => (
            <button
              key={bu.id}
              onClick={() => {
                setBuFilter(bu.id);
                setPage(1);
              }}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: buFilter === bu.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: buFilter === bu.id ? '#3b82f6' : '#64748b',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {bu.name}
            </button>
          ))}
        </div>
        <PermissionGate module="requirements" action="canAdd">
          <CreateRequirementDialog />
        </PermissionGate>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              color: '#94a3b8',
            }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Type to search..."
            style={{
              height: 34,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize: 13,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              outline: 'none',
              width: 200,
              background: '#fff',
              color: '#0f172a',
            }}
          />
        </div>

        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={{
            height: 34,
            padding: '0 28px 0 10px',
            fontSize: 13,
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            outline: 'none',
            background: '#fff',
            color: '#0f172a',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {/* Columns picker */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowColPicker(p => !p)}
            style={{
              height: 34,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              cursor: 'pointer',
              background: '#fff',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Columns3 style={{ width: 14, height: 14 }} /> Columns
          </button>
          {showColPicker && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 38,
                zIndex: 50,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                padding: 12,
                minWidth: 180,
              }}
            >
              {ALL_COLUMNS.map(col => (
                <label
                  key={col.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 0',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#374151',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(col.key)}
                    onChange={() =>
                      setVisibleCols(prev =>
                        prev.includes(col.key)
                          ? prev.filter(k => k !== col.key)
                          : [...prev, col.key]
                      )
                    }
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          style={{
            height: 34,
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 500,
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            cursor: 'pointer',
            background: '#fff',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <SlidersHorizontal style={{ width: 14, height: 14 }} /> Filter
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          background: '#fff',
          opacity: isFetching && !isLoading ? 0.6 : 1,
          transition: 'opacity 0.2s',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Sticky Header — never scrolls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: colTemplate,
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 12px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              padding: '10px 0',
            }}
          >
            #
          </div>
          {activeCols.map(col => (
            <div
              key={col.key}
              onClick={() => col.sortable && toggleSort(col.key)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '10px 8px',
                cursor: col.sortable ? 'pointer' : 'default',
                userSelect: 'none',
              }}
            >
              {col.label}
              {col.sortable && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
            </div>
          ))}
        </div>

        {/* Scrollable Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: colTemplate,
                  padding: '0 12px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div style={{ padding: '14px 0' }}>
                  <div style={{ height: 14, width: 14, borderRadius: 3, background: '#f1f5f9' }} />
                </div>
                <div style={{ padding: '14px 0' }}>
                  <div style={{ height: 14, width: 24, borderRadius: 3, background: '#f1f5f9' }} />
                </div>
                {activeCols.map(c => (
                  <div key={c.key} style={{ padding: '14px 8px' }}>
                    <div
                      style={{ height: 14, borderRadius: 3, background: '#f1f5f9', width: '70%' }}
                    />
                  </div>
                ))}
              </div>
            ))
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
              No requirements found
            </div>
          ) : (
            sorted.map((req, idx) => {
              const rowNum = (page - 1) * pageSize + idx + 1;
              const checked = selectedRows.has(req.id);
              return (
                <div
                  key={req.id}
                  onClick={() => router.push(`/dashboard/requirements/${req.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: colTemplate,
                    padding: '0 12px',
                    borderBottom: '1px solid #f1f5f9',
                    background: checked ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                    transition: 'background 0.1s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!checked) (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = checked
                      ? '#eff6ff'
                      : idx % 2 === 0
                        ? '#fff'
                        : '#fafafa';
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRow(req.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        background: '#eff6ff',
                        color: '#3b82f6',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {rowNum}
                    </span>
                  </div>
                  {activeCols.map(col => (
                    <div
                      key={col.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 8px',
                        minWidth: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {col.key === 'reqCode' && (
                        <span
                          style={{
                            fontSize: 13,
                            color: '#3b82f6',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {req.reqCode}
                        </span>
                      )}
                      {col.key === 'title' && (
                        <span
                          onClick={e => e.stopPropagation()}
                          style={{
                            fontSize: 13,
                            color: '#3b82f6',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Link
                            href={`/dashboard/requirements/${req.id}`}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {req.title}
                          </Link>
                        </span>
                      )}
                      {col.key === 'businessUnit' && (
                        <span
                          style={{
                            fontSize: 13,
                            color: '#374151',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {req.businessUnit?.name ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                        </span>
                      )}
                      {col.key === 'client' && (
                        <span
                          style={{
                            fontSize: 13,
                            color: '#374151',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {req.client?.name ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                        </span>
                      )}
                      {col.key === 'location' && (
                        <span
                          style={{
                            fontSize: 13,
                            color: '#374151',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {req.location ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                        </span>
                      )}
                      {col.key === 'jobType' && <JobTypeBadge type={req.jobType} />}
                      {col.key === 'openings' && (
                        <span style={{ fontSize: 13, color: '#374151' }}>
                          <span style={{ fontWeight: 600 }}>{req.filledOpenings}</span>
                          <span style={{ color: '#94a3b8', margin: '0 2px' }}>/</span>
                          {req.totalOpenings}
                        </span>
                      )}
                      {col.key === 'status' && <StatusPill status={req.status} />}
                      {col.key === 'actions' && (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {/* View */}
                          <button
                            title="View"
                            onClick={() => router.push(`/dashboard/requirements/${req.id}`)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 5,
                              border: '1px solid #e2e8f0',
                              background: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#3b82f6',
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          {/* Edit */}
                          {/* <button
                            title="Edit"
                            onClick={() => router.push(`/dashboard/requirements/${req.id}/edit`)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 5,
                              border: '1px solid #e2e8f0',
                              background: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b',
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button> */}
                          {/* Delete */}
                          <button
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete "${req.title}"?`)) {
                                // wire to your delete API here
                              }
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 5,
                              border: '1px solid #fecaca',
                              background: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ef4444',
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 4px',
          fontSize: 13,
          color: '#64748b',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span>
          {total === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`}{' '}
          of {total}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <PagBtn onClick={() => setPage(1)} disabled={page === 1}>
            <ChevronsLeft style={{ width: 13, height: 13 }} />
          </PagBtn>
          <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </PagBtn>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p: number;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <PagBtn key={p} onClick={() => setPage(p)} active={page === p}>
                {p}
              </PagBtn>
            );
          })}
          <PagBtn
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight style={{ width: 13, height: 13 }} />
          </PagBtn>
          <PagBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}>
            <ChevronsRight style={{ width: 13, height: 13 }} />
          </PagBtn>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{
              height: 30,
              padding: '0 24px 0 8px',
              fontSize: 13,
              border: '1px solid #e2e8f0',
              borderRadius: 5,
              outline: 'none',
              background: '#fff',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
            }}
          >
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span style={{ color: '#94a3b8' }}>per page</span>
        </div>
      </div>

      {showColPicker && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setShowColPicker(false)}
        />
      )}
    </div>
  );
}

function PagBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30,
        height: 30,
        padding: '0 6px',
        borderRadius: 5,
        border: '1px solid',
        borderColor: active ? '#3b82f6' : '#e2e8f0',
        background: active ? '#3b82f6' : disabled ? '#f8fafc' : '#fff',
        color: active ? '#fff' : disabled ? '#cbd5e1' : '#374151',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}
