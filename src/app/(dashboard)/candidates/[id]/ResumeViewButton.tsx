/* eslint-disable @typescript-eslint/no-explicit-any */
// File: ResumeViewButton.tsx
// Path: src/app/(dashboard)/candidates/[id]/ResumeViewButton.tsx

'use client';

import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAxios } from '@/hooks/useAxios';

interface Props {
  resumeId: string;
  fileName: string;
}

export function ResumeViewButton({ resumeId, fileName }: Props) {
  const axios = useAxios();
  const [loading, setLoading] = useState(false);

  const handleView = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await axios.get(`/candidate/api/resume/${resumeId}/view`, {
        baseURL: '/api/proxy',
      });

      const url = res.data?.data?.presignedUrl;

      if (!url) {
        toast.error('Could not get resume URL');
        return;
      }

      // Open presigned URL in new tab — browser renders PDF natively
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to open resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleView}
      disabled={loading}
      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      title={`View ${fileName}`}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <ExternalLink className="w-3 h-3" />
      )}
      View
    </button>
  );
}
