import "server-only";
import { getSupabase } from "./supabase";
import type { JobRow } from "./types";
import type { IsoWeek } from "./week";

export const JOB_COLUMNS = "id, status, trigger_source, requested_at, started_at, finished_at, error";

export async function findWeekId(isoWeek: IsoWeek): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("weeks")
    .select("id")
    .eq("iso_year", isoWeek.year)
    .eq("iso_week", isoWeek.week)
    .maybeSingle();
  if (error) throw new Error(`Gagal membaca week: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}

// Job terakhir untuk sebuah week dalam satu query (dipakai polling tiap 5 detik).
export async function getLatestJobForWeek(isoWeek: IsoWeek): Promise<JobRow | null> {
  const { data, error } = await getSupabase()
    .from("weeks")
    .select(`jobs(${JOB_COLUMNS})`)
    .eq("iso_year", isoWeek.year)
    .eq("iso_week", isoWeek.week)
    .order("requested_at", { referencedTable: "jobs", ascending: false })
    .limit(1, { referencedTable: "jobs" })
    .maybeSingle<{ jobs: JobRow[] }>();
  if (error) throw new Error(`Gagal membaca job: ${error.message}`);
  return data?.jobs[0] ?? null;
}

export async function getLatestJob(weekId: string): Promise<JobRow | null> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select(JOB_COLUMNS)
    .eq("week_id", weekId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle<JobRow>();
  if (error) throw new Error(`Gagal membaca job: ${error.message}`);
  return data;
}
