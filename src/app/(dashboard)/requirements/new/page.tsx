// File: page.tsx
// Path: src/app/(dashboard)/requirements/new/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import { RequirementForm, RequirementFormValues } from '../_components/RequirementForm';
// import { RequirementForm, RequirementFormValues } from '@/components/requirements/RequirementForm';

export default function NewRequirementPage() {
  const axios = useAxios();
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: async (data: RequirementFormValues) =>
      (await axios.post('/requirements', data)).data,
    onSuccess: res => {
      toast.success('Requirement created successfully');
      router.push(`/requirements/${res.data?.id ?? ''}`);
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 leading-none">New Requirement</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fill in the details to create a new job requirement
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            Draft until submitted
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <RequirementForm
          mode="create"
          isPending={createMutation.isPending}
          onSubmit={async data => {
            await createMutation.mutateAsync(data);
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
