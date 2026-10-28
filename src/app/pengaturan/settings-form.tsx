"use client";

import { startTransition, useActionState } from "react";
import type { SettingsRow } from "@/lib/types";
import { saveSettingsAction } from "./actions";

const fieldClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const labelClass = "block text-sm font-semibold text-slate-800";
const hintClass = "text-xs text-slate-500";

export function SettingsForm({ settings }: { settings: SettingsRow }) {
  const [result, formAction, pending] = useActionState(saveSettingsAction, null);

  // Dipanggil manual (bukan prop action) agar React tidak mengosongkan form saat validasi gagal.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md border border-slate-200 bg-white p-4 md:p-6">
      <div className="space-y-1">
        <label htmlFor="style_rules" className={labelClass}>
          Aturan tambahan untuk agent
        </label>
        <p className={hintClass}>
          Satu aturan per baris, misalnya koreksi yang sering Anda ulang. Aturan utama sudah ada di agent Hermes.
        </p>
        <textarea
          id="style_rules"
          name="style_rules"
          rows={10}
          className={fieldClass}
          placeholder={"Contoh:\nTulis nama sistem dengan huruf besar: IKK, bukan ikk.\nJangan menyebut nama vendor di Hambatan."}
          defaultValue={(settings.style_rules ?? []).join("\n")}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="secret_keywords" className={labelClass}>
          Kata kunci rahasia
        </label>
        <p className={hintClass}>Regex, dipisah tanda | (contoh: gaji|kontrak|harga).</p>
        <input
          id="secret_keywords"
          name="secret_keywords"
          className={`${fieldClass} min-h-11 font-mono`}
          defaultValue={settings.secret_keywords ?? ""}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="notify_email" className={labelClass}>
            Email notifikasi
          </label>
          <input
            id="notify_email"
            name="notify_email"
            type="email"
            className={`${fieldClass} min-h-11`}
            defaultValue={settings.notify_email ?? ""}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="web_base_url" className={labelClass}>
            URL web
          </label>
          <input
            id="web_base_url"
            name="web_base_url"
            type="url"
            placeholder="https://…vercel.app"
            className={`${fieldClass} min-h-11`}
            defaultValue={settings.web_base_url ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md bg-teal px-5 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
        {result && (
          <p role="status" className={`text-sm ${result.ok ? "text-teal-dark" : "text-red-700"}`}>
            {result.message}
          </p>
        )}
      </div>
    </form>
  );
}
