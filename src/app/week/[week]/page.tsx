import { notFound } from "next/navigation";
import { WeekPicker } from "@/components/week-picker";
import { getSupabase } from "@/lib/supabase";
import type { ActivityRow, WeekRow } from "@/lib/types";
import { formatWeekParam, parseWeekParam } from "@/lib/week";
import { ActivityTable } from "./activity-table";
import { SyncButton } from "./sync-button";

export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
  const isoWeek = parseWeekParam((await params).week);
  if (!isoWeek) notFound();

  // Satu query: week beserta activity-nya (embed lewat foreign key activities.week_id).
  const { data: week, error } = await getSupabase()
    .from("weeks")
    .select("*, activities(*)")
    .eq("iso_year", isoWeek.year)
    .eq("iso_week", isoWeek.week)
    .order("sort_order", { referencedTable: "activities" })
    .maybeSingle<WeekRow & { activities: ActivityRow[] }>();
  if (error) throw new Error(`Gagal membaca week: ${error.message}`);
  const activities = week?.activities ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900">Week &amp; activity</h1>
          <WeekPicker isoWeek={isoWeek} />
          {week?.clickup_list_name && (
            <p className="text-sm text-slate-500">List ClickUp: {week.clickup_list_name}</p>
          )}
        </div>
        <SyncButton week={formatWeekParam(isoWeek)} />
      </header>

      {activities.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Belum ada activity untuk week ini. Tekan <strong>Sinkron dari ClickUp</strong> untuk mengambil task.
        </p>
      ) : (
        // key: reset state lokal tabel setiap kali data dari server berubah (mis. setelah sinkron)
        <ActivityTable key={activities.map((a) => `${a.id}:${a.selected}`).join(",")} activities={activities} />
      )}
    </div>
  );
}
