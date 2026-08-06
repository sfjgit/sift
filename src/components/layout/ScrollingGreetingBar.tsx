// File: ScrollingGreetingBar.tsx
// Path: src/components/layout/ScrollingGreetingBar.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MeDay {
  reportDate: string;
  naukri: number | null;
  ats: number;
  difference: number | null;
  flags: string[];
  reason: string | null;
}
interface MeResponse {
  scope: string;
  streak: { currentStreak: number; totalKept: number; totalBroken: number };
  days: MeDay[];
}

// ─── THE quote — one, always, forever ────────────────────────────────────────

const THE_QUOTE = 'The downloaded CVs in Naukri and the parsed CVs should match in the ATS.';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Stat chip — ALWAYS renders, zero or not ─────────────────────────────────

interface ChipProps {
  label: string;
  value: number | null | undefined;
  variant?: 'neutral' | 'danger' | 'good' | 'muted';
}

function Chip({ label, value, variant = 'neutral' }: ChipProps) {
  // even if value is null/undefined we show "—" — never silently hide
  const display = value == null ? '—' : String(value);
  return (
    <span className={`sgb-chip sgb-chip--${variant}`}>
      <span className="sgb-chip__label">{label}</span>
      <span className="sgb-chip__value">{display}</span>
    </span>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ScrollingGreetingBarProps {
  popDurationMs?: number;
  scrollSeconds?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScrollingGreetingBar({
  popDurationMs = 2200,
  scrollSeconds = 16,
}: ScrollingGreetingBarProps) {
  const { user } = useAuth();
  const axios = useAxios();

  const [phase, setPhase] = useState<'pop' | 'bar'>('pop');

  const greeting = useMemo(() => getGreeting(), []);
  const name = resolveDisplayName(user);

  // ── dates ──
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => subDays(today, 1), [today]);
  const todayStr = format(today, 'yyyy-MM-dd');
  const yStr = format(yesterday, 'yyyy-MM-dd');

  // ── fetch BOTH days — from yesterday to today ──────────────────────────────
  // Never skip. Always fetch. Show whatever comes back.
  const meQ = useQuery<MeResponse>({
    queryKey: ['naukri-me-bar', yStr, todayStr],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    queryFn: async () =>
      (
        await axios.get(`/core/api/naukri/me?from=${yStr}&to=${todayStr}`, {
          baseURL: '/api/proxy',
        })
      ).data,
  });

  // Pull days — if a day entry is missing entirely, substitute a zero-skeleton
  // so the UI always has something to show.
  const yesterdayDay: Partial<MeDay> = meQ.data?.days?.find(d => d.reportDate === yStr) ?? {
    reportDate: yStr,
    naukri: null,
    ats: 0,
    difference: null,
  };

  const todayDay: Partial<MeDay> = meQ.data?.days?.find(d => d.reportDate === todayStr) ?? {
    reportDate: todayStr,
    naukri: null,
    ats: 0,
    difference: null,
  };

  // ── gap logic ──
  const yGap = yesterdayDay.difference ?? null;
  const gapBad = yGap != null && yGap > 0;

  // ── phase transitions ──
  useEffect(() => {
    if (phase !== 'pop') return;
    const t = setTimeout(() => setPhase('bar'), popDurationMs);
    return () => clearTimeout(t);
  }, [phase, popDurationMs]);

  if (!user) return null;

  return (
    <div
      className={['sgb', phase === 'pop' ? 'sgb--pop' : 'sgb--bar', gapBad ? 'sgb--alert' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {phase === 'pop' ? (
        // ── POP ──────────────────────────────────────────────────────────────
        <div className="sgb__pop">
          <span className="sgb__dot" aria-hidden />
          <span className="sgb__pop-text">
            {greeting}, <strong>{name}</strong>
          </span>
        </div>
      ) : (
        // ── BAR ──────────────────────────────────────────────────────────────
        <div className="sgb__bar">
          {/* LEFT — greeting */}
          <span className="sgb__label">
            <span className="sgb__dot sgb__dot--sm" aria-hidden />
            {greeting}, <strong>{name}</strong>
          </span>

          <span className="sgb__div" aria-hidden />

          {/* CENTER — THE scrolling quote, always */}
          <div className="sgb__marquee">
            <div className="sgb__track" style={{ animationDuration: `${scrollSeconds}s` }}>
              <span className="sgb__quote">{THE_QUOTE}</span>
              <span className="sgb__quote" aria-hidden>
                {THE_QUOTE}
              </span>
            </div>
          </div>

          <span className="sgb__div" aria-hidden />

          {/* RIGHT — stats. Always rendered. Loading state shows skeletons. */}
          <div className="sgb__stats">
            {/* Yesterday */}
            <div className="sgb__stat-col">
              <span className="sgb__eyebrow">{format(yesterday, 'dd MMM')} · Yesterday</span>
              <div className="sgb__chips">
                <Chip label="Naukri" value={yesterdayDay.naukri} variant="neutral" />
                <Chip label="ATS" value={yesterdayDay.ats} variant="neutral" />
                <Chip
                  label="Gap"
                  value={yGap}
                  variant={yGap == null ? 'muted' : yGap === 0 ? 'good' : 'danger'}
                />
              </div>
            </div>

            <span className="sgb__stat-sep" aria-hidden />

            {/* Today */}
            <div className="sgb__stat-col">
              <span className="sgb__eyebrow">Today · Sourced so far</span>
              <div className="sgb__chips">
                <Chip label="ATS" value={todayDay.ats} variant="muted" />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ── Base ─────────────────────────────────────────────────────────── */
        .sgb {
          --blue-dark: #1e3a8a; /* blue-900 */
          --blue-mid: #1d4ed8; /* blue-700 */
          --blue-light: #2563eb; /* blue-600 */
          --white: #ffffff;

          position: relative;
          width: 100%;
          overflow: hidden;
          background: linear-gradient(
            90deg,
            var(--blue-dark) 0%,
            var(--blue-mid) 60%,
            var(--blue-light) 100%
          );
          color: var(--white);
          font-size: 15px;
          line-height: 1.2;
          transition:
            height 380ms cubic-bezier(0.22, 1, 0.36, 1),
            padding 380ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* gap alert — keep blue but add a top red hairline */
        .sgb--alert {
          box-shadow: inset 0 -3px 0 0 #ef4444;
        }

        .sgb--pop {
          height: 80px;
          padding: 0 28px;
        }
        .sgb--bar {
          height: 56px;
          padding: 0 18px;
        }

        /* ── Dot ──────────────────────────────────────────────────────────── */
        .sgb__dot {
          flex: 0 0 auto;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.5);
          animation: sgb-pulse 2.2s ease-out infinite;
        }
        .sgb__dot--sm {
          width: 8px;
          height: 8px;
          margin-right: 10px;
        }

        /* ── Pop ──────────────────────────────────────────────────────────── */
        .sgb__pop {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          height: 100%;
          font-size: 24px;
          font-weight: 500;
          animation: sgb-pop-in 440ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sgb__pop strong {
          font-weight: 800;
        }

        /* ── Bar layout ───────────────────────────────────────────────────── */
        .sgb__bar {
          display: flex;
          align-items: center;
          gap: 14px;
          height: 100%;
          animation: sgb-fade-in 380ms ease 100ms both;
        }

        .sgb__label {
          display: inline-flex;
          align-items: center;
          flex: 0 0 auto;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500;
        }
        .sgb__label strong {
          font-weight: 800;
          margin-left: 4px;
        }

        .sgb__div {
          flex: 0 0 auto;
          width: 1px;
          height: 22px;
          background: rgba(255, 255, 255, 0.28);
        }

        /* ── Marquee ──────────────────────────────────────────────────────── */
        .sgb__marquee {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(
            90deg,
            transparent 0,
            #000 24px,
            #000 calc(100% - 24px),
            transparent 100%
          );
          mask-image: linear-gradient(
            90deg,
            transparent 0,
            #000 24px,
            #000 calc(100% - 24px),
            transparent 100%
          );
        }
        .sgb__track {
          display: inline-flex;
          gap: 96px;
          white-space: nowrap;
          will-change: transform;
          animation: sgb-scroll linear infinite;
        }
        .sgb__quote {
          font-size: 13.5px;
          font-weight: 600;
          font-style: italic;
          /* white glow behind text so it pops on the blue */
          text-shadow:
            0 0 18px rgba(255, 255, 255, 0.45),
            0 1px 3px rgba(0, 0, 0, 0.35);
          letter-spacing: 0.15px;
          opacity: 0.97;
        }

        /* ── Stats panel ──────────────────────────────────────────────────── */
        .sgb__stats {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sgb__stat-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
        }
        .sgb__eyebrow {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          opacity: 0.6;
          white-space: nowrap;
        }
        .sgb__chips {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .sgb__stat-sep {
          width: 1px;
          height: 32px;
          background: rgba(255, 255, 255, 0.2);
          flex: 0 0 auto;
        }

        /* ── Chips ────────────────────────────────────────────────────────── */
        .sgb-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 5px;
          padding: 3px 8px;
          white-space: nowrap;
        }
        .sgb-chip__label {
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          opacity: 0.75;
        }
        .sgb-chip__value {
          font-size: 14px;
          font-weight: 900;
          /* WHITE box-shadow highlight behind every number */
          text-shadow:
            0 0 12px rgba(255, 255, 255, 0.8),
            0 0 4px rgba(255, 255, 255, 0.6);
        }

        /* neutral — soft white glass */
        .sgb-chip--neutral {
          background: rgba(255, 255, 255, 0.14);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.18) inset,
            0 2px 8px rgba(0, 0, 0, 0.2);
          color: #fff;
        }

        /* danger — white card, red number, throb */
        .sgb-chip--danger {
          background: #fff;
          box-shadow:
            0 0 0 1.5px #ef4444,
            0 3px 10px rgba(239, 68, 68, 0.45);
          color: #dc2626;
          animation: sgb-throb 1.6s ease-in-out infinite;
        }
        .sgb-chip--danger .sgb-chip__label {
          opacity: 0.6;
        }
        .sgb-chip--danger .sgb-chip__value {
          text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }

        /* good — green tinted glass */
        .sgb-chip--good {
          background: rgba(16, 185, 129, 0.2);
          box-shadow:
            0 0 0 1px rgba(16, 185, 129, 0.5),
            0 2px 8px rgba(16, 185, 129, 0.25);
          color: #d1fae5;
        }
        .sgb-chip--good .sgb-chip__value {
          text-shadow: 0 0 10px rgba(52, 211, 153, 0.8);
        }

        /* muted — dimmer neutral for today / missing data */
        .sgb-chip--muted {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          box-shadow: none;
        }
        .sgb-chip--muted .sgb-chip__value {
          text-shadow: none;
          font-size: 13px;
        }

        /* ── Animations ───────────────────────────────────────────────────── */
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
            transform: translateY(-12px) scale(0.96);
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
        @keyframes sgb-throb {
          0%,
          100% {
            box-shadow:
              0 0 0 1.5px #ef4444,
              0 3px 10px rgba(239, 68, 68, 0.45);
          }
          50% {
            box-shadow:
              0 0 0 2.5px #ef4444,
              0 4px 16px rgba(239, 68, 68, 0.7);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sgb__track,
          .sgb__dot,
          .sgb-chip--danger {
            animation: none;
          }
        }

        /* hide stats panel only on very small phones */
        @media (max-width: 560px) {
          .sgb__stats {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
