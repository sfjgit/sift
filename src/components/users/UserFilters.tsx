// 'use client';

// import { useEffect, useState } from 'react';
// import { Search, X } from 'lucide-react';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import type {
//   UsersListParams,
//   RoleBasic,
//   BusinessUnitBasic,
//   TeamRole,
//   UserFilterOptions,
//   FilterPerson,
// } from '@/types/user.types';

// interface Props {
//   params: UsersListParams;
//   roles: RoleBasic[];
//   businessUnits: BusinessUnitBasic[];
//   filterOptions: UserFilterOptions;
//   isLoadingOptions?: boolean;
//   // Teams come from a separate simple fetch for the team filter dropdown
//   teams: { id: string; name: string }[];
//   onChange: (params: Partial<UsersListParams>) => void;
//   onReset: () => void;
// }

// const TEAM_ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
//   { value: 'LEAD', label: 'Lead' },
//   { value: 'CO_LEAD', label: 'Co-Lead' },
//   { value: 'MEMBER', label: 'Member' },
// ];

// const personLabel = (p: FilterPerson) =>
//   `${p.firstName} ${p.lastName}${p.employeeId ? ` (${p.employeeId})` : ''}`;

// export function UserFilters({
//   params,
//   businessUnits,
//   filterOptions,
//   isLoadingOptions,
//   teams,
//   onChange,
//   onReset,
// }: Props) {
//   const departments = filterOptions?.departments ?? [];
//   const roles = filterOptions?.roles ?? [];
//   const reportingTo = filterOptions?.reportingTo ?? [];
//   const teamLeads = filterOptions?.teamLeads ?? [];
//   const teamRoles = filterOptions?.teamRoles ?? [];
//   // Debounce search so we don't fire on every keystroke
//   const [searchInput, setSearchInput] = useState(params.search ?? '');

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (searchInput !== params.search) {
//         onChange({ search: searchInput || undefined, page: 1 });
//       }
//     }, 350);
//     return () => clearTimeout(timer);
//   }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

//   // Sync external reset back into local state
//   useEffect(() => {
//     // eslint-disable-next-line react-hooks/set-state-in-effect
//     setSearchInput(params.search ?? '');
//   }, [params.search]);

//   const hasFilters =
//     !!params.search ||
//     !!params.buId ||
//     !!params.roleId ||
//     !!params.departmentId ||
//     !!params.reportingToId ||
//     params.isActive !== undefined ||
//     !!params.teamId ||
//     !!params.teamRole ||
//     !!params.isClientHandler ||
//     // @ts-expect-error errr
//     !!params.isContactOwner;

//   return (
//     <div className="flex flex-col gap-3">
//       {/* Row 1 — search + status + BU */}
//       <div className="flex flex-wrap items-center gap-2">
//         <div className="relative min-w-55 flex-1">
//           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
//           <Input
//             placeholder="Search name, email, employee ID…"
//             value={searchInput}
//             onChange={e => setSearchInput(e.target.value)}
//             className="pl-8 text-sm"
//           />
//           {searchInput && (
//             <button
//               onClick={() => {
//                 setSearchInput('');
//                 onChange({ search: undefined, page: 1 });
//               }}
//               className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
//             >
//               <X className="h-3.5 w-3.5" />
//             </button>
//           )}
//         </div>

//         <Select
//           value={params.isActive ?? 'all'}
//           onValueChange={v =>
//             onChange({ isActive: v === 'all' ? undefined : (v as 'true' | 'false'), page: 1 })
//           }
//         >
//           <SelectTrigger className="w-32.5 text-sm">
//             <SelectValue placeholder="Status" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="all">All statuses</SelectItem>
//             <SelectItem value="true">Active</SelectItem>
//             <SelectItem value="false">Inactive</SelectItem>
//           </SelectContent>
//         </Select>

//         {businessUnits.length > 0 && (
//           <Select
//             value={params.buId ?? 'all'}
//             onValueChange={v => onChange({ buId: v === 'all' ? undefined : v, page: 1 })}
//           >
//             <SelectTrigger className="w-37.5 text-sm">
//               <SelectValue placeholder="Business Unit" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All BUs</SelectItem>
//               {businessUnits.map(bu => (
//                 <SelectItem key={bu.id} value={bu.id}>
//                   {bu.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         )}
//       </div>

//       {/* Row 2 — org filters: department, role, reporting to, team lead */}
//       <div className="flex flex-wrap items-center gap-2">
//         {departments.length > 0 && (
//           <Select
//             value={params.departmentId ?? 'all'}
//             onValueChange={v => onChange({ departmentId: v === 'all' ? undefined : v, page: 1 })}
//           >
//             <SelectTrigger className="w-42.5 text-sm">
//               <SelectValue placeholder="Department" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All departments</SelectItem>
//               {departments.map(d => (
//                 <SelectItem key={d.id} value={d.id}>
//                   {d.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         )}

//         {roles.length > 0 && (
//           <Select
//             value={params.roleId ?? 'all'}
//             onValueChange={v => onChange({ roleId: v === 'all' ? undefined : v, page: 1 })}
//           >
//             <SelectTrigger className="w-40 text-sm">
//               <SelectValue placeholder="Role" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All roles</SelectItem>
//               {roles.map(r => (
//                 <SelectItem key={r.id} value={r.id}>
//                   {r.name.replace(/_/g, ' ')}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         )}

//         {reportingTo.length > 0 && (
//           <Select
//             value={params.reportingToId ?? 'all'}
//             onValueChange={v =>
//               // Changing manager invalidates the selected team lead
//               onChange({
//                 reportingToId: v === 'all' ? undefined : v,
//                 teamId: undefined,
//                 page: 1,
//               })
//             }
//           >
//             <SelectTrigger className="w-50 text-sm">
//               <SelectValue placeholder="Reporting to" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All managers</SelectItem>
//               {reportingTo.map(m => (
//                 <SelectItem key={m.id} value={m.id}>
//                   {personLabel(m)}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         )}

//         {(teamLeads.length > 0 || !!params.teamId) && (
//           <Select
//             value={params.teamId ?? 'all'}
//             disabled={isLoadingOptions}
//             onValueChange={v => onChange({ teamId: v === 'all' ? undefined : v, page: 1 })}
//           >
//             <SelectTrigger className="w-50 text-sm">
//               <SelectValue placeholder="Team lead" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">
//                 {params.reportingToId ? 'All team leads (under manager)' : 'All team leads'}
//               </SelectItem>
//               {teamLeads.map(t => (
//                 <SelectItem key={t.id} value={t.id}>
//                   {personLabel(t)}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         )}
//       </div>

//       {/* Row 3 — team role + special toggles */}
//       <div className="flex flex-wrap items-center gap-2">
//         {teamRoles.length > 0 && (
//           <Select
//             value={params.teamRole ?? 'all'}
//             onValueChange={v =>
//               onChange({ teamRole: v === 'all' ? undefined : (v as TeamRole), page: 1 })
//             }
//           >
//             <SelectTrigger className="w-35 text-sm">
//               <SelectValue placeholder="Team role" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All team roles</SelectItem>
//               {teamRoles.map(o => (
//                 <SelectItem key={o.value} value={o.value}>
//                   {o.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         )}

//         <Button
//           variant={params.isClientHandler ? 'default' : 'outline'}
//           size="sm"
//           className="text-xs"
//           onClick={() =>
//             onChange({ isClientHandler: params.isClientHandler ? undefined : 'true', page: 1 })
//           }
//         >
//           Client handlers
//         </Button>

//         <Button
//           // @ts-expect-error err
//           variant={params.isContactOwner ? 'default' : 'outline'}
//           size="sm"
//           className="text-xs"
//           onClick={() =>
//             onChange({
//               // @ts-expect-error err
//               isContactOwner: params.isContactOwner ? undefined : 'true',
//               page: 1,
//             })
//           }
//         >
//           Contact owners
//         </Button>

//         {hasFilters && (
//           <Button
//             variant="ghost"
//             size="sm"
//             className="text-xs text-muted-foreground"
//             onClick={onReset}
//           >
//             <X className="mr-1 h-3 w-3" />
//             Clear filters
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// }
// File: UserFilters.tsx
// Path: src/components/users/UserFilters.tsx
'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  UsersListParams,
  BusinessUnitBasic,
  TeamRole,
  UserFilterOptions,
  FilterPerson,
} from '@/types/user.types';

