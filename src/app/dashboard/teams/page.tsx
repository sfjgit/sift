'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { useTeamsApi } from '@/lib/teams.api';
import { BusinessUnit, useBusinessUnitsApi } from '@/lib/business-units.api';
import TeamDialog from '@/components/teams/TeamDialog';
import TeamTable from '@/components/teams/TeamTable';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function TeamsPage() {
  const [open, setOpen] = useState(false);

  // filters
  const [buFilter, setBuFilter] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const { getAll } = useTeamsApi();
  const buApi = useBusinessUnitsApi();

  const canView = usePermission('TEAM', 'canView');
  const canAdd = usePermission('TEAM', 'canAdd');

  // ── fetch teams ────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: () => getAll(),
    enabled: !!canView,
  });

  // ── fetch business units for tabs ──────────────────────────────────────────
  const { data: buData } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => buApi.getAll(),
  });

  const allTeams = data?.data?.data ?? [];
  const businessUnits = buData?.data?.data ?? [];

  // ── client-side filter ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return allTeams.filter((t: any) => {
      const matchBU = buFilter === 'ALL' || t.businessUnitId === buFilter;
      const matchStatus =
        status === 'ALL' ||
        (status === 'ACTIVE' && t.isActive) ||
        (status === 'INACTIVE' && !t.isActive);
      const q = search.toLowerCase();
      const matchSearch =
        !q || t.name?.toLowerCase().includes(q) || t.businessUnit?.name?.toLowerCase().includes(q);
      return matchBU && matchStatus && matchSearch;
    });
  }, [allTeams, buFilter, status, search]);

  if (canView === undefined) return null;

  return (
    <div className="max-w-8xl mx-auto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
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
          {[{ id: 'ALL', name: 'All Teams' }, ...businessUnits].map((bu: BusinessUnit) => (
            <button
              key={bu.id}
              onClick={() => setBuFilter(bu.id)}
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

        {canAdd && (
          <button
            onClick={() => setOpen(true)}
            style={{
              height: 34,
              padding: '0 14px',
              fontSize: 13,
              fontWeight: 600,
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span> New Team
          </button>
        )}
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
        {/* Search */}
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
            placeholder="Search teams..."
            style={{
              height: 34,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize: 13,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              outline: 'none',
              width: 220,
              background: '#fff',
              color: '#0f172a',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
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
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <div style={{ flex: 1 }} />

        {/* Filter button */}
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

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {!canView ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
          You don&apos;t have permission to view teams.
        </div>
      ) : isLoading ? (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 50px 1fr 1fr 1fr 80px 80px 100px',
                padding: '0 12px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              {[...Array(8)].map((_, j) => (
                <div key={j} style={{ padding: '14px 8px' }}>
                  <div
                    style={{ height: 14, borderRadius: 3, background: '#f1f5f9', width: '70%' }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#ef4444', fontSize: 14 }}>
          Failed to load teams. Please try again.
        </div>
      ) : (
        <TeamTable teams={filtered} refresh={refetch} />
      )}

      {/* Dialog */}
      <TeamDialog open={open} setOpen={setOpen} refresh={refetch} />
    </div>
  );
}
