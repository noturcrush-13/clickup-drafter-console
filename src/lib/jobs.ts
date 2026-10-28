import "server-only";
import { getSupabase } from "./supabase";
import type { JobRow } from "./types";
import type { IsoWeek } from "./week";

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

export async function getLatestJob(weekId: string): Promise<JobRow | null> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("id, status, trigger_source, requested_at, started_at, finished_at, error")
    .eq("week_id", weekId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle<JobRow>();
  if (error) throw new Error(`Gagal membaca job: ${error.message}`);
  return data;
}
