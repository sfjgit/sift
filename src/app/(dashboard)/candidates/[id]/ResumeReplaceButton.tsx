/* eslint-disable @typescript-eslint/no-explicit-any */
// File: ResumeReplaceButton.tsx
// Path: src/app/(dashboard)/candidates/[id]/ResumeReplaceButton.tsx

'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAxios } from '@/hooks/useAxios';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  candidateId: string;
}

const ACCEPTED = '.pdf,.doc,.docx,.rtf';
const MAX_MB = 5;

export function ResumeReplaceButton({ candidateId }: Props) {
  const axios = useAxios();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected if needed
    e.target.value = '';

    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large — max ${MAX_MB}MB`);
      return;
    }

    setUploading(true);

    try {
      const form = new FormData();
      //   form.append('resume', file); // multer field name
      form.append('file', file);

      await axios.post(`/candidate/api/resume/${candidateId}/resume/replace`, form, {
        baseURL: '/api/proxy',
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Resume replaced successfully');

      // Refetch candidate so the Resumes section shows the new file
      qc.invalidateQueries({ queryKey: ['candidate', candidateId] });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message;

      if (err?.response?.status === 409) {
        if (code === 'DUPLICATE_RESUME') {
          toast.warning('This resume is already on file — no changes made.');
        } else {
          toast.error(msg ?? 'Version conflict, please retry.');
        }
      } else {
        toast.error(msg ?? 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
        title="Replace resume"
      >
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        Replace
      </button>
    </>
  );
}
