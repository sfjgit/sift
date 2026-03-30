/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

export default function UserInfoCard({ user }: { user: any }) {
  const fields: { label: string; value: string | null | undefined }[] = [
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone },
    { label: 'Role', value: user.role?.name },
    { label: 'Business Unit', value: user.businessUnit?.name },
    { label: 'Working Location', value: user.workingLocation },
    { label: 'Timezone', value: user.timezone },
  ];

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="border border-border rounded-lg p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-muted-foreground">
              {(user.firstName?.[0] ?? '').toUpperCase()}
              {(user.lastName?.[0] ?? '').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {[user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
          </div>
          <div className="ml-auto">
            <span
              className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                user.isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-4" />

        {/* Fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="text-sm text-foreground">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team memberships */}
      {user.teamMemberships?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Team Memberships</h2>
            <span className="text-xs text-muted-foreground">
              {user.teamMemberships.length} total
            </span>
          </div>
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {user.teamMemberships.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-foreground">{m.team?.name ?? m.teamId}</p>
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                  {m.teamRole}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
