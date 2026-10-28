"use server";

import { z } from "zod";
import { findWeekId, getLatestJob } from "@/lib/jobs";
import { getSupabase } from "@/lib/supabase";
import type { JobRow } from "@/lib/types";
import { parseWeekParam } from "@/lib/week";

export async function setAutoRunAction(autoRun: boolean): Promise<{ ok: boolean }> {
  const parsed = z.boolean().safeParse(autoRun);
  if (!parsed.success) return { ok: false };

  const { error } = await getSupabase()
    .from("settings")
    .update({ auto_run: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1);
  return { ok: !error };
}

export type RunNowResult = { ok: boolean; message: string; job?: JobRow | null };

// Membuat baris jobs berstatus 'antri'. n8n di laptop akan mengambilnya pada polling berikutnya.
export async function runNowAction(week: string): Promise<RunNowResult> {
  const parsed = z.string().safeParse(week);
  const isoWeek = parsed.success ? parseWeekParam(parsed.data) : null;
  if (!isoWeek) return { ok: false, message: "Week tidak valid." };

  try {
    const db = getSupabase();
    const weekId = await findWeekId(isoWeek);
    if (!weekId) return { ok: false, message: "Week ini belum disinkron dari ClickUp." };

    const { count: selectedCount, error: countError } = await db
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("week_id", weekId)
      .eq("selected", true);
    if (countError) throw new Error(countError.message);
    if (!selectedCount) return { ok: false, message: "Belum ada activity terpilih untuk week ini." };

    const { data: running, error: runningError } = await db
      .from("jobs")
      .select("id, status")
      .eq("week_id", weekId)
      .in("status", ["antri", "jalan"])
      .limit(1);
    if (runningError) throw new Error(runningError.message);
    if (running.length > 0) {
      const status = running[0].status === "antri" ? "masih antri" : "sedang berjalan";
      return { ok: false, message: `Ditolak: sudah ada job yang ${status} untuk week ini.` };
    }

    const { error: insertError } = await db.from("jobs").insert({
      week_id: weekId,
      job_type: "susun_draf",
      status: "antri",
      trigger_source: "manual",
    });
    if (insertError) throw new Error(insertError.message);

    return { ok: true, message: "Job dibuat. n8n akan mengambilnya dalam ±1 menit.", job: await getLatestJob(weekId) };
  } catch (error) {
    return { ok: false, message: `Gagal membuat job: ${error instanceof Error ? error.message : "kesalahan tak dikenal"}` };
  }
}
