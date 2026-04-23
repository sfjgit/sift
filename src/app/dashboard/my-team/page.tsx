/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTeamsApi } from '@/lib/teams.api';
import { useAuth } from '@/context/AuthContext';
import TeamTable from '@/components/teams/TeamTable';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MyTeamsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { getAll } = useTeamsApi();

  // filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => getAll(),
    enabled: !!user,
  });

  const allTeams = data?.data?.data ?? [];

  // 🔥 Step 1: filter only teams where logged user is LEAD
  const myTeams = useMemo(() => {
    if (!user) return [];

    return allTeams.filter((team: any) =>
      team.members?.some((m: any) => m.teamRole === 'LEAD' && m.user?.id === user.id)
    );
  }, [allTeams, user]);

  // 🔥 Step 2: apply search + status filters
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return myTeams.filter((t: any) => {
      const matchStatus =
        status === 'ALL' ||
        (status === 'ACTIVE' && t.isActive) ||
        (status === 'INACTIVE' && !t.isActive);

      const matchSearch =
        !q || t.name?.toLowerCase().includes(q) || t.businessUnit?.name?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [myTeams, search, status]);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newSet = new Set(selectedRows);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedRows(newSet);
  };

  const toggleAll = () => {
    if (selectedRows.size === filtered.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filtered.map((t: any) => t.id)));
    }
  };

  const allChecked = filtered.length > 0 && selectedRows.size === filtered.length;

  // column template
  // const colTemplate = '40px 50px 1.5fr 1.2fr 1fr 100px';
  const colTemplate = '1.5fr 1.2fr 1fr 120px';

  if (authLoading) return null;

  return (
    <div className="max-w-8xl mx-auto">
      {/* ── Header ───────────────── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>My Teams</h2>

      {/* ── Toolbar ───────────────── */}
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
            placeholder="Search my teams..."
            style={{
              height: 34,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize: 13,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              outline: 'none',
              width: 220,
            }}
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{
            height: 34,
            padding: '0 10px',
            fontSize: 13,
            border: '1px solid #e2e8f0',
            borderRadius: 6,
          }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* ── Content ───────────────── */}
      {isLoading ? (
        <div style={{ padding: 20 }}>Loading...</div>
      ) : isError ? (
        <div style={{ padding: 20, color: 'red' }}>Failed to load teams</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 20, color: '#64748b' }}>You are not a team lead in any team.</div>
      ) : (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: colTemplate,
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '0 12px',
            }}
          >
            {/* <div style={{ padding: '10px 0' }}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll} />
            </div>
            <div style={{ padding: '10px 0', fontSize: 11 }}>#</div> */}

            {['Team Name', 'Business Unit', 'Members', 'Status'].map(label => (
              <div
                key={label}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#94a3b8',
                  padding: '10px 8px',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* BODY */}
          <div style={{ overflowY: 'auto' }}>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: colTemplate,
                    padding: '0 12px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  {[...Array(6)].map((_, j) => (
                    <div key={j} style={{ padding: '14px 8px' }}>
                      <div style={{ height: 14, background: '#f1f5f9', borderRadius: 3 }} />
                    </div>
                  ))}
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                No teams found
              </div>
            ) : (
              filtered.map((team: any, idx: number) => {
                const checked = selectedRows.has(team.id);

                return (
                  <div
                    key={team.id}
                    onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: colTemplate,
                      padding: '0 12px',
                      borderBottom: '1px solid #f1f5f9',
                      background: checked ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Checkbox */}
                    {/* <div style={{ padding: '12px 0' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(team.id)}
                      />
                    </div> */}

                    {/* Index */}
                    {/* <div style={{ padding: '12px 0' }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          background: '#eff6ff',
                          color: '#3b82f6',
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 4,
                        }}
                      >
                        {idx + 1}
                      </span>
                    </div> */}

                    {/* Team Name */}
                    <div style={{ padding: '12px 8px', fontSize: 13, fontWeight: 500 }}>
                      {team.name}
                    </div>

                    {/* Business Unit */}
                    <div style={{ padding: '12px 8px', fontSize: 13 }}>
                      {team.businessUnit?.name ?? '—'}
                    </div>

                    {/* Members */}
                    <div style={{ padding: '12px 8px', fontSize: 13 }}>
                      {team.members?.length ?? 0}
                    </div>

                    {/* Status */}
                    <div style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: team.isActive ? '#dcfce7' : '#fee2e2',
                          color: team.isActive ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {team.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
