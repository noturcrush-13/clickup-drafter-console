import { Bar, ListSkeleton, PageHeaderSkeleton } from "@/components/skeleton";

// Tampil seketika saat berpindah week/halaman, sampai data dari server siap.
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeaderSkeleton title="Week & activity" />
        <Bar className="h-11 w-44" />
      </div>
      <Bar className="h-11 w-72" />
      <ListSkeleton rows={10} />
    </div>
  );
}
