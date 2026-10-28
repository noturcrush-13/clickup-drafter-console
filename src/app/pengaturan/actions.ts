"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";

export type SaveSettingsResult = { ok: boolean; message: string };

// String kosong disimpan sebagai null; selain itu harus lolos schema.
const optional = (schema: z.ZodType<string, string>) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(schema.nullable());

const settingsSchema = z.object({
  style_rules: z
    .string()
    .max(20000)
    .transform((value) =>
      value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  output_format: z.string().max(20000),
  secret_keywords: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => {
      try {
        new RegExp(value, "i");
        return true;
      } catch {
        return false;
      }
    }, "Kata kunci rahasia bukan regex yang valid."),
  notify_email: optional(z.email("Email notifikasi tidak valid.")),
  web_base_url: optional(z.url("URL web tidak valid.")),
});

export async function saveSettingsAction(
  _prev: SaveSettingsResult | null,
  formData: FormData,
): Promise<SaveSettingsResult> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((issue) => issue.message).join(" ") };
  }

  const { error } = await getSupabase()
    .from("settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };

  revalidatePath("/pengaturan");
  return { ok: true, message: "Pengaturan tersimpan." };
}
