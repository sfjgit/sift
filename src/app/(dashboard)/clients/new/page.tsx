'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAxios } from '@/hooks/useAxios';
import { ClientForm } from '../_components/ClientForm';
import type { CreateClientInput } from '../_components/validators';

export default function NewClientPage() {
  const axios = useAxios();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (data: CreateClientInput) =>
      (
        await axios.post('/clients', {
          ...data,
          website: data.website || null,
          businessUnitId: data.businessUnitId || null,
          parentClientId: data.parentClientId || null,
        })
      ).data,
    onSuccess: res => {
      toast.success('Client created');
      router.push(`/clients/${res.data.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create client'),
  });

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Clients
        </button>
        <h1 className="text-xl font-semibold mt-2">New client</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Client starts as Pending until approved.
        </p>
      </div>
      <ClientForm
        mode="create"
        onSubmit={data => mutation.mutate(data as CreateClientInput)}
        isPending={mutation.isPending}
        onCancel={() => router.back()}
      />
    </div>
  );
}
