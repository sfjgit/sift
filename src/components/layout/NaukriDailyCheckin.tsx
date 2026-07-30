// File: NaukriDailyCheckin.tsx
// Path: src/components/naukri/NaukriDailyCheckin.tsx
//
// Mount ONCE in the (dashboard) layout. On the first ATS visit of the day it checks
// yesterday's Naukri-vs-ATS gap. If there's an unexplained gap, it pops a blocking
// dialog (no close, no escape, no outside-click) until the recruiter submits a reason.
//
// Shows only once per day:
//   - a localStorage day-stamp short-circuits repeat pops within the day
//   - the server is the real guard: once a reason is saved, `day.reason` is set and the
//     dialog never qualifies again (even across devices / cleared storage)
//   - a clean day (no gap) never blocks — nothing to justify

'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { AlertTriangle, TrendingDown, Loader2, PartyPopper } from 'lucide-react';
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
  const [promise, setPromise] = useState(true);
  const [done, setDone] = useState(false); // brief "thanks" state before closing

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
      // nothing to justify → mark done so we don't re-check today
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
      if (promise) {
        await axios.post(
          '/core/api/naukri/promise',
          { reportDate: yStr, promiseText: 'I will download every profile today.' },
          { baseURL: '/api/proxy' }
        );
      }
    },
    onSuccess: () => {
      localStorage.setItem(todayKey, 'done');
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setHandledToday(true);
      }, 1600);
    },
  });

  if (handledToday || !open || !day) return null;

  const gap = day.difference ?? 0;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="max-w-lg"
        // ── make it truly blocking ──
        onEscapeKeyDown={e => e.preventDefault()}
        // @ts-expect-error err
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={(e: any) => e.preventDefault()}
      >
        {done ? (
          // ── thank-you flash ──
          <div className="py-8 text-center">
            <PartyPopper className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="mt-3 text-lg font-black text-slate-900">Logged. Now go prove it. 💪</p>
            <p className="text-sm text-slate-500 mt-1">
              {promise ? "You promised — we're watching 👀" : 'Reason saved.'}
            </p>
          </div>
        ) : (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Yesterday · {format(yesterday, 'dd MMM yyyy')}
                </span>
              </div>

              {/* ── BIG LETTER gap ── */}
              <h2 className="mt-2 text-2xl font-black leading-tight text-slate-900">
                YOU VISITED <span className="text-blue-600">{day.naukri}</span> PROFILES — ONLY{' '}
                <span className="text-emerald-600">{day.ats}</span> MADE IT INTO THE ATS
              </h2>

              <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold text-rose-700">
                  {gap} profile{gap === 1 ? '' : 's'} unaccounted for.
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                {day.story?.detail || 'Tell us why they didn’t make it in — one honest line.'}
              </p>
            </AlertDialogHeader>

            {/* meme / gif for the banter */}
            {day.meme?.url && (
              <img
                src={day.meme.url}
                alt={day.meme.caption ?? 'meme'}
                className="w-full max-h-52 object-contain rounded-lg bg-slate-50 border border-slate-100"
              />
            )}

            {/* reason (required) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Why didn’t Naukri usage match your ATS uploads?
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                autoFocus
                placeholder="e.g. 20 were irrelevant after opening, 5 duplicates already in ATS…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {/* the promise */}
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={promise}
                  onChange={e => setPromise(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                I promise: today I’ll download <span className="text-primary">every</span> profile I
                open. 🤞
              </label>
            </div>

            <AlertDialogFooter>
              <Button
                className="w-full gap-2 font-bold"
                disabled={reason.trim().length < 3 || submitM.isPending}
                onClick={() => submitM.mutate()}
              >
                {submitM.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitM.isPending ? 'Saving…' : 'Submit & enter ATS'}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
