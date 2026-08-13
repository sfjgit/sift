// File: ScrollingGreetingBar.tsx
// Path: src/components/layout/ScrollingGreetingBar.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  // NEW — 3-step activity breakdown, now returned by /naukri/me
  profilesViewed?: number;
  phonesRevealed?: number;
  cvsDownloaded?: number;
  completeProfiles?: number;
}
interface MeResponse {
  scope: string;
  streak: { currentStreak: number; totalKept: number; totalBroken: number };
  days: MeDay[];
}

// ─── THE quote ───────────────────────────────────────────────────────────────

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface ScrollingGreetingBarProps {
  popDurationMs?: number;
  scrollSeconds?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScrollingGreetingBar({
  popDurationMs = 2200,
  scrollSeconds = 18,
}: ScrollingGreetingBarProps) {
  const { user } = useAuth();
  const axios = useAxios();

  const [phase, setPhase] = useState<'pop' | 'bar'>('pop');

  const greeting = useMemo(() => getGreeting(), []);
  const name = resolveDisplayName(user);

  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => subDays(today, 1), [today]);
  const todayStr = format(today, 'yyyy-MM-dd');
  const yStr = format(yesterday, 'yyyy-MM-dd');

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

  // Always produce an object for each day — zero-skeleton if missing
  const yDay: Partial<MeDay> = meQ.data?.days?.find(d => d.reportDate === yStr) ?? {
    reportDate: yStr,
    naukri: null,
    ats: 0,
    difference: null,
  };

  const tDay: Partial<MeDay> = meQ.data?.days?.find(d => d.reportDate === todayStr) ?? {
    reportDate: todayStr,
    naukri: null,
    ats: 0,
    difference: null,
    profilesViewed: 0,
    phonesRevealed: 0,
    cvsDownloaded: 0,
    completeProfiles: 0,
  };

  // ── gap status ──
  // naukri > ats  → DANGER  (red)
  // ats >= naukri && naukri != null → GOOD (green)
  // naukri null   → PENDING (grey)
  type Status = 'danger' | 'good' | 'pending';
  function gapStatus(naukri: number | null | undefined, ats: number | undefined): Status {
    if (naukri == null) return 'pending';
    if ((ats ?? 0) >= naukri) return 'good';
    return 'danger';
  }

  const yStatus = gapStatus(yDay.naukri, yDay.ats);
  const yGap = yDay.difference ?? (yDay.naukri != null ? yDay.naukri - (yDay.ats ?? 0) : null);

  useEffect(() => {
    if (phase !== 'pop') return;
    const t = setTimeout(() => setPhase('bar'), popDurationMs);
    return () => clearTimeout(t);
  }, [phase, popDurationMs]);

  if (!user) return null;

  const isAlert = yStatus === 'danger';

  return (
    <div
      className={`sgb ${phase === 'pop' ? 'sgb--pop' : 'sgb--bar'} ${isAlert ? 'sgb--alert' : ''}`}
    >
      {phase === 'pop' ? (
        <div className="sgb__pop">
          <span className="sgb__dot" aria-hidden />
          <span>
            {greeting}, <strong>{name}</strong>
          </span>
        </div>
      ) : (
        <div className="sgb__bar">
          {/* ── LEFT: greeting ── */}
          <div className="sgb__greeting">
            <span className="sgb__dot sgb__dot--sm" aria-hidden />
            <span className="sgb__greet-text">
              {greeting}, <strong>{name}</strong>
            </span>
          </div>

          <span className="sgb__sep" />

          {/* ── CENTER: scrolling quote ── */}
          <div className="sgb__marquee">
            <div className="sgb__track" style={{ animationDuration: `${scrollSeconds}s` }}>
              <span className="sgb__quote">{THE_QUOTE}</span>
              <span className="sgb__quote" aria-hidden>
                {THE_QUOTE}
              </span>
            </div>
          </div>

          <span className="sgb__sep" />

          {/* ── RIGHT: stat cards ── */}
          <div className="sgb__stats">
            {/* Yesterday card */}
            <div className={`sgb__card sgb__card--${yStatus}`}>
              <div className="sgb__card-header">
                <span className="sgb__card-date">{format(yesterday, 'dd MMM')}</span>
                <span className="sgb__card-badge">
                  {yStatus === 'danger' && <TrendingDown className="sgb__badge-icon" />}
                  {yStatus === 'good' && <TrendingUp className="sgb__badge-icon" />}
                  {yStatus === 'pending' && <Minus className="sgb__badge-icon" />}
                  {yStatus === 'danger' ? 'Gap' : yStatus === 'good' ? 'Match' : 'Pending'}
                </span>
              </div>
              <div className="sgb__card-row">
                <div className="sgb__metric">
                  <span className="sgb__metric-label">Naukri</span>
                  <span className="sgb__metric-val">{yDay.naukri ?? '—'}</span>
                </div>
                <div className="sgb__metric-arrow">→</div>
                <div className="sgb__metric">
                  <span className="sgb__metric-label">ATS</span>
                  <span className="sgb__metric-val sgb__metric-val--ats">{yDay.ats ?? 0}</span>
                </div>
                {yGap != null && (
                  <>
                    <div className="sgb__metric-arrow">=</div>
                    <div className="sgb__metric">
                      <span className="sgb__metric-label">{yGap > 0 ? 'Missing' : 'Delta'}</span>
                      <span
                        className={`sgb__metric-val sgb__metric-val--gap ${yGap > 0 ? 'val--bad' : 'val--ok'}`}
                      >
                        {yGap > 0 ? `−${yGap}` : `+${Math.abs(yGap)}`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Today card */}
            <div className="sgb__card sgb__card--today">
              <div className="sgb__card-header">
                <span className="sgb__card-date">Today</span>
                <span className="sgb__card-badge">Sourced</span>
              </div>
              <div className="sgb__card-row">
                {/* FIX: was never coded to show Naukri at all — not because
                    data was missing, this card just never had the markup for
                    it. Shown conditionally, same pattern as Yesterday's card,
                    only when a report has actually been uploaded for today. */}
                {tDay.naukri != null && (
                  <>
                    <div className="sgb__metric">
                      <span className="sgb__metric-label">Naukri</span>
                      <span className="sgb__metric-val">{tDay.naukri}</span>
                    </div>
                    <div className="sgb__metric-arrow">→</div>
                  </>
                )}
                <div className="sgb__metric">
                  <span className="sgb__metric-label">ATS</span>
                  <span className="sgb__metric-val sgb__metric-val--ats">{tDay.ats ?? 0}</span>
                </div>
                {/* NEW — 3-step breakdown, compact, for real-time self-check */}
                <div className="sgb__metric-arrow">·</div>
                <div className="sgb__metric sgb__metric--mini">
                  <span className="sgb__metric-label">Profiles</span>
                  <span className="sgb__metric-val sgb__metric-val--mini">
                    {tDay.profilesViewed ?? 0}
                  </span>
                </div>
                <div className="sgb__metric sgb__metric--mini">
                  <span className="sgb__metric-label">Phones</span>
                  <span className="sgb__metric-val sgb__metric-val--mini">
                    {tDay.phonesRevealed ?? 0}
                  </span>
                </div>
                <div className="sgb__metric sgb__metric--mini">
                  <span className="sgb__metric-label">Resumes</span>
                  <span className="sgb__metric-val sgb__metric-val--mini">
                    {tDay.cvsDownloaded ?? 0}
                  </span>
                </div>
                <div className="sgb__metric sgb__metric--mini">
                  <span className="sgb__metric-label">Complete</span>
                  <span className="sgb__metric-val sgb__metric-val--mini sgb__metric-val--complete">
                    {tDay.completeProfiles ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ══════════════════════════════════════════════════════════════════
           BASE — deep navy blue
        ══════════════════════════════════════════════════════════════════ */
        .sgb {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: linear-gradient(100deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%);
          color: #fff;
          font-family: inherit;
          line-height: 1;
          transition:
            height 400ms cubic-bezier(0.22, 1, 0.36, 1),
            padding 400ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* alert: red bottom-border pulse */
        .sgb--alert::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #ef4444;
          animation: sgb-redline 2s ease-in-out infinite;
        }

        .sgb--pop {
          height: 80px;
          padding: 0 28px;
        }
        .sgb--bar {
          height: 64px;
          padding: 0 20px;
        }

        /* ── dot ── */
        .sgb__dot {
          flex: 0 0 auto;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          animation: sgb-pulse 2.2s ease-out infinite;
        }
        .sgb__dot--sm {
          width: 7px;
          height: 7px;
          margin-right: 9px;
        }

        /* ── pop ── */
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

        /* ── bar layout ── */
        .sgb__bar {
          display: flex;
          align-items: center;
          gap: 14px;
          height: 100%;
          animation: sgb-fade-in 380ms ease 80ms both;
        }

        .sgb__greeting {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          white-space: nowrap;
        }
        .sgb__greet-text {
          font-size: 14px;
          font-weight: 500;
        }
        .sgb__greet-text strong {
          font-weight: 800;
        }

        .sgb__sep {
          flex: 0 0 auto;
          width: 1px;
          height: 28px;
          background: rgba(255, 255, 255, 0.2);
        }

        /* ── marquee ── */
        .sgb__marquee {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(
            90deg,
            transparent,
            #000 20px,
            #000 calc(100% - 20px),
            transparent
          );
          mask-image: linear-gradient(
            90deg,
            transparent,
            #000 20px,
            #000 calc(100% - 20px),
            transparent
          );
        }
        .sgb__track {
          display: inline-flex;
          gap: 100px;
          white-space: nowrap;
          will-change: transform;
          animation: sgb-scroll linear infinite;
        }
        .sgb__quote {
          font-size: 13px;
          font-weight: 600;
          font-style: italic;
          color: rgba(255, 255, 255, 0.88);
          text-shadow: 0 0 20px rgba(147, 197, 253, 0.6);
          letter-spacing: 0.2px;
        }

        /* ══════════════════════════════════════════════════════════════════
           STAT CARDS
        ══════════════════════════════════════════════════════════════════ */
        .sgb__stats {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sgb__card {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 10px;
          backdrop-filter: blur(8px);
          border: 1px solid transparent;
          min-width: 0;
        }

        /* danger card — red glowing */
        .sgb__card--danger {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow:
            0 0 0 1px rgba(239, 68, 68, 0.3),
            0 4px 16px rgba(239, 68, 68, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          animation: sgb-card-throb 2s ease-in-out infinite;
        }

        /* good card — green glowing */
        .sgb__card--good {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.45);
          box-shadow:
            0 0 0 1px rgba(16, 185, 129, 0.25),
            0 4px 16px rgba(16, 185, 129, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        /* pending / no naukri data yet */
        .sgb__card--pending {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        /* today card — subtle blue tint */
        .sgb__card--today {
          background: rgba(59, 130, 246, 0.18);
          border-color: rgba(96, 165, 250, 0.35);
          box-shadow:
            0 4px 14px rgba(59, 130, 246, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        /* ── card header ── */
        .sgb__card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .sgb__card-date {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.65;
        }
        .sgb__card-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          padding: 1px 6px;
          border-radius: 99px;
        }
        .sgb__card--danger .sgb__card-badge {
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
        }
        .sgb__card--good .sgb__card-badge {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }
        .sgb__card--pending .sgb__card-badge {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.45);
        }
        .sgb__card--today .sgb__card-badge {
          background: rgba(96, 165, 250, 0.2);
          color: #93c5fd;
        }
        .sgb__badge-icon {
          width: 9px;
          height: 9px;
          flex: 0 0 auto;
        }

        /* ── metrics row ── */
        .sgb__card-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sgb__metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
        }
        .sgb__metric-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          opacity: 0.55;
          white-space: nowrap;
        }
        .sgb__metric-val {
          font-size: 18px;
          font-weight: 900;
          line-height: 1;
          /* White glow highlight behind every number */
          text-shadow:
            0 0 14px rgba(255, 255, 255, 0.7),
            0 0 4px rgba(255, 255, 255, 0.4);
        }

        /* ATS value — always bright white */
        .sgb__metric-val--ats {
          color: #fff;
          text-shadow:
            0 0 16px rgba(255, 255, 255, 0.9),
            0 0 6px rgba(147, 197, 253, 0.6);
        }

        /* NEW — compact mini-metrics for the 3-step breakdown on Today card */
        .sgb__metric--mini {
          gap: 0;
        }
        .sgb__metric-val--mini {
          font-size: 13px;
          font-weight: 800;
          text-shadow: none;
          color: rgba(255, 255, 255, 0.85);
        }
        .sgb__metric-val--complete {
          color: #6ee7b7;
          text-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        /* gap value colours */
        .sgb__metric-val--gap.val--bad {
          color: #fca5a5; /* red-300 — readable on dark */
          text-shadow:
            0 0 12px rgba(239, 68, 68, 0.8),
            0 0 4px rgba(239, 68, 68, 0.4);
          font-size: 20px;
        }
        .sgb__metric-val--gap.val--ok {
          color: #6ee7b7; /* emerald-300 */
          text-shadow:
            0 0 12px rgba(16, 185, 129, 0.8),
            0 0 4px rgba(16, 185, 129, 0.4);
        }

        .sgb__metric-arrow {
          font-size: 11px;
          opacity: 0.35;
          font-weight: 700;
          padding: 0 1px;
          align-self: flex-end;
          margin-bottom: 2px;
        }

        /* ══════════════════════════════════════════════════════════════════
           ANIMATIONS
        ══════════════════════════════════════════════════════════════════ */
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
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.5);
          }
          70% {
            box-shadow: 0 0 0 7px rgba(255, 255, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }
        @keyframes sgb-card-throb {
          0%,
          100% {
            box-shadow:
              0 0 0 1px rgba(239, 68, 68, 0.3),
              0 4px 16px rgba(239, 68, 68, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }
          50% {
            box-shadow:
              0 0 0 2px rgba(239, 68, 68, 0.6),
              0 6px 24px rgba(239, 68, 68, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }
        }
        @keyframes sgb-redline {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sgb__track,
          .sgb__dot,
          .sgb__card--danger,
          .sgb--alert::after {
            animation: none;
          }
        }

        @media (max-width: 640px) {
          .sgb__stats {
            display: none;
          }
          .sgb--bar {
            height: 52px;
          }
        }
      `}</style>
    </div>
  );
}
