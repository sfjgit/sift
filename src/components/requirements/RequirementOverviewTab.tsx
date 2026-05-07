/* eslint-disable react/no-unescaped-entities */
'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Calendar, Clock, Download, FileText, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR, daysRemaining, fullName } from './types';
import type { RequirementDetail } from './types';

interface Props {
  requirement: RequirementDetail;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: number | string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${warn ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-border bg-card'}`}
    >
      <p
        className={`text-2xl font-bold tabular-nums ${warn ? 'text-red-600 dark:text-red-400' : ''}`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Date row ────────────────────────────────────────────────────────────────
function DateRow({
  label,
  date,
  breached,
}: {
  label: string;
  date: string | null;
  breached?: boolean;
}) {
  if (!date) return null;
  const days = daysRemaining(date);
  const past = days !== null && days < 0;
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{format(new Date(date), 'dd MMM yyyy')}</span>
        {days !== null && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              breached || past
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                : days <= 3
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {past ? `${Math.abs(days)}d overdue` : `${days}d left`}
          </span>
        )}
      </div>
    </div>
  );
}

export function RequirementOverviewTab({ requirement: r }: Props) {
  const fillPct = r.totalOpenings > 0 ? Math.round((r.filledOpenings / r.totalOpenings) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ── Breach banner ─────────────────────────────────────────────────── */}
      {(r.isRespondByBreached || r.isTurnaroundBreached) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {r.isRespondByBreached && 'Respond-by deadline breached. '}
            {r.isTurnaroundBreached && 'Turnaround deadline breached.'}
          </span>
        </div>
      )}

      {/* ── Opening stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatTile label="Total Openings" value={r.totalOpenings} />
        <StatTile label="Filled" value={r.filledOpenings} sub={`${fillPct}%`} />
        <StatTile label="Active Apps" value={r.activeApplications} />
        <StatTile label="Interviews" value={r.interviewsScheduled} />
        <StatTile label="Offers Rolled" value={r.offersRolledOut} />
      </div>

      {/* Fill progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Fill progress</span>
          <span>
            {r.filledOpenings}/{r.totalOpenings} openings
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Job details ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Type</p>
                <p className="font-medium mt-0.5">{r.jobType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Remote</p>
                <p className="font-medium mt-0.5">{r.remoteType}</p>
              </div>
              {r.location && (
                <div className="col-span-2 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="font-medium">
                    {r.location}
                    {r.country ? `, ${r.country}` : ''}
                  </p>
                </div>
              )}
              {(r.experienceMin != null || r.experienceMax != null) && (
                <div>
                  <p className="text-muted-foreground text-xs">Experience</p>
                  <p className="font-medium mt-0.5">
                    {r.experienceMin ?? 0}–{r.experienceMax ?? '+'} yrs
                  </p>
                </div>
              )}
              {(r.salaryMin != null || r.salaryMax != null) && (
                <div>
                  <p className="text-muted-foreground text-xs">Salary</p>
                  <p className="font-medium mt-0.5">
                    {r.salaryMin?.toLocaleString()} – {r.salaryMax?.toLocaleString()}
                    {r.salaryType ? ` / ${r.salaryType.toLowerCase()}` : ''}
                  </p>
                </div>
              )}
            </div>

            {r.skills.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.skills.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs font-normal">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {r.description && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Client & SPOC ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{r.client.name}</span>
                {r.client.industry && (
                  <Badge variant="outline" className="text-[10px]">
                    {r.client.industry}
                  </Badge>
                )}
              </div>
              {r.businessUnit && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <span>BU:</span>
                  <span className="font-medium text-foreground">{r.businessUnit.name}</span>
                </div>
              )}
              {r.serviceLine && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <span>Service Line:</span>
                  <span className="font-medium text-foreground">{r.serviceLine.name}</span>
                </div>
              )}
              {r.clientSpoc && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">SPOC Handler</p>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{fullName(r.clientSpoc.handler)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Dates ──────────────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <DateRow label="Start Date" date={r.startDate} />
              <DateRow label="End Date" date={r.endDate} />
              <DateRow label="Respond By" date={r.respondBy} breached={r.isRespondByBreached} />
              {r.turnaroundDays != null && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Turnaround</span>
                  </div>
                  <span
                    className={`text-sm font-medium ${r.isTurnaroundBreached ? 'text-red-600' : ''}`}
                  >
                    {r.turnaroundDays} days
                    {r.isTurnaroundBreached && ' (breached)'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── JD File ───────────────────────────────────────────────────────── */}
      {r.jdFileName && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{r.jdFileName}</p>
                  {r.jdUploadedAt && (
                    <p className="text-xs text-muted-foreground">
                      Uploaded {format(new Date(r.jdUploadedAt), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Download className="mr-2 h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Status history ────────────────────────────────────────────────── */}
      {r.statusHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {r.statusHistory.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                    {i < r.statusHistory.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[10px] ${STATUS_COLOR[h.fromStatus]}`}
                        variant="outline"
                      >
                        {STATUS_LABEL[h.fromStatus]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">→</span>
                      <Badge
                        className={`text-[10px] ${STATUS_COLOR[h.toStatus]}`}
                        variant="outline"
                      >
                        {STATUS_LABEL[h.toStatus]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fullName(h.changedBy)} ·{' '}
                      {format(new Date(h.changedAt), 'dd MMM yyyy, HH:mm')}
                    </p>
                    {h.reason && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">"{h.reason}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
