'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// import useAxios from '@/hooks/useAxios';
import { RequirementForm } from '../_components/RequirementForm';
import type { CreateRequirementInput } from '@/lib/validators/requirement.validator';
import { useAxios } from '@/hooks/useAxios';

export default function NewRequirementPage() {
  const axios = useAxios();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (data: CreateRequirementInput) => {
      // convert date strings to ISO
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        respondBy: data.respondBy ? new Date(data.respondBy).toISOString() : null,
        clientContactId: data.clientContactId || null,
        businessUnitId: data.businessUnitId || null,
      };
      return (await axios.post('/requirements', payload)).data;
    },
    onSuccess: res => {
      toast.success('Requirement created');
      router.push(`/requirements/${res.data.id}`);
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to create requirement'
      );
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Requirements
        </button>
        <h1 className="text-xl font-semibold mt-2">New requirement</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Created as DRAFT — submit for approval once ready.
        </p>
      </div>

      <RequirementForm
        mode="create"
        onSubmit={data => mutation.mutate(data as CreateRequirementInput)}
        isPending={mutation.isPending}
        onCancel={() => router.back()}
      />
    </div>
  );
}
