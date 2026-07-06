/* eslint-disable react/no-unescaped-entities */
'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Calendar } from 'lucide-react';
// import { Badge } from '@/components/ui/badge';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { Button } from '@/components/ui/button';
import { daysRemaining } from './types';
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

// File: RequirementOverviewTab.tsx
// Path: src/components/requirements/RequirementOverviewTab.tsx

// import type { RequirementDetail } from './types';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest w-36 shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-[13.5px] font-medium text-slate-800 flex-1">{value}</span>
    </div>
  );
}

function SkillBadges({ skills, color }: { skills: string[]; color: string }) {
  if (!skills?.length) return <span className="text-slate-400 text-sm">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map(s => (
        <span
          key={s}
          className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${color}`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

export function RequirementOverviewTab({ requirement: req }: { requirement: RequirementDetail }) {
  return (
    <div className="max-w-3xl space-y-8">
      {/* Description */}
      {req.description && (
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            About the Role
          </h3>
          <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">
            {req.description}
          </p>
        </div>
      )}

      {/* Skills */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
          Skills
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-2">
              Primary Skills (Must-Have)
            </p>
            <SkillBadges
              skills={req.primarySkills}
              color="bg-rose-50 text-rose-700 border-rose-200"
            />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-500 mb-2">Key Skills</p>
            <SkillBadges skills={req.keySkills} color="bg-blue-50 text-blue-700 border-blue-200" />
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Job Details
        </h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <InfoRow label="Job Type" value={req.jobType?.replace(/_/g, ' ')} />
          <InfoRow label="Remote Type" value={req.remoteType} />
          <InfoRow label="Open For" value={req.jobOpenFor} />
          <InfoRow label="Priority" value={req.priority} />
          <InfoRow label="Openings" value={String(req.totalOpenings)} />
          <InfoRow
            label="Location"
            value={[req.city, req.state, req.country].filter(Boolean).join(', ') || null}
          />
          <InfoRow label="Functional Area" value={req.functionalArea} />
          <InfoRow label="Shift" value={req.shift} />
          <InfoRow label="Education" value={req.education} />
          <InfoRow
            label="Experience"
            value={
              req.experienceMin != null || req.experienceMax != null
                ? `${req.experienceMin ?? 0} – ${req.experienceMax ?? '?'} years`
                : null
            }
          />
        </div>
      </div>

      {/* Compensation */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Compensation
        </h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <InfoRow
            label="Salary Range"
            value={
              req.salaryMin != null || req.salaryMax != null
                ? `${req.salaryCurrency ?? 'INR'} ${req.salaryMin ?? '?'} – ${req.salaryMax ?? '?'} ${req.salaryType ?? ''}`
                : null
            }
          />
          <InfoRow
            label="Bonus"
            value={req.bonusAmount ? `${req.salaryCurrency ?? 'INR'} ${req.bonusAmount}` : null}
          />
          <InfoRow
            label="Salary Visibility"
            value={req.hideSalaryFromCandidate ? 'Hidden from candidate' : 'Visible to candidate'}
          />
        </div>
      </div>

      {/* Sourcing */}
      {(req.targetCompanies?.length > 0 || req.noPoachCompanies?.length > 0) && (
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Sourcing Strategy
          </h3>
          <div className="space-y-4">
            {req.targetCompanies?.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-2">Target Companies</p>
                <SkillBadges
                  skills={req.targetCompanies}
                  color="bg-teal-50 text-teal-700 border-teal-200"
                />
              </div>
            )}
            {req.noPoachCompanies?.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-slate-500 mb-2">No-Poach Companies</p>
                <SkillBadges
                  skills={req.noPoachCompanies}
                  color="bg-red-50 text-red-700 border-red-200"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client & SPOC */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Client & SPOC
        </h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <InfoRow label="Client" value={req.client?.name} />
          <InfoRow label="Industry" value={req.client?.industry} />
          <InfoRow label="Business Unit" value={req.businessUnit?.name} />
          <InfoRow label="Service Line" value={req.serviceLine?.name} />
          <InfoRow
            label="SPOC"
            value={
              req.clientSpoc
                ? `${req.clientSpoc.firstName} ${req.clientSpoc.lastName}${req.clientSpoc.designation ? ` · ${req.clientSpoc.designation}` : ''}`
                : null
            }
          />
          <InfoRow label="SPOC Email" value={req.clientSpoc?.email} />
          <InfoRow label="SPOC Phone" value={req.clientSpoc?.phone} />
          <InfoRow
            label="Handler"
            value={
              req.clientSpoc?.handler
                ? `${req.clientSpoc.handler.firstName} ${req.clientSpoc.handler.lastName}`
                : null
            }
          />
        </div>
      </div>

      {/* JD Parse info */}
      {/* {req.jdParseStatus === 'PARSED' && (
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            JD Parse Info
          </h3>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <InfoRow
              label="Parse Status"
              value={
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Parsed by AI
                </span>
              }
            />
            <InfoRow
              label="Fields Filled"
              value={
                req.jdParsedFields?.length
                  ? `${req.jdParsedFields.length} fields auto-filled`
                  : null
              }
            />
            {req.jdFileName && <InfoRow label="JD File" value={req.jdFileName} />}
          </div>
        </div>
      )} */}

      {/* Audit */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Audit
        </h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <InfoRow
            label="Created By"
            value={`${req.createdBy.firstName} ${req.createdBy.lastName}`}
          />
          <InfoRow label="Created At" value={new Date(req.createdAt).toLocaleString()} />
          {req.approvedBy && (
            <InfoRow
              label="Approved By"
              value={`${req.approvedBy.firstName} ${req.approvedBy.lastName}`}
            />
          )}
          {req.closedBy && (
            <InfoRow
              label="Closed By"
              value={`${req.closedBy.firstName} ${req.closedBy.lastName}`}
            />
          )}
          {req.closureReason && <InfoRow label="Closure Reason" value={req.closureReason} />}
        </div>
      </div>
    </div>
  );
}
