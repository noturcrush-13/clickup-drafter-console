"use client";

import { useState, useTransition } from "react";
import type { StyleMode } from "@/lib/types";
import { type MatrixRowInput, saveMatrixRowAction } from "./actions";

export const MATRIX_GRID =
  "lg:grid lg:grid-cols-[minmax(10rem,1.3fr)_6.5rem_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(7rem,0.8fr)_5rem_6rem] lg:items-start lg:gap-3";

export type MatrixRowData = { name: string; divisi: string | null; initial: MatrixRowInput };

export function MatrixRow({ name, divisi, initial }: MatrixRowData) {
  const [row, setRow] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function update(patch: Partial<MatrixRowInput>) {
    setRow((current) => ({ ...current, ...patch }));
    setDirty(true);
    setStatus(null);
  }

  function save() {
    startTransition(async () => {
      const result = await saveMatrixRowAction(row);
      setStatus(result);
      if (result.ok) {
        // Tampilkan ID hasil ekstraksi dari URL.
        setRow((current) => ({
          ...current,
          mom: { ...current.mom, ref: result.momId ?? "" },
          slide: { ...current.slide, ref: result.slideId ?? "" },
        }));
        setDirty(false);
      }
    });
  }

  const inputClass =
    "min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <li className={`space-y-3 p-4 lg:space-y-0 lg:px-3 lg:py-3 ${MATRIX_GRID}`}>
      <div>
        <p className="font-medium text-slate-900">{name}</p>
        {divisi && <p className="text-xs text-slate-500">Divisi {divisi}</p>}
      </div>

      <Cell label="Gaya">
        <select
          className={inputClass}
          value={row.styleMode}
          onChange={(event) => update({ styleMode: event.target.value as StyleMode })}
        >
          <option value="saya">saya</option>
          <option value="ikuti">ikuti</option>
        </select>
      </Cell>

      <Cell label="Fathom">
        <Toggle checked={row.fathom.enabled} onChange={(enabled) => update({ fathom: { ...row.fathom, enabled } })} />
        <input
          className={inputClass}
          placeholder="keyword, pisah koma"
          value={row.fathom.keywords}
          disabled={!row.fathom.enabled}
          onChange={(event) => update({ fathom: { ...row.fathom, keywords: event.target.value } })}
        />
      </Cell>

      <Cell label="MoM">
        <Toggle checked={row.mom.enabled} onChange={(enabled) => update({ mom: { ...row.mom, enabled } })} />
        <input
          className={inputClass}
          placeholder="URL/ID Google Docs"
          value={row.mom.ref}
          disabled={!row.mom.enabled}
          onChange={(event) => update({ mom: { ...row.mom, ref: event.target.value } })}
        />
      </Cell>

      <Cell label="Slide">
        <Toggle checked={row.slide.enabled} onChange={(enabled) => update({ slide: { ...row.slide, enabled } })} />
        <input
          className={inputClass}
          placeholder="URL/ID Google Slides"
          value={row.slide.ref}
          disabled={!row.slide.enabled}
          onChange={(event) => update({ slide: { ...row.slide, ref: event.target.value } })}
        />
      </Cell>

      <Cell label="Tracker">
        <Toggle checked={row.tracker.enabled} onChange={(enabled) => update({ tracker: { ...row.tracker, enabled } })} />
        <input
          className={inputClass}
          placeholder="Nama tab"
          value={row.tracker.tab}
          disabled={!row.tracker.enabled}
          onChange={(event) => update({ tracker: { ...row.tracker, tab: event.target.value } })}
        />
      </Cell>

      <Cell label="ClickUp lalu">
        <Toggle checked={row.clickupPrev.enabled} onChange={(enabled) => update({ clickupPrev: { enabled } })} />
      </Cell>

      <div className="space-y-1">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="min-h-11 w-full rounded-md bg-teal px-3 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        {status && (
          <p role="status" className={`text-xs ${status.ok ? "text-teal-dark" : "text-red-700"}`}>
            {status.message}
          </p>
        )}
      </div>
    </li>
  );
}

// Di layar sempit tiap sel diberi label; di layar lebar label disembunyikan (ada header kolom).
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-slate-500 lg:hidden">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="size-5 accent-teal"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {checked ? "Aktif" : "Mati"}
    </label>
  );
}
