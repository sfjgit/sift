// File: page.tsx
// Path: src/app/page.tsx

'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[20%] w-125 h-125 rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-[-5%] right-[10%] w-100 h-100 rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Logo mark */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 12L8 4L13 12"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M5 9H11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span
              className="text-sm font-semibold text-foreground/80 tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              TalentOS
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-[22px] font-bold text-foreground tracking-tight mb-1"
              style={{ letterSpacing: '-0.025em' }}
            >
              Hire smarter.
            </h1>
            <p className="text-sm text-muted-foreground">
              Your internal recruitment platform for the entire hiring lifecycle.
            </p>
          </div>

          {/* CTA */}
          <Link
            href="/sign-in"
            className="flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-medium text-primary-foreground transition-all duration-150"
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
              boxShadow: '0 0 20px color-mix(in oklch, var(--color-primary) 25%, transparent)',
            }}
          >
            Sign in to workspace
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-5">
          Internal platform &mdash; SFJBS
        </p>
      </div>
    </div>
  );
}
