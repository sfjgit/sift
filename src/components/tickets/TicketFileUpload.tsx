// File: TicketFileUpload.tsx
// Path: src/components/tickets/TicketFileUpload.tsx

'use client';

import { useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  accept?: string;
  disabled?: boolean;
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function TicketFileUpload({
  files,
  onChange,
  maxFiles = 10,
  maxSizeMb = 10,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt',
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleSelect = (selected: FileList | null) => {
    if (!selected || disabled) return;

    const incoming: File[] = [];
    let oversized = 0;
    let duplicates = 0;

    Array.from(selected).forEach(f => {
      if (f.size > maxSizeMb * 1024 * 1024) {
        oversized += 1;
        return;
      }
      const isDupe =
        files.some(e => e.name === f.name && e.size === f.size) ||
        incoming.some(e => e.name === f.name && e.size === f.size);
      if (isDupe) {
        duplicates += 1;
        return;
      }
      incoming.push(f);
    });

    if (oversized) toast.error(`${oversized} file(s) exceed ${maxSizeMb}MB`);
    if (duplicates) toast.error(`${duplicates} file(s) already added`);

    const merged = [...files, ...incoming];
    if (merged.length > maxFiles) {
      toast.error(`Only ${maxFiles} files allowed`);
    }

    onChange(merged.slice(0, maxFiles));
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          handleSelect(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-sm transition-colors ${
          disabled
            ? 'cursor-not-allowed border-gray-200 text-gray-300'
            : 'cursor-pointer text-gray-500 hover:border-gray-400'
        } ${dragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300'}`}
      >
        <Paperclip className="h-4 w-4" />
        <span>Drop files here or click to browse</span>
        <span className="text-xs text-gray-400">
          up to {maxFiles} files, {maxSizeMb}MB each
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={e => handleSelect(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="truncate">{f.name}</span>
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs text-gray-400">{formatSize(f.size)}</span>
                <button
                  type="button"
                  title="Remove"
                  disabled={disabled}
                  onClick={() => removeAt(i)}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
