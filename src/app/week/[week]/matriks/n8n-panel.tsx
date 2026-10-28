"use client";

import { useEffect, useState, useTransition } from "react";
import type { JobRow, JobStatus } from "@/lib/types";
import { runNowAction, setAutoRunAction } from "./n8n-actions";

const STATUS_LABEL: Record<JobStatus, { label: string; className: string }> = {
  antri: { label: "Antri", className: "bg-amber-100 text-amber-800" },
  jalan: { label: "Berjalan", className: "bg-sky-100 text-sky-800" },
  selesai: { label: "Selesai", className: "bg-teal/10 text-teal-dark" },
  gagal: { label: "Gagal", className: "bg-red-100 text-red-800" },
};

const formatWaktu = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Makassar",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso)) + " WITA"
    : "—";

type Props = { week: string; initialAutoRun: boolean; initialJob: JobRow | null };

export function N8nPanel({ week, initialAutoRun, initialJob }: Props) {
  const [autoRun, setAutoRun] = useState(initialAutoRun);
  const [job, setJob] = useState(initialJob);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [running, startRun] = useTransition();
  const [, startToggle] = useTransition();

  // Perbarui status job terakhir tiap 5 detik.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/latest?week=${encodeURIComponent(week)}`, { cache: "no-store" });
        if (res.ok) setJob((await res.json()).job);
      } catch {
        // Abaikan; coba lagi di putaran berikutnya.
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [week]);

  function toggleAutoRun(value: boolean) {
    setAutoRun(value);
    startToggle(async () => {
      const result = await setAutoRunAction(value);
      if (!result.ok) {
        setAutoRun(!value);
        setMessage({ ok: false, text: "Gagal menyimpan pengaturan jalan otomatis." });
      }
    });
  }

  function runNow() {
    setMessage(null);
    startRun(async () => {
      const result = await runNowAction(week);
      setMessage({ ok: result.ok, text: result.message });
      if (result.job) setJob(result.job);
    });
  }

  const busy = job?.status === "antri" || job?.status === "jalan";
  const status = job ? STATUS_LABEL[job.status] : null;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4" aria-labelledby="n8n-title">
      <h2 id="n8n-title" className="font-semibold text-slate-900">
        Kontrol n8n
      </h2>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="size-5 accent-teal"
            checked={autoRun}
            onChange={(event) => toggleAutoRun(event.target.checked)}
          />
          Jalan otomatis sesuai jadwal
        </label>
        <button
          type="button"
          onClick={runNow}
          disabled={running || busy}
          className="min-h-11 rounded-md bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
        >
          {running ? "Membuat job…" : "Jalankan sekarang"}
        </button>
      </div>

      {message && (
        <p role="status" className={`mt-3 text-sm ${message.ok ? "text-teal-dark" : "text-red-700"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Job terakhir</p>
        {job && status ? (
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-slate-700">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
              <span className="ml-2 text-xs text-slate-500">({job.trigger_source})</span>
            </dd>
            <dt className="text-slate-500">Diminta</dt>
            <dd>{formatWaktu(job.requested_at)}</dd>
            <dt className="text-slate-500">Mulai</dt>
            <dd>{formatWaktu(job.started_at)}</dd>
            <dt className="text-slate-500">Selesai</dt>
            <dd>{formatWaktu(job.finished_at)}</dd>
            {job.error && (
              <>
                <dt className="text-slate-500">Error</dt>
                <dd className="whitespace-pre-wrap text-red-700">{job.error}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-slate-500">Belum ada job untuk week ini.</p>
        )}
      </div>
    </section>
  );
}
