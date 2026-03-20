const STATS = [
  { value: '6', label: 'Team members' },
  { value: '3', label: 'Services' },
  { value: 'v1', label: 'Current version' },
] as const;

export default function HeroStats() {
  return (
    <div className="flex items-center gap-10 mt-20 pt-10 border-t border-border">
      {STATS.map(({ value, label }) => (
        <div key={label} className="text-center">
          <div
            className="text-2xl font-bold text-foreground mb-0.5"
            style={{ letterSpacing: '-0.03em' }}
          >
            {value}
          </div>
          <div className="text-xs text-foreground/30">{label}</div>
        </div>
      ))}
    </div>
  );
}
