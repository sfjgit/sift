// app/requirements/[id]/edit/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import {
  RequirementForm,
  detailToFormValues,
  type RequirementFormValues,
} from '../../_components/RequirementForm';

export default function EditRequirementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();

  const { data: reqRes, isLoading } = useQuery({
    queryKey: ['requirement', id],
    queryFn: async () => (await axios.get(`/requirements/${id}`)).data,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RequirementFormValues) =>
      (await axios.put(`/requirements/${id}`, data)).data,
    onSuccess: () => {
      toast.success('Requirement updated');
      qc.invalidateQueries({ queryKey: ['requirement', id] });
      router.push(`/requirements/${id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const req = reqRes?.data;
  if (!req) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Edit requirement</h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-mono">{req.reqCode}</p>
      </div>

      <RequirementForm
        mode="edit"
        defaultValues={detailToFormValues(req)}
        isPending={updateMutation.isPending}
        onSubmit={async data => {
          await updateMutation.mutateAsync(data);
        }}
        onCancel={() => router.back()}
      />
    </div>
  );
}
