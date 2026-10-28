import { Bar, ListSkeleton, PageHeaderSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeaderSkeleton title="Matriks sumber" />
      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <Bar className="h-5 w-32" />
        <div className="flex justify-between gap-4">
          <Bar className="h-11 w-56" />
          <Bar className="h-11 w-40" />
        </div>
        <Bar className="h-16 w-full" />
      </div>
      <ListSkeleton rows={6} rowClassName="h-11" />
    </div>
  );
}
