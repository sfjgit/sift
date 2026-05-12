/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServiceLines, usePushCandidate } from './usePipeline';
import { toast } from 'sonner';
// import useAxios from '@/hooks/useAxios';
import { useQuery } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';

const schema = z.object({
  requirementId: z.string().min(1, 'Requirement is required'),
  candidateServiceId: z.string().min(1, 'Candidate ID is required'),
  recruiterId: z.string().min(1, 'Recruiter is required'),
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  totalExpYears: z.coerce.number().optional(),
  serviceLineId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddToPipelineDialog({ open, onClose }: Props) {
  const axios = useAxios();
  const { data: serviceLines = [] } = useServiceLines();
  const pushCandidate = usePushCandidate();

  const [selectedServiceLineId, setSelectedServiceLineId] = useState<string>('');

  // fetch requirements filtered by service line
  const { data: requirementsData } = useQuery({
    queryKey: ['requirements-active', selectedServiceLineId],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'ACTIVE', limit: '100' });
      if (selectedServiceLineId) params.set('serviceLineId', selectedServiceLineId);
      const res = await axios.get(`/requirements?${params.toString()}`);
      return res.data.data as {
        id: string;
        reqCode: string;
        title: string;
        client: { name: string };
      }[];
    },
    enabled: true,
  });

  // fetch recruiters (users with recruiter role — adjust endpoint as needed)
  const { data: recruiters = [] } = useQuery({
    queryKey: ['recruiters'],
    queryFn: async () => {
      const res = await axios.get('/users?isActive=true&limit=200');
      return res.data.data as { id: string; firstName: string; lastName: string }[];
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
    // @ts-expect-error errr
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const selectedReqId = watch('requirementId');

  const onSubmit = async (data: FormData) => {
    try {
      await pushCandidate.mutateAsync({
        requirementId: data.requirementId,
        candidateServiceId: data.candidateServiceId,
        recruiterId: data.recruiterId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        currentTitle: data.currentTitle,
        currentCompany: data.currentCompany,
        totalExpYears: data.totalExpYears,
        topSkills: [],
        rawSnapshot: {},
      });
      toast.success('Candidate added to pipeline');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add candidate');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Candidate to Pipeline</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={
            // @ts-expect-error errr
            handleSubmit(onSubmit)
          }
          className="space-y-4 pt-2"
        >
          {/* Service line filter — not submitted, just filters requirements */}
          <div className="space-y-1.5">
            <Label>Filter by Service Line</Label>
            <Select
              value={selectedServiceLineId}
              onValueChange={v => {
                setSelectedServiceLineId(v);
                setValue('requirementId', ''); // reset requirement on SL change
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All service lines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All service lines</SelectItem>
                {serviceLines.map(sl => (
                  <SelectItem key={sl.id} value={sl.id}>
                    {sl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Requirement */}
          <div className="space-y-1.5">
            <Label>
              Requirement <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedReqId} onValueChange={v => setValue('requirementId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select requirement" />
              </SelectTrigger>
              <SelectContent>
                {(requirementsData ?? []).map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.reqCode} — {r.title} ({r.client.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.requirementId && (
              <p className="text-xs text-destructive">{errors.requirementId.message}</p>
            )}
          </div>

          {/* Candidate Service ID */}
          <div className="space-y-1.5">
            <Label>
              Candidate ID (from Candidate Service) <span className="text-destructive">*</span>
            </Label>
            <Input placeholder="UUID from candidate service" {...register('candidateServiceId')} />
            {errors.candidateServiceId && (
              <p className="text-xs text-destructive">{errors.candidateServiceId.message}</p>
            )}
          </div>

          {/* Recruiter */}
          <div className="space-y-1.5">
            <Label>
              Recruiter <span className="text-destructive">*</span>
            </Label>
            <Select onValueChange={v => setValue('recruiterId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Assign recruiter" />
              </SelectTrigger>
              <SelectContent>
                {recruiters.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.recruiterId && (
              <p className="text-xs text-destructive">{errors.recruiterId.message}</p>
            )}
          </div>

          {/* Candidate basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input placeholder="John Doe" {...register('fullName')} />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input placeholder="john@email.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+91 98765 43210" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Exp (years)</Label>
              <Input type="number" step="0.1" placeholder="4.5" {...register('totalExpYears')} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Title</Label>
              <Input placeholder="Senior Engineer" {...register('currentTitle')} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Company</Label>
              <Input placeholder="Acme Corp" {...register('currentCompany')} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || pushCandidate.isPending}>
              {pushCandidate.isPending ? 'Adding...' : 'Add to Pipeline'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
