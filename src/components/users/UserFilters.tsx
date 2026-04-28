'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UsersListParams, RoleBasic, BusinessUnitBasic, TeamRole } from '@/types/user.types';

interface Props {
  params: UsersListParams;
  roles: RoleBasic[];
  businessUnits: BusinessUnitBasic[];
  // Teams come from a separate simple fetch for the team filter dropdown
  teams: { id: string; name: string }[];
  onChange: (params: Partial<UsersListParams>) => void;
  onReset: () => void;
}

const TEAM_ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'CO_LEAD', label: 'Co-Lead' },
  { value: 'MEMBER', label: 'Member' },
];

export function UserFilters({ params, roles, businessUnits, teams, onChange, onReset }: Props) {
  // Debounce search so we don't fire on every keystroke
  const [searchInput, setSearchInput] = useState(params.search ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== params.search) {
        onChange({ search: searchInput || undefined, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external reset back into local state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(params.search ?? '');
  }, [params.search]);

  const hasFilters =
    !!params.search ||
    !!params.buId ||
    !!params.roleId ||
    params.isActive !== undefined ||
    !!params.teamId ||
    !!params.teamRole ||
    !!params.isClientHandler ||
    !!params.isContactOwner;

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 — search + status */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, employee ID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-8 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                onChange({ search: undefined, page: 1 });
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status */}
        <Select
          value={params.isActive ?? 'all'}
          onValueChange={v =>
            onChange({
              isActive: v === 'all' ? undefined : (v as 'true' | 'false'),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[130px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* BU */}
        {businessUnits.length > 0 && (
          <Select
            value={params.buId ?? 'all'}
            onValueChange={v => onChange({ buId: v === 'all' ? undefined : v, page: 1 })}
          >
            <SelectTrigger className="w-[150px] text-sm">
              <SelectValue placeholder="Business Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All BUs</SelectItem>
              {businessUnits.map(bu => (
                <SelectItem key={bu.id} value={bu.id}>
                  {bu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Role */}
        <Select
          value={params.roleId ?? 'all'}
          onValueChange={v => onChange({ roleId: v === 'all' ? undefined : v, page: 1 })}
        >
          <SelectTrigger className="w-[160px] text-sm">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.name.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2 — team filters + special filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Team */}
        {teams.length > 0 && (
          <Select
            value={params.teamId ?? 'all'}
            onValueChange={v => onChange({ teamId: v === 'all' ? undefined : v, page: 1 })}
          >
            <SelectTrigger className="w-[170px] text-sm">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Team Role */}
        <Select
          value={params.teamRole ?? 'all'}
          onValueChange={v =>
            onChange({
              teamRole: v === 'all' ? undefined : (v as TeamRole),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[140px] text-sm">
            <SelectValue placeholder="Team role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All team roles</SelectItem>
            {TEAM_ROLE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Client handler toggle */}
        <Button
          variant={params.isClientHandler ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() =>
            onChange({
              isClientHandler: params.isClientHandler ? undefined : 'true',
              page: 1,
            })
          }
        >
          Client handlers
        </Button>

        {/* Contact owner toggle */}
        <Button
          variant={params.isContactOwner ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() =>
            onChange({
              isContactOwner: params.isContactOwner ? undefined : 'true',
              page: 1,
            })
          }
        >
          Contact owners
        </Button>

        {/* Reset */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={onReset}
          >
            <X className="mr-1 h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
