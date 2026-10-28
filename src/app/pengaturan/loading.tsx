import { Bar } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" role="status" aria-label="Memuat pengaturan">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Pengaturan</h1>
        <Bar className="h-4 w-48" />
        <Bar className="h-4 w-64" />
      </div>
      <div className="space-y-5 rounded-md border border-slate-200 bg-white p-4 md:p-6">
        <Bar className="h-4 w-56" />
        <Bar className="h-48 w-full" />
        <Bar className="h-4 w-40" />
        <Bar className="h-11 w-full" />
        <div className="grid gap-5 md:grid-cols-2">
          <Bar className="h-11 w-full" />
          <Bar className="h-11 w-full" />
        </div>
        <Bar className="h-11 w-44" />
      </div>
    </div>
  );
}
