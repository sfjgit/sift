'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { RequirementForm, detailToFormValues } from '../../_components/RequirementForm';
import type { RequirementDetailResponse } from '@/types/requirements.types';
import type { UpdateRequirementInput } from '@/lib/validators/requirement.validator';

export default function EditRequirementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<RequirementDetailResponse>({
    queryKey: ['requirement', id],
    queryFn: async () => (await axios.get(`/requirements/${id}`)).data,
    enabled: !!id,
  });

  const req = data?.data;

  const mutation = useMutation({
    mutationFn: async (input: UpdateRequirementInput) => {
      const payload = {
        ...input,
        startDate: input.startDate ? new Date(input.startDate).toISOString() : null,
        endDate: input.endDate ? new Date(input.endDate).toISOString() : null,
        respondBy: input.respondBy ? new Date(input.respondBy).toISOString() : null,
        clientContactId: input.clientContactId || null,
        businessUnitId: input.businessUnitId || null,
      };
      return (await axios.put(`/requirements/${id}`, payload)).data;
    },
    onSuccess: () => {
      toast.success('Requirement updated');
      queryClient.invalidateQueries({ queryKey: ['requirement', id] });
      router.push(`/requirements/${id}`);
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update requirement'
      );
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="flex flex-col gap-3 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!req) {
    return <div className="p-6 text-sm text-muted-foreground">Requirement not found.</div>;
  }

  // Only DRAFT and PENDING_APPROVAL can be edited
  if (!['DRAFT', 'PENDING_APPROVAL'].includes(req.status)) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          ← Back
        </button>
        <p className="text-sm text-muted-foreground">
          Only DRAFT or PENDING_APPROVAL requirements can be edited.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {req.reqCode}
        </button>
        <h1 className="text-xl font-semibold mt-2">Edit requirement</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {req.reqCode} · {req.status}
        </p>
      </div>

      <RequirementForm
        mode="edit"
        defaultValues={detailToFormValues(req)}
        onSubmit={data => mutation.mutate(data as UpdateRequirementInput)}
        isPending={mutation.isPending}
        onCancel={() => router.back()}
      />
    </div>
  );
}
