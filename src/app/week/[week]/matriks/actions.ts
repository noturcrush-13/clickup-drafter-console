"use server";

import { z } from "zod";
import { extractGoogleId } from "@/lib/google-id";
import { getSupabase } from "@/lib/supabase";

const rowSchema = z.object({
  activityId: z.uuid(),
  styleMode: z.enum(["saya", "ikuti"]),
  fathom: z.object({ enabled: z.boolean(), keywords: z.string().max(1000) }),
  mom: z.object({ enabled: z.boolean(), ref: z.string().max(500) }),
  slide: z.object({ enabled: z.boolean(), ref: z.string().max(500) }),
  tracker: z.object({ enabled: z.boolean(), tab: z.string().max(200) }),
  clickupPrev: z.object({ enabled: z.boolean() }),
});

export type MatrixRowInput = z.infer<typeof rowSchema>;
export type SaveRowResult = { ok: boolean; message: string; momId?: string | null; slideId?: string | null };

export async function saveMatrixRowAction(input: MatrixRowInput): Promise<SaveRowResult> {
  const parsed = rowSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Data tidak valid." };
  const row = parsed.data;

  const momId = extractGoogleId(row.mom.ref, "document");
  const slideId = extractGoogleId(row.slide.ref, "presentation");
  if (row.mom.ref.trim() && !momId) return { ok: false, message: "URL/ID Google Docs untuk MoM tidak dikenali." };
  if (row.slide.ref.trim() && !slideId) return { ok: false, message: "URL/ID Google Slides tidak dikenali." };
  if (row.mom.enabled && !momId) return { ok: false, message: "MoM aktif, tetapi URL/ID Google Docs kosong." };
  if (row.slide.enabled && !slideId) return { ok: false, message: "Slide aktif, tetapi URL/ID Google Slides kosong." };
  if (row.tracker.enabled && !row.tracker.tab.trim()) return { ok: false, message: "Tracker aktif, tetapi nama tab kosong." };

  const keywords = row.fathom.keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const db = getSupabase();
  const now = new Date().toISOString();

  const { error: activityError } = await db
    .from("activities")
    .update({ style_mode: row.styleMode, updated_at: now })
    .eq("id", row.activityId);
  if (activityError) return { ok: false, message: `Gagal menyimpan gaya: ${activityError.message}` };

  // Params tetap disimpan walau sumber dimatikan, supaya nilainya tidak hilang saat diaktifkan lagi.
  const sources = [
    { source_type: "fathom", enabled: row.fathom.enabled, params: { keywords } },
    { source_type: "mom", enabled: row.mom.enabled, params: momId ? { doc_id: momId } : {} },
    { source_type: "slide", enabled: row.slide.enabled, params: slideId ? { slide_id: slideId } : {} },
    { source_type: "tracker", enabled: row.tracker.enabled, params: row.tracker.tab.trim() ? { tab: row.tracker.tab.trim() } : {} },
    { source_type: "clickup_prev", enabled: row.clickupPrev.enabled, params: {} },
  ].map((source) => ({ ...source, activity_id: row.activityId, updated_at: now }));

  const { error: sourceError } = await db
    .from("activity_sources")
    .upsert(sources, { onConflict: "activity_id,source_type" });
  if (sourceError) return { ok: false, message: `Gagal menyimpan sumber: ${sourceError.message}` };

  return { ok: true, message: "Tersimpan.", momId, slideId };
}
