"use client";

import { useState, useTransition } from "react";
import type { ActivityRow } from "@/lib/types";
import { setSelectedAction } from "./actions";

type Filter = "semua" | "milik" | "dipilih";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "milik", label: "Milik saya" },
  { value: "dipilih", label: "Dipilih" },
];

export function ActivityTable({ activities }: { activities: ActivityRow[] }) {
  const [filter, setFilter] = useState<Filter>("semua");
  // Salinan lokal agar checkbox langsung berubah (optimistic), lalu disimpan ke server.
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(activities.map((activity) => [activity.id, activity.selected])),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(id: string, value: boolean) {
    setSelected((current) => ({ ...current, [id]: value }));
    setError(null);
    startTransition(async () => {
      const result = await setSelectedAction({ activityId: id, selected: value });
      if (!result.ok) {
        setSelected((current) => ({ ...current, [id]: !value }));
        setError("Gagal menyimpan pilihan. Coba lagi.");
      }
    });
  }

  const visible = activities.filter((activity) => {
    if (filter === "milik") return activity.assigned_to_me;
    if (filter === "dipilih") return selected[activity.id];
    return true;
  });
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border border-slate-300 bg-white p-1" role="group" aria-label="Filter">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`min-h-11 rounded px-3 text-sm font-medium ${
                filter === item.value ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          {selectedCount} dari {activities.length} dipilih
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Tidak ada activity untuk filter ini.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
          <li className="hidden grid-cols-[3rem_1fr_12rem_10rem] gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 md:grid">
            <span>Pilih</span>
            <span>Activity</span>
            <span>Project</span>
            <span>PIC 1a</span>
          </li>
          {visible.map((activity) => (
            <li key={activity.id}>
              <label className="grid cursor-pointer grid-cols-[3rem_1fr] items-center gap-x-3 gap-y-1 px-3 py-2 hover:bg-slate-50 md:grid-cols-[3rem_1fr_12rem_10rem]">
                <span className="row-span-2 flex size-11 items-center justify-center md:row-span-1">
                  <input
                    type="checkbox"
                    className="size-5 accent-teal"
                    checked={selected[activity.id] ?? false}
                    onChange={(event) => toggle(activity.id, event.target.checked)}
                  />
                </span>
                <span className="font-medium text-slate-900">
                  {activity.name}
                  {activity.assigned_to_me && (
                    <span className="ml-2 inline-block rounded bg-teal/10 px-1.5 py-0.5 text-xs font-semibold text-teal">
                      Milik saya
                    </span>
                  )}
                </span>
                <span className="text-sm text-slate-600">
                  <span className="md:hidden">{[activity.project, activity.assignee_names].filter(Boolean).join(" · ") || "—"}</span>
                  <span className="hidden md:inline">{activity.project ?? "—"}</span>
                </span>
                <span className="hidden text-sm text-slate-600 md:inline">{activity.assignee_names ?? "—"}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
