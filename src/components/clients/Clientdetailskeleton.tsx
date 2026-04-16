export default function ClientDetailSkeleton() {
  return (
    <div className="flex h-screen flex-col animate-pulse overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mb-4 h-3 w-20 rounded bg-slate-100" />
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-6 w-52 rounded-lg bg-slate-200" />
            <div className="flex gap-2">
              <div className="h-3.5 w-24 rounded-full bg-slate-100" />
              <div className="h-3.5 w-32 rounded-full bg-slate-100" />
              <div className="h-3.5 w-20 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-6">
        <div className="flex gap-1 py-2">
          {[80, 70, 90, 80, 70].map((w, i) => (
            <div key={i} className="h-8 rounded-md bg-slate-100" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-white border border-slate-100" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-white border border-slate-200" />
        <div className="h-48 rounded-xl bg-white border border-slate-200" />
      </div>
    </div>
  );
}
