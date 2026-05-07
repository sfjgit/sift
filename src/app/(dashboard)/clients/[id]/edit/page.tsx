/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { ClientForm, detailToFormValues } from '../../_components/ClientForm';
import type { ClientDetailResponse } from '../../_components/types';
import type { UpdateClientInput } from '../../_components/validators';

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ClientDetailResponse>({
    queryKey: ['client', id],
    queryFn: async () => (await axios.get(`/clients/${id}`)).data,
    enabled: !!id,
  });

  const client = data?.data;

  const mutation = useMutation({
    mutationFn: async (input: UpdateClientInput) =>
      (
        await axios.put(`/clients/${id}`, {
          ...input,
          website: input.website || null,
          businessUnitId: input.businessUnitId || null,
          parentClientId: input.parentClientId || null,
          categoryId: input.categoryId || null,
        })
      ).data,
    onSuccess: () => {
      toast.success('Client updated');
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      router.push(`/clients/${id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update client'),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
        <Skeleton className="h-7 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">Client not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {client.name}
        </button>
        <h1 className="text-xl font-semibold mt-2">Edit client</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{client.name}</p>
      </div>
      <ClientForm
        mode="edit"
        defaultValues={detailToFormValues(client)}
        onSubmit={data => mutation.mutate(data as UpdateClientInput)}
        isPending={mutation.isPending}
        onCancel={() => router.back()}
      />
    </div>
  );
}
