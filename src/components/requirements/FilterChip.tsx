// components/requirements/FilterChip.tsx
'use client';

export function FilterChip({ label, onRemove }: { label?: string; onRemove: () => void }) {
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs text-foreground">
      {label}
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground ml-0.5">
        <svg width="10" height="10" viewBox="0 0 15 15" fill="none">
          <path
            d="M11.782 4.032a.575.575 0 1 0-.813-.813L7.5 6.687 4.032 3.22a.575.575 0 0 0-.813.813L6.687 7.5l-3.468 3.468a.575.575 0 0 0 .813.813L7.5 8.313l3.469 3.468a.575.575 0 0 0 .813-.813L8.313 7.5l3.469-3.468Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </span>
  );
}
