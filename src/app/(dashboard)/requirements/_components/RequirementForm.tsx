/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAxios } from '@/hooks/useAxios';
import { useBUScope } from '@/hooks/useBUScope';
import {
  createRequirementSchema,
  updateRequirementSchema,
  type CreateRequirementInput,
  type UpdateRequirementInput,
} from '@/lib/validators/requirement.validator';
import type { RequirementDetail } from '@/types/requirements.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'create' | 'edit';

interface RequirementFormProps {
  mode: Mode;
  defaultValues?: Partial<CreateRequirementInput>;
  onSubmit: (data: CreateRequirementInput | UpdateRequirementInput) => void;
  isPending: boolean;
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDateInput(val?: string | null): string {
  if (!val) return '';
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form
// ─────────────────────────────────────────────────────────────────────────────

export function RequirementForm({
  mode,
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: RequirementFormProps) {
  const axios = useAxios();
  const buScope = useBUScope('requirements');

  const schema = mode === 'create' ? createRequirementSchema : updateRequirementSchema;

  const form = useForm<CreateRequirementInput>({
    // @ts-expect-error err
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      clientId: '',
      clientContactId: '',
      // auto-apply user's BU if they can't pick
      businessUnitId: buScope.autoApply ? (buScope.businessUnitId ?? '') : '',
      jobType: undefined,
      remoteType: undefined,
      priority: 'MEDIUM',
      totalOpenings: 1,
      location: '',
      country: '',
      salaryMin: undefined,
      salaryMax: undefined,
      salaryType: undefined,
      experienceMin: undefined,
      experienceMax: undefined,
      startDate: '',
      endDate: '',
      respondBy: '',
      turnaroundDays: undefined,
      skillIds: [],
      ...defaultValues,
    },
  });

  const {
    fields: skillFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray({
    control: form.control,
    name: 'skillIds',
  });

  // Reset when defaultValues change (edit mode)
  useEffect(() => {
    if (defaultValues) form.reset({ ...form.getValues(), ...defaultValues });
  }, [JSON.stringify(defaultValues)]);

  // ── Dropdown data ──────────────────────────────────────────────────────────

  const clientId = form.watch('clientId');

  const { data: clientsRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['clients-dropdown'],
    queryFn: async () => (await axios.get('/clients?limit=200&status=ACTIVE')).data,
    staleTime: 60_000,
  });

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
  });

  const { data: contactsRes } = useQuery<{
    data: { id: string; firstName: string; lastName: string; designation?: string | null }[];
  }>({
    queryKey: ['client-contacts', clientId],
    queryFn: async () => (await axios.get(`/clients/${clientId}/contacts?status=ACTIVE`)).data,
    enabled: !!clientId,
    staleTime: 30_000,
  });

  const { data: skillsRes } = useQuery<{ data: { id: string; canonicalName: string }[] }>({
    queryKey: ['skills-dropdown'],
    queryFn: async () => (await axios.get('/skills?limit=500')).data,
    staleTime: 120_000,
  });

  const clients = clientsRes?.data ?? [];
  const businessUnits = busRes?.data ?? [];
  const contacts = contactsRes?.data ?? [];
  const skills = skillsRes?.data ?? [];

