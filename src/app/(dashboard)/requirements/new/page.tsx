// app/requirements/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAxios } from '@/hooks/useAxios';
import { RequirementForm, RequirementFormValues } from '../_components/RequirementForm';

export default function NewRequirementPage() {
  const axios = useAxios();
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: async (data: RequirementFormValues) =>
      (await axios.post('/requirements', data)).data,
    onSuccess: () => {
      toast.success('Requirement created');
      router.push('/requirements');
    },
    // no onError here — form catches and handles it
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">New requirement</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Fill in the details below</p>
      </div>

      <RequirementForm
        mode="create"
        isPending={createMutation.isPending}
        onSubmit={async data => {
          await createMutation.mutateAsync(data); // mutateAsync throws — form catches it
        }}
        onCancel={() => router.back()}
      />
    </div>
  );
}
