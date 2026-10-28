import Link from "next/link";
import { notFound } from "next/navigation";
import { WeekPicker } from "@/components/week-picker";
import { JOB_COLUMNS } from "@/lib/jobs";
import { getSupabase } from "@/lib/supabase";
import type { ActivityRow, JobRow, SourceRow, SourceType } from "@/lib/types";
import { formatWeekParam, parseWeekParam } from "@/lib/week";
import { MATRIX_GRID, MatrixRow, type MatrixRowData } from "./matrix-row";
import { N8nPanel } from "./n8n-panel";

const COLUMNS = ["Activity", "Gaya", "Fathom", "MoM", "Slide", "Tracker", "ClickUp lalu", ""];

type MatrixWeek = {
  id: string;
  activities: (ActivityRow & { activity_sources: SourceRow[] })[];
  jobs: JobRow[];
};

function toRowData(activity: ActivityRow, sources: SourceRow[]): MatrixRowData {
  const find = (type: SourceType) => sources.find((source) => source.source_type === type);
  const param = (type: SourceType, key: string) => find(type)?.params?.[key];
  const keywords = param("fathom", "keywords");

  return {
    name: activity.name,
    divisi: activity.project,
    initial: {
      activityId: activity.id,
      styleMode: activity.style_mode,
      fathom: {
        enabled: find("fathom")?.enabled ?? false,
        keywords: Array.isArray(keywords) ? keywords.join(", ") : "",
      },
      mom: { enabled: find("mom")?.enabled ?? false, ref: String(param("mom", "doc_id") ?? "") },
      slide: { enabled: find("slide")?.enabled ?? false, ref: String(param("slide", "slide_id") ?? "") },
      tracker: { enabled: find("tracker")?.enabled ?? false, tab: String(param("tracker", "tab") ?? "") },
      clickupPrev: { enabled: find("clickup_prev")?.enabled ?? false },
    },
  };
}

export default async function MatriksPage({ params }: { params: Promise<{ week: string }> }) {
  const isoWeek = parseWeekParam((await params).week);
  if (!isoWeek) notFound();
  const weekParam = formatWeekParam(isoWeek);

  const db = getSupabase();
  // Dua query paralel. Query pertama mengambil week + activity terpilih + sumbernya + job terakhir sekaligus.
  const [weekResult, settingsResult] = await Promise.all([
    db
      .from("weeks")
      .select(`id, activities(*, activity_sources(*)), jobs(${JOB_COLUMNS})`)
      .eq("iso_year", isoWeek.year)
      .eq("iso_week", isoWeek.week)
      .eq("activities.selected", true)
      .order("sort_order", { referencedTable: "activities" })
      .order("requested_at", { referencedTable: "jobs", ascending: false })
      .limit(1, { referencedTable: "jobs" })
      .maybeSingle<MatrixWeek>(),
    db.from("settings").select("auto_run").eq("id", 1).maybeSingle<{ auto_run: boolean }>(),
  ]);
  if (weekResult.error) throw new Error(`Gagal membaca week: ${weekResult.error.message}`);
  if (settingsResult.error) throw new Error(`Gagal membaca pengaturan: ${settingsResult.error.message}`);

  const week = weekResult.data;
  const settings = settingsResult.data;
  const latestJob = week?.jobs[0] ?? null;
  const rows = (week?.activities ?? []).map((activity) => toRowData(activity, activity.activity_sources));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Matriks sumber</h1>
        <WeekPicker isoWeek={isoWeek} suffix="/matriks" />
      </header>

      <N8nPanel week={weekParam} initialAutoRun={settings?.auto_run ?? false} initialJob={latestJob} />

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Belum ada activity terpilih untuk week ini.{" "}
          <Link href={`/week/${weekParam}`} className="font-semibold text-teal underline">
            Pilih activity
          </Link>{" "}
          dulu.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
          <li
            className={`hidden bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 ${MATRIX_GRID}`}
            aria-hidden
          >
            {COLUMNS.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </li>
          {rows.map((row) => (
            <MatrixRow key={row.initial.activityId} {...row} />
          ))}
        </ul>
      )}
    </div>
  );
}