// isContactOwner isn't on UsersListParams yet — typed locally instead of @ts-expect-error
type Params = UsersListParams & { isContactOwner?: 'true' };

interface Props {
  params: UsersListParams;
  businessUnits: BusinessUnitBasic[];
  filterOptions?: UserFilterOptions;
  isLoadingOptions?: boolean;
  onChange: (params: Partial<UsersListParams>) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { value: 'true' | 'false' | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const personName = (p: FilterPerson) => `${p.firstName} ${p.lastName}`;
const personLabel = (p: FilterPerson) =>
  `${personName(p)}${p.employeeId ? ` (${p.employeeId})` : ''}`;
const prettyRole = (name: string) => name.replace(/_/g, ' ');

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function UserFilters({
  params,
  businessUnits,
  filterOptions,
  isLoadingOptions,
  onChange,
  onReset,
}: Props) {
  const p = params as Params;
  const departments = filterOptions?.departments ?? [];
  const roles = filterOptions?.roles ?? [];
  const reportingTo = filterOptions?.reportingTo ?? [];
  const teamLeads = filterOptions?.teamLeads ?? [];
  const teamRoles = filterOptions?.teamRoles ?? [];

  const [panelOpen, setPanelOpen] = useState(false);

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
    !!p.search ||
    !!p.buId ||
    !!p.roleId ||
    !!p.departmentId ||
    !!p.reportingToId ||
    p.isActive !== undefined ||
    !!p.teamId ||
    !!p.teamRole ||
    !!p.isClientHandler ||
    !!p.isContactOwner;

  // ── Active filter chips (panel filters only; search + status are visible in the bar) ──
  const chips: { key: string; label: string; clear: Partial<Params> }[] = [];
  if (p.buId)
    chips.push({
      key: 'bu',
      label: `Business unit: ${businessUnits.find(b => b.id === p.buId)?.name ?? '…'}`,
      clear: { buId: undefined },
    });
  if (p.departmentId)
    chips.push({
      key: 'dept',
      label: `Department: ${departments.find(d => d.id === p.departmentId)?.name ?? '…'}`,
      clear: { departmentId: undefined },
    });
  if (p.roleId) {
    const r = roles.find(x => x.id === p.roleId);
    chips.push({
      key: 'role',
      label: `Role: ${r ? prettyRole(r.name) : '…'}`,
      clear: { roleId: undefined },
    });
  }
  if (p.reportingToId) {
    const m = reportingTo.find(x => x.id === p.reportingToId);
    chips.push({
      key: 'reporting',
      label: `Reports to ${m ? personName(m) : '…'}`,
      // same rule as the dropdown: dropping the manager drops the team lead
      clear: { reportingToId: undefined, teamId: undefined },
    });
  }
  if (p.teamId) {
    const t = teamLeads.find(x => x.id === p.teamId);
    chips.push({
      key: 'team',
      label: `Team of ${t ? personName(t) : '…'}`,
      clear: { teamId: undefined },
    });
  }
  if (p.teamRole)
    chips.push({
      key: 'teamRole',
      label: `Team role: ${teamRoles.find(r => r.value === p.teamRole)?.label ?? p.teamRole}`,
      clear: { teamRole: undefined },
    });
  if (p.isClientHandler)
    chips.push({ key: 'client', label: 'Client handlers', clear: { isClientHandler: undefined } });
  if (p.isContactOwner)
    chips.push({ key: 'contact', label: 'Contact owners', clear: { isContactOwner: undefined } });

  const panelCount = chips.length;
  const teamLeadDisabled = isLoadingOptions || (teamLeads.length === 0 && !p.teamId);

  return (
    <div className="rounded-lg border bg-card">
      {/* ── Bar: search · status · filters toggle ─────────────────────── */}
      <div className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone or employee ID"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="h-9 pl-9 pr-8 text-sm"
            aria-label="Search users"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchInput('');
                onChange({ search: undefined, page: 1 });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status — segmented */}
          <div
            role="radiogroup"
            aria-label="Status"
            className="inline-flex h-9 items-center rounded-md border bg-muted/40 p-0.5"
          >
            {STATUS_OPTIONS.map(o => {
              const active = p.isActive === o.value;
              return (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ isActive: o.value, page: 1 })}
                  className={`h-full rounded px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant={panelOpen ? 'secondary' : 'outline'}
            size="sm"
            className="h-9 gap-1.5"
            aria-expanded={panelOpen}
            aria-controls="user-filter-panel"
            onClick={() => setPanelOpen(o => !o)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {panelCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
                {panelCount}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${
                panelOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {/* ── Panel ─────────────────────────────────────────────────────── */}
      {panelOpen && (
        <div
          id="user-filter-panel"
          className="grid gap-4 border-t p-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {businessUnits.length > 0 && (
            <Field label="Business unit" htmlFor="f-bu">
              <Select
                value={p.buId ?? 'all'}
                onValueChange={v => onChange({ buId: v === 'all' ? undefined : v, page: 1 })}
              >
                <SelectTrigger id="f-bu" className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All business units</SelectItem>
                  {businessUnits.map(bu => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {departments.length > 0 && (
            <Field label="Department" htmlFor="f-dept">
              <Select
                value={p.departmentId ?? 'all'}
                onValueChange={v =>
                  onChange({ departmentId: v === 'all' ? undefined : v, page: 1 })
                }
              >
                <SelectTrigger id="f-dept" className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {roles.length > 0 && (
            <Field label="Role" htmlFor="f-role">
              <Select
                value={p.roleId ?? 'all'}
                onValueChange={v => onChange({ roleId: v === 'all' ? undefined : v, page: 1 })}
              >
                <SelectTrigger id="f-role" className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {prettyRole(r.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {teamRoles.length > 0 && (
            <Field label="Team role" htmlFor="f-teamrole">
              <Select
                value={p.teamRole ?? 'all'}
                onValueChange={v =>
                  onChange({ teamRole: v === 'all' ? undefined : (v as TeamRole), page: 1 })
                }
              >
                <SelectTrigger id="f-teamrole" className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All team roles</SelectItem>
                  {teamRoles.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* Reporting line — manager drives the team-lead list */}
          {reportingTo.length > 0 && (
            <div className="rounded-md border border-dashed p-3 sm:col-span-2">
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                <Field label="Reporting to" htmlFor="f-reporting">
                  <Select
                    value={p.reportingToId ?? 'all'}
                    onValueChange={v =>
                      // Changing manager invalidates the selected team lead
                      onChange({
                        reportingToId: v === 'all' ? undefined : v,
                        teamId: undefined,
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger id="f-reporting" className="h-9 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Anyone</SelectItem>
                      {reportingTo.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {personLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <ArrowRight
                  aria-hidden
                  className="mb-2.5 hidden h-4 w-4 text-muted-foreground sm:block"
                />

                <Field label="Team lead" htmlFor="f-teamlead">
                  <Select
                    value={p.teamId ?? 'all'}
                    disabled={teamLeadDisabled}
                    onValueChange={v => onChange({ teamId: v === 'all' ? undefined : v, page: 1 })}
                  >
                    <SelectTrigger id="f-teamlead" className="h-9 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {teamLeads.length === 0
                          ? 'No team leads here'
                          : p.reportingToId
                            ? 'Any lead under this manager'
                            : 'Any team lead'}
                      </SelectItem>
                      {teamLeads.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {personLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {/* Show-only toggles */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Show only</span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={p.isClientHandler ? 'secondary' : 'outline'}
                aria-pressed={!!p.isClientHandler}
                className="h-9 gap-1.5 text-xs"
                onClick={() =>
                  onChange({ isClientHandler: p.isClientHandler ? undefined : 'true', page: 1 })
                }
              >
                {p.isClientHandler && <Check className="h-3.5 w-3.5" />}
                Client handlers
              </Button>
              <Button
                type="button"
                size="sm"
                variant={p.isContactOwner ? 'secondary' : 'outline'}
                aria-pressed={!!p.isContactOwner}
                className="h-9 gap-1.5 text-xs"
                onClick={() =>
                  onChange({
                    isContactOwner: p.isContactOwner ? undefined : 'true',
                    page: 1,
                  } as Partial<UsersListParams>)
                }
              >
                {p.isContactOwner && <Check className="h-3.5 w-3.5" />}
                Contact owners
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Applied filters ───────────────────────────────────────────── */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2.5">
          {chips.map(c => (
            <span
              key={c.key}
              className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-2.5 pr-1 text-xs"
            >
              <span className="truncate">{c.label}</span>
              <button
                type="button"
                aria-label={`Remove ${c.label}`}
                onClick={() => onChange({ ...c.clear, page: 1 } as Partial<UsersListParams>)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs text-muted-foreground"
            onClick={onReset}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
