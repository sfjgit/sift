// File: ScrollingGreetingBar.tsx
// Path: src/components/layout/ScrollingGreetingBar.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// ─── Quote config (data, not logic — swap for a DB/config feed later) ───────────
//
// Keyed by a lowercase keyword matched against the user's role name.
// First matching keyword wins; `default` is the fallback.

const ROLE_QUOTES: Record<string, string[]> = {
  lead: [
    'Unblock one teammate before you touch your own branch.',
    'The best architecture decision is the one you can explain in a sentence.',
    'Review like you care, ship like you trust.',
    'Clarity in the PR beats cleverness in the code.',
  ],
  architect: [
    'The best abstraction is the one you didn\u2019t need to write.',
    'Design for the schema you\u2019ll regret least.',
    'Boundaries you draw today are the bugs you skip tomorrow.',
  ],
  manager: [
    'A calm standup is a productive standup.',
    'People first, tickets second.',
    'Protect the makers\u2019 focus time.',
  ],
  recruiter: [
    'Every profile is a person, not a row.',
    'A fast, kind rejection beats a slow silence.',
    'Great hires start with great listening.',
  ],
  admin: [
    'Least privilege is a feature, not a friction.',
    'Config over hardcode, always.',
    'Boring infrastructure is happy infrastructure.',
  ],
  engineer: [
    'Small, clean commits beat one heroic push.',
    'Read the error. Then read it again.',
    'Slow is smooth, smooth is fast.',
  ],
  developer: [
    'Naming things well is half the design.',
    'Delete more than you add today.',
    'The bug is almost always where you swore it couldn\u2019t be.',
  ],
  default: [
    'Great work compounds quietly.',
    'Progress over polish, momentum over perfection.',
    'Do the next right thing.',
    'Ship, learn, sharpen, repeat.',
  ],
};

function quotesForRole(roleName?: string | null): string[] {
  const name = (roleName ?? '').toLowerCase();
  for (const key of Object.keys(ROLE_QUOTES)) {
    if (key !== 'default' && name.includes(key)) return ROLE_QUOTES[key];
  }
  return ROLE_QUOTES.default;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ScrollingGreetingBarProps {
  /** Override the auto role-based quotes entirely. */
  quotes?: string[];
  /** How long the big "pop" greeting stays before it merges into the bar (ms). */
  popDurationMs?: number;
  /** Seconds for one full marquee pass. Lower = faster. */
  scrollSeconds?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function resolveDisplayName(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return 'there';
  return user.displayName?.trim() || user.firstName?.trim() || user.email?.split('@')[0] || 'there';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScrollingGreetingBar({
  quotes,
  popDurationMs = 2200,
  scrollSeconds = 13,
}: ScrollingGreetingBarProps) {
  const { user } = useAuth();

  const [phase, setPhase] = useState<'pop' | 'bar'>('pop');
  const [quoteIndex, setQuoteIndex] = useState(0);

  const greeting = useMemo(() => getGreeting(), []);
  const name = resolveDisplayName(user);

  const roleQuotes = useMemo(
    () => quotes ?? quotesForRole(user?.role?.name),
    [quotes, user?.role?.name]
  );
  const quote = roleQuotes[quoteIndex % roleQuotes.length];

  useEffect(() => {
    if (phase !== 'pop') return;
    const t = setTimeout(() => setPhase('bar'), popDurationMs);
    return () => clearTimeout(t);
  }, [phase, popDurationMs]);

  useEffect(() => {
    if (phase !== 'bar') return;
    const t = setInterval(() => setQuoteIndex(i => i + 1), scrollSeconds * 1000);
    return () => clearInterval(t);
  }, [phase, scrollSeconds]);

  if (!user) return null;

  return (
    <div className={`sgb ${phase === 'pop' ? 'sgb--pop' : 'sgb--bar'}`}>
      {phase === 'pop' ? (
        <div className="sgb__pop">
          <span className="sgb__dot" aria-hidden />
          <span className="sgb__pop-text">
            {greeting}, <strong>{name}</strong>
          </span>
        </div>
      ) : (
        <div className="sgb__bar">
          <span className="sgb__label">
            <span className="sgb__dot sgb__dot--sm" aria-hidden />
            {greeting}, <strong>{name}</strong>
          </span>
          <span className="sgb__divider" aria-hidden />
          <div className="sgb__marquee">
            <div
              className="sgb__track"
              style={{ animationDuration: `${scrollSeconds}s` }}
              key={quoteIndex}
            >
              <span className="sgb__quote">{quote}</span>
              <span className="sgb__quote" aria-hidden>
                {quote}
              </span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Theme-aware. Falls back gracefully if these vars aren't defined. */
        .sgb {
          --sgb-primary: var(--primary, #4f46e5);
          --sgb-secondary: var(--secondary, #7c3aed);
          --sgb-on: var(--primary-foreground, #ffffff);

          position: relative;
          width: 100%;
          overflow: hidden;
          /* colorful primary → secondary band */
          background: linear-gradient(90deg, var(--sgb-primary) 0%, var(--sgb-secondary) 100%);
          color: var(--sgb-on);
          font-size: 16px; /* inherits app font-family, bigger size */
          font-style: normal;
          line-height: 1.2;
          transition:
            height 380ms cubic-bezier(0.22, 1, 0.36, 1),
            padding 380ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .sgb--pop {
          height: 68px;
          padding: 0 24px;
        }
        .sgb--bar {
          height: 42px;
          padding: 0 20px;
        }

        /* accent pulse dot */
        .sgb__dot {
          flex: 0 0 auto;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: var(--sgb-on);
          box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.55);
          animation: sgb-pulse 2.2s ease-out infinite;
        }
        .sgb__dot--sm {
          width: 8px;
          height: 8px;
          margin-right: 10px;
        }

        .sgb__pop {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          height: 100%;
          font-size: 22px;
          font-weight: 500;
          letter-spacing: 0.2px;
          animation: sgb-pop-in 440ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sgb__pop strong {
          font-weight: 800;
        }

        .sgb__bar {
          display: flex;
          align-items: center;
          gap: 16px;
          height: 100%;
          animation: sgb-fade-in 380ms ease 100ms both;
        }
        .sgb__label {
          display: inline-flex;
          align-items: center;
          flex: 0 0 auto;
          white-space: nowrap;
          font-size: 15px;
          font-weight: 500;
        }
        .sgb__label strong {
          font-weight: 800;
          margin-left: 5px;
        }
        .sgb__divider {
          flex: 0 0 auto;
          width: 1px;
          height: 18px;
          background: rgba(255, 255, 255, 0.4);
        }

        .sgb__marquee {
          flex: 1 1 auto;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(
            90deg,
            transparent 0,
            #000 32px,
            #000 calc(100% - 32px),
            transparent 100%
          );
          mask-image: linear-gradient(
            90deg,
            transparent 0,
            #000 32px,
            #000 calc(100% - 32px),
            transparent 100%
          );
        }
        .sgb__track {
          display: inline-flex;
          gap: 72px;
          white-space: nowrap;
          will-change: transform;
          animation-name: sgb-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .sgb__quote {
          font-size: 15px;
          font-weight: 500;
          font-style: normal;
          opacity: 0.95;
        }

        @keyframes sgb-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @keyframes sgb-pop-in {
          from {
            transform: translateY(-10px) scale(0.97);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes sgb-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes sgb-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.55);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(255, 255, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sgb__track,
          .sgb__dot {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