  // reset contact when client changes
  useEffect(() => {
    form.setValue('clientContactId', '');
  }, [clientId]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* ── Basic info ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Basic info</SectionLabel>

          <FormField
            // @ts-expect-error err
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Title <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Senior React Developer" {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            // @ts-expect-error err
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Role overview, responsibilities, context…"
                    rows={4}
                    className="resize-none"
                    {...field}
                    value={(field.value as any) ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* ── Client ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Client</SectionLabel>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mode === 'create' && (
              <FormField
                // @ts-expect-error err
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Client <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value as string}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="clientContactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client contact</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={(field.value as string) ?? ''}
                    disabled={!clientId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={clientId ? 'Select contact' : 'Select client first'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        // @ts-expect-error err
                        value={undefined}
                      >
                        None
                      </SelectItem>
                      {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                          {c.designation ? ` · ${c.designation}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {buScope.autoApply ? (
              // BU is auto-applied from user profile — show as read-only info
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Business unit</span>
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
                  {buScope.businessUnitName ?? 'Your BU (auto-applied)'}
                </div>
              </div>
            ) : (
              <FormField
                // @ts-expect-error err
                control={form.control}
                name="businessUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business unit</FormLabel>
                    <Select onValueChange={field.onChange} value={(field.value as string) ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select BU" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem
                          // @ts-expect-error err
                          value={undefined}
                        >
                          None
                        </SelectItem>
                        {businessUnits.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        <Separator />

        {/* ── Job details ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Job details</SectionLabel>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="jobType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Job type <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value as string}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="PERMANENT">Permanent</SelectItem>
                      <SelectItem value="CONTRACT_TO_HIRE">Contract to hire</SelectItem>
                      <SelectItem value="FREELANCE">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="remoteType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Remote type <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value as string}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ONSITE">Onsite</SelectItem>
                      <SelectItem value="REMOTE">Remote</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value as string}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Medium" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="totalOpenings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total openings</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={(field.value as number) ?? ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Bengaluru"
                      {...field}
                      value={(field.value as any) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. India" {...field} value={(field.value as any) ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* ── Experience & salary ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Experience & salary</SectionLabel>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="experienceMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exp. min (yrs)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="0"
                      value={(field.value as any) ?? ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="experienceMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exp. max (yrs)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="10"
                      value={(field.value as any) ?? ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="salaryMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary min</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={(field.value as any) ?? ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="salaryMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary max</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={(field.value as any) ?? ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="salaryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary type</FormLabel>
                  <Select onValueChange={field.onChange} value={(field.value as any) ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        // @ts-expect-error err
                        value={undefined}
                      >
                        None
                      </SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                      <SelectItem value="HOURLY">Hourly</SelectItem>
                      <SelectItem value="DAILY">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* ── Dates ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Dates</SectionLabel>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={(field.value as any) ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={(field.value as any) ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="respondBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Respond by</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={(field.value as any) ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              // @ts-expect-error err
              control={form.control}
              name="turnaroundDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turnaround (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="—"
                      value={(field.value as any) ?? ''}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* ── Skills ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Skills</SectionLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendSkill({ skillId: '', isMandatory: true, experience: undefined })}
            >
              + Add skill
            </Button>
          </div>

          {skillFields.length === 0 && (
            <p className="text-sm text-muted-foreground">No skills added yet.</p>
          )}

          <div className="flex flex-col gap-3">
            {skillFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-end gap-3 rounded-md border bg-muted/30 p-3"
              >
                {/* Skill select */}
                <FormField
                  // @ts-expect-error err
                  control={form.control}
                  name={`skillIds.${index}.skillId`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Skill</FormLabel>
                      <Select onValueChange={f.onChange} value={f.value as string}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select skill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {skills.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.canonicalName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Experience */}
                <FormField
                  // @ts-expect-error err
                  control={form.control}
                  name={`skillIds.${index}.experience`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Exp (yrs)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className="h-9"
                          placeholder="—"
                          value={(f.value as any) ?? ''}
                          onChange={e =>
                            f.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Mandatory toggle */}
                <FormField
                  // @ts-expect-error err
                  control={form.control}
                  name={`skillIds.${index}.isMandatory`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Mandatory</FormLabel>
                      <div className="h-9 flex items-center">
                        <button
                          type="button"
                          onClick={() => f.onChange(!f.value)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            f.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border'
                          }`}
                        >
                          {f.value ? 'Yes' : 'No'}
                        </button>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSkill(index)}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create requirement'
                : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper to convert a RequirementDetail into form default values
// ─────────────────────────────────────────────────────────────────────────────

export function detailToFormValues(req: RequirementDetail): Partial<CreateRequirementInput> {
  return {
    title: req.title,
    description: req.description ?? '',
    clientId: req.client.id,
    clientContactId: req.clientContact?.id ?? '',
    businessUnitId: req.businessUnit?.id ?? '',
    jobType: req.jobType,
    remoteType: req.remoteType,
    priority: req.priority,
    totalOpenings: req.totalOpenings,
    location: req.location ?? '',
    country: req.country ?? '',
    salaryMin: req.salaryMin ?? undefined,
    salaryMax: req.salaryMax ?? undefined,
    salaryType: req.salaryType ?? undefined,
    experienceMin: req.experienceMin ?? undefined,
    experienceMax: req.experienceMax ?? undefined,
    startDate: toDateInput(req.startDate),
    endDate: toDateInput(req.endDate),
    respondBy: toDateInput(req.respondBy),
    turnaroundDays: req.turnaroundDays ?? undefined,
    skillIds: req.skills.map((s: any) => ({
      skillId: s.skill.id,
      isMandatory: s.isMandatory,
      experience: s.experience ?? undefined,
    })),
  };
}

// function toDateInput(val?: string | null): string {
//   if (!val) return '';
//   try {
//     return new Date(val).toISOString().slice(0, 10);
//   } catch {
//     return '';
//   }
// }
