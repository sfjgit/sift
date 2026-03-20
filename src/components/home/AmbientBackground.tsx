export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Blue glow — top left */}
      <div
        className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Violet glow — bottom right */}
      <div
        className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full"
        style={{
          opacity: 0.08,
          background: 'radial-gradient(circle, var(--color-chart-3) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}
