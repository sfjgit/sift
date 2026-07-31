// File: NaukriDailyCheckin.tsx
// Path: src/components/naukri/NaukriDailyCheckin.tsx
//
// Mount ONCE in the (dashboard) layout. On the first ATS visit of the day it checks
// yesterday's Naukri-vs-TalentOS gap. If there's an unexplained gap, it opens a blocking
// dialog (no close, no escape, no outside-click) until the recruiter submits a comment.
//
// Shows only once per day:
//   - a localStorage day-stamp short-circuits repeat pops within the day
//   - the server is the real guard: once a reason is saved, `day.reason` is set and the
//     dialog never qualifies again (even across devices / cleared storage)
//   - a clean day (no gap) never blocks — nothing to explain

'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { AlertTriangle, Loader2, CheckCircle2, Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAxios } from '@/hooks/useAxios';

interface DayStory {
  tone: string;
  headline: string;
  detail: string;
  requireReason: boolean;
  askPromise: boolean;
}
interface MeDay {
  reportDate: string;
  naukri: number | null;
  ats: number;
  difference: number | null;
  flags: string[];
  reason: string | null;
  promiseMade: boolean;
  promiseStatus: string;
  story: DayStory;
  meme: { url: string; caption: string | null } | null;
}
interface MeResponse {
  scope: string;
  streak: { currentStreak: number; totalKept: number; totalBroken: number };
  days: MeDay[];
}

export default function NaukriDailyCheckin() {
  const axios = useAxios();

  const yesterday = useMemo(() => subDays(new Date(), 1), []);
  const yStr = format(yesterday, 'yyyy-MM-dd');
  const todayKey = `naukri_checkin_${format(new Date(), 'yyyy-MM-dd')}`;

  // already handled today? skip everything.
  const [handledToday, setHandledToday] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHandledToday(typeof window !== 'undefined' && localStorage.getItem(todayKey) === 'done');
  }, [todayKey]);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false); // brief confirmation state before closing

  const meQ = useQuery<MeResponse>({
    queryKey: ['naukri-me-checkin', yStr],
    enabled: !handledToday,
    queryFn: async () =>
      (
        await axios.get(`/core/api/naukri/me?from=${yStr}&to=${yStr}`, {
          baseURL: '/api/proxy',
        })
      ).data,
  });

  const day = meQ.data?.days?.[0];

  // decide whether to block: gap exists, not yet explained
  useEffect(() => {
    if (handledToday || !day) return;
    const needs = day.story?.requireReason && !day.reason && day.naukri != null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (needs) setOpen(true);
    else {
      // nothing to explain → mark done so we don't re-check today
      localStorage.setItem(todayKey, 'done');
      setHandledToday(true);
    }
  }, [day, handledToday, todayKey]);

  const submitM = useMutation({
    mutationFn: async () => {
      await axios.post(
        '/core/api/naukri/reason',
        { reportDate: yStr, reason: reason.trim() },
        { baseURL: '/api/proxy' }
      );
    },
    onSuccess: () => {
      localStorage.setItem(todayKey, 'done');
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setHandledToday(true);
      }, 1400);
    },
  });

  if (handledToday || !open || !day) return null;

  const gap = day.difference ?? 0;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="max-w-lg overflow-hidden border-2 border-red-500 p-0 shadow-2xl shadow-red-900/30 ring-4 ring-red-500/20"
        // ── make it truly blocking ──
        onEscapeKeyDown={e => e.preventDefault()}
        // @ts-expect-error err
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={(e: any) => e.preventDefault()}
      >
        {done ? (
          // ── confirmation flash ──
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-lg font-semibold text-slate-900">Comments saved</p>
            <p className="mt-1 text-sm text-slate-500">Thank you for the update.</p>
          </div>
        ) : (
          <>
            {/* ── red alert bar ── */}
            <div className="flex items-center gap-2 bg-red-600 px-5 py-3 text-white">
              <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest">
                Action required · Sourcing variance
              </span>
            </div>

            <div className="px-5 pb-5 pt-4">
              <AlertDialogHeader>
                <h2 className="text-lg font-bold leading-snug text-slate-900">
                  Date {format(yesterday, 'dd MMM yyyy')} · Naukri Source vs Sourced to TalentOS
                </h2>

                {/* ── numbers ── */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Naukri
                    </p>
                    <p className="text-2xl font-bold text-slate-900">{day.naukri}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      TalentOS
                    </p>
                    <p className="text-2xl font-bold text-slate-900">{day.ats}</p>
                  </div>
                  <div className="rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
                      Not accounted
                    </p>
                    <p className="text-2xl font-extrabold text-red-600">{gap}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2">
                  <p className="text-sm font-medium text-red-800">
                    {gap} profile{gap === 1 ? '' : 's'} viewed on Naukri{' '}
                    {gap === 1 ? 'was' : 'were'} not added to TalentOS for this date. This variance
                    is recorded and appears in the daily sourcing report.
                  </p>
                </div>

                <p className="mt-3 text-sm text-slate-600">
                  Please share your comments so the numbers can be reconciled.
                </p>
              </AlertDialogHeader>

              {/* comments (required) */}
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Share your comments <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="e.g. 20 profiles were not relevant after review, 5 were duplicates already in TalentOS…"
                  className="w-full rounded-lg border-2 border-red-200 bg-red-50/40 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25"
                />
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Lock className="h-3 w-3" />
                  Comments are required to continue into TalentOS.
                </p>
              </div>

              <AlertDialogFooter className="mt-4">
                <Button
                  className="w-full gap-2 bg-red-600 font-bold text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300"
                  disabled={reason.trim().length < 3 || submitM.isPending}
                  onClick={() => submitM.mutate()}
                >
                  {submitM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitM.isPending ? 'Saving…' : 'Submit & continue'}
                </Button>
              </AlertDialogFooter>
            </div>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
