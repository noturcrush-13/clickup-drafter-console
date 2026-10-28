import "server-only";
import {
  PIC_LEAD_FIELD_ID,
  fetchAllTasks,
  findWeekList,
  getField,
  readAssigneeNames,
  readProject,
  resolveDropdown,
} from "./clickup";
import { getSupabase } from "./supabase";
import type { SourceType, StyleMode } from "./types";
import { type IsoWeek, shiftWeek, weekRange } from "./week";

export type SyncResult = { ok: boolean; message: string };

type SourceTemplate = { source_type: SourceType; enabled: boolean; params: Record<string, unknown> };
type PrevActivity = { id: string; name: string; style_mode: StyleMode };

const DEFAULT_SOURCES: SourceTemplate[] = [
  { source_type: "fathom", enabled: true, params: { keywords: [] } },
  { source_type: "mom", enabled: false, params: {} },
  { source_type: "slide", enabled: false, params: {} },
  { source_type: "tracker", enabled: false, params: {} },
  { source_type: "clickup_prev", enabled: true, params: {} },
];

const normalizeName = (name: string) => name.trim().toLowerCase();

type DbResult = { data: unknown; error: { message: string } | null };

// Untuk query yang boleh kosong (maybeSingle).
function checkMaybe<R extends DbResult>(result: R, what: string): R["data"] {
  if (result.error) throw new Error(`Gagal ${what}: ${result.error.message}`);
  return result.data;
}

// Untuk query yang wajib mengembalikan data.
function check<R extends DbResult>(result: R, what: string): NonNullable<R["data"]> {
  const data = checkMaybe(result, what);
  if (data === null || data === undefined) throw new Error(`Gagal ${what}: data kosong.`);
  return data as NonNullable<R["data"]>;
}

export async function syncWeek(isoWeek: IsoWeek): Promise<SyncResult> {
  const db = getSupabase();

  const list = await findWeekList(isoWeek.week);
  if (!list) {
    const nn = String(isoWeek.week).padStart(2, "0");
    return {
      ok: false,
      message: `List "Week ${nn}" tidak ditemukan di folder ClickUp. Pastikan list minggu ini sudah dibuat, lalu coba lagi.`,
    };
  }

  const settings = checkMaybe(
    await db.from("settings").select("pic_lead_option_id").eq("id", 1).maybeSingle(),
    "membaca pengaturan",
  );
  const myOptionId: string | null = settings?.pic_lead_option_id ?? null;

  // 1. Upsert baris week.
  const range = weekRange(isoWeek);
  const week = check(
    await db
      .from("weeks")
      .upsert(
        {
          iso_year: isoWeek.year,
          iso_week: isoWeek.week,
          start_date: range.start,
          end_date: range.end,
          clickup_list_id: list.id,
          clickup_list_name: list.name,
        },
        { onConflict: "iso_year,iso_week" },
      )
      .select("id")
      .single(),
    "menyimpan week",
  );

  // 2. Ambil task dan ubah ke bentuk baris activity.
  const tasks = await fetchAllTasks(list.id);
  const now = new Date().toISOString();
  const rows = tasks.map((task, index) => {
    const picField = getField(task, PIC_LEAD_FIELD_ID);
    const picOption = picField ? resolveDropdown(picField) : null;
    return {
      week_id: week.id as string,
      clickup_task_id: task.id,
      name: task.name,
      project: readProject(task),
      assignee_names: picOption?.name ?? readAssigneeNames(task),
      assigned_to_me: Boolean(myOptionId && picOption?.id === myOptionId),
      sort_order: index,
      updated_at: now,
    };
  });

  const existing = check(
    await db.from("activities").select("clickup_task_id").eq("week_id", week.id),
    "membaca activity",
  );
  const existingIds = new Set(existing.map((row) => row.clickup_task_id as string));
  const updates = rows.filter((row) => existingIds.has(row.clickup_task_id));
  const inserts = rows.filter((row) => !existingIds.has(row.clickup_task_id));

  // 3. Activity lama: perbarui data dari ClickUp, tetapi JANGAN sentuh selected dan style_mode.
  if (updates.length > 0) {
    check(
      await db.from("activities").upsert(updates, { onConflict: "week_id,clickup_task_id" }),
      "memperbarui activity",
    );
  }

  // 4. Activity baru: salin gaya dan sumber dari activity bernama sama di week sebelumnya.
  if (inserts.length > 0) {
    const prev = await loadPreviousWeek(shiftWeek(isoWeek, -1));

    const inserted = check(
      await db
        .from("activities")
        .insert(
          inserts.map((row) => ({
            ...row,
            selected: row.assigned_to_me,
            style_mode: prev.activities.get(normalizeName(row.name))?.style_mode ?? "saya",
          })),
        )
        .select("id, name"),
      "menambah activity",
    );

    const sourceRows = inserted.flatMap((activity) => {
      const match = prev.activities.get(normalizeName(activity.name as string));
      const copied = match ? prev.sources.get(match.id) : undefined;
      const template = copied && copied.length > 0 ? copied : DEFAULT_SOURCES;
      return template.map((source) => ({ ...source, activity_id: activity.id as string }));
    });
    check(await db.from("activity_sources").insert(sourceRows), "menambah sumber activity");
  }

  return {
    ok: true,
    message: `Sinkron selesai dari "${list.name}": ${tasks.length} task, ${inserts.length} activity baru.`,
  };
}

async function loadPreviousWeek(prev: IsoWeek) {
  const db = getSupabase();
  const activities = new Map<string, PrevActivity>();
  const sources = new Map<string, SourceTemplate[]>();

  const prevWeek = checkMaybe(
    await db.from("weeks").select("id").eq("iso_year", prev.year).eq("iso_week", prev.week).maybeSingle(),
    "membaca week sebelumnya",
  );
  if (!prevWeek) return { activities, sources };

  const prevActivities = check(
    await db.from("activities").select("id, name, style_mode").eq("week_id", prevWeek.id),
    "membaca activity week sebelumnya",
  ) as PrevActivity[];
  for (const activity of prevActivities) activities.set(normalizeName(activity.name), activity);
  if (prevActivities.length === 0) return { activities, sources };

  const prevSources = check(
    await db
      .from("activity_sources")
      .select("activity_id, source_type, enabled, params")
      .in(
        "activity_id",
        prevActivities.map((activity) => activity.id),
      ),
    "membaca sumber week sebelumnya",
  ) as (SourceTemplate & { activity_id: string })[];
  for (const { activity_id, ...source } of prevSources) {
    sources.set(activity_id, [...(sources.get(activity_id) ?? []), source]);
  }
  return { activities, sources };
}
