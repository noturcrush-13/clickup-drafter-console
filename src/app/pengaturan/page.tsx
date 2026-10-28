import { connection } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { SettingsRow } from "@/lib/types";
import { SettingsForm } from "./settings-form";

export default async function PengaturanPage() {
  await connection(); // selalu baca data terbaru saat request, jangan dibekukan saat build

  const { data: settings, error } = await getSupabase()
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle<SettingsRow>();
  if (error) throw new Error(`Gagal membaca pengaturan: ${error.message}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Pengaturan</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-slate-500">
          <dt>PIC Lead</dt>
          <dd className="font-semibold text-slate-700">{settings?.pic_lead_name ?? "—"}</dd>
          <dt>Sumber panduan</dt>
          <dd className="break-all font-semibold text-slate-700">{settings?.guide_source ?? "—"}</dd>
        </dl>
      </header>

      {settings ? (
        <SettingsForm settings={settings} />
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Baris pengaturan (id = 1) belum ada di database.
        </p>
      )}
    </div>
  );
}
