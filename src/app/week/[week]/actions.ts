"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import { syncWeek, type SyncResult } from "@/lib/sync";
import { formatWeekParam, parseWeekParam } from "@/lib/week";

const weekParamSchema = z.string().refine((value) => parseWeekParam(value) !== null, "Week tidak valid");

export async function syncAction(_prev: SyncResult | null, formData: FormData): Promise<SyncResult> {
  const parsed = weekParamSchema.safeParse(formData.get("week"));
  if (!parsed.success) return { ok: false, message: "Week tidak valid." };
  const isoWeek = parseWeekParam(parsed.data)!;

  try {
    const result = await syncWeek(isoWeek);
    revalidatePath(`/week/${formatWeekParam(isoWeek)}`, "layout");
    return result;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Sinkron gagal." };
  }
}

const selectedSchema = z.object({ activityId: z.uuid(), selected: z.boolean() });

export async function setSelectedAction(input: z.infer<typeof selectedSchema>): Promise<{ ok: boolean }> {
  const parsed = selectedSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const { error } = await getSupabase()
    .from("activities")
    .update({ selected: parsed.data.selected, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.activityId);
  return { ok: !error };
}
