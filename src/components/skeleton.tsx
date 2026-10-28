// Kerangka abu-abu berdenyut yang tampil selagi data halaman dimuat.
export function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function PageHeaderSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        <Bar className="size-11" />
        <div className="space-y-1.5">
          <Bar className="h-4 w-32" />
          <Bar className="h-3 w-48" />
        </div>
        <Bar className="size-11" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 8, rowClassName = "h-6" }: { rows?: number; rowClassName?: string }) {
  return (
    <div
      className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white"
      role="status"
      aria-label="Memuat data"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
          <Bar className="size-5 shrink-0" />
          <Bar className={`${rowClassName} flex-1`} />
          <Bar className="hidden h-4 w-20 md:block" />
        </div>
      ))}
    </div>
  );
}
