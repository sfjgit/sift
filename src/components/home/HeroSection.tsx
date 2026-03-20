import Link from 'next/link';
import HeroStats from './HeroStats';

export default function HeroSection() {
  return (
    <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-6 text-center">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-foreground/4 text-xs text-foreground/50 mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-chart-2 animate-pulse" />
        Internal — ATS Platform v1.0
      </div>

      {/* Headline */}
      <h1
        className="max-w-3xl text-[56px] font-bold leading-[1.08] tracking-tight text-foreground mb-6"
        style={{ letterSpacing: '-0.03em' }}
      >
        Hire faster.
        <br />
        <span
          style={{
            background:
              'linear-gradient(135deg, var(--color-chart-1) 0%, var(--color-chart-3) 50%, var(--color-chart-2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Track smarter.
        </span>
      </h1>

      <p className="max-w-md text-base text-foreground/40 leading-relaxed mb-10">
        A unified applicant tracking system built for scale — manage pipelines, coordinate
        interviews, and make better hiring decisions, all in one place.
      </p>

      {/* CTAs */}
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-primary-foreground transition-all duration-150"
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary) 0%, var(--color-chart-3) 100%)',
            boxShadow: '0 0 24px color-mix(in oklch, var(--color-primary) 30%, transparent)',
          }}
        >
          Open Dashboard
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 7h8M8 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <Link
          href="/ats-doc"
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-foreground/60 hover:text-foreground border border-border hover:border-border/60 hover:bg-foreground/4 transition-all duration-150"
        >
          View Docs
        </Link>
      </div>

      <HeroStats />
    </main>
  );
}
