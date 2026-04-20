interface BUStatsProps {
  teamsCount: number;
  usersCount: number;
  clientsCount: number;
  requirementsCount: number;
  openingsTotal: number;
  filledTotal: number;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-semibold text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

export function BUStats({
  teamsCount,
  usersCount,
  clientsCount,
  requirementsCount,
  openingsTotal,
  filledTotal,
}: BUStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <StatCard label="Teams" value={teamsCount} sub="Active teams" />
      <StatCard label="Members" value={usersCount} sub="Across all roles" />
      <StatCard label="Clients" value={clientsCount} sub="Active clients" />
      <StatCard
        label="Requirements"
        value={requirementsCount}
        sub={`${openingsTotal} openings · ${filledTotal} filled`}
      />
    </div>
  );
}
