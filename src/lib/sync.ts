import "server-only";
import {
  PIC_LEAD_FIELD_ID,
  fetchAllTasks,
  findWeekList,
  getField,
  readAssigneeNames,
  readDivisi,
  resolveDropdown,
} from "./clickup";
import { getSupabase } from "./supabase";
import type { SourceType, StyleMode } from "./types";
import { type IsoWeek, shiftWeek, weekRange } from "./week";

export type SyncResult = { ok: boolean; message: string };

type SourceTemplate = { source_type: SourceType; enabled: boolean; params: Record<string, unknown> };
type PrevActivity = { style_mode: StyleMode; sources: SourceTemplate[] };

const DEFAULT_SOURCES: SourceTemplate[] = [
  { source_type: "fathom", enabled: true, params: { keywords: [] } },
  { source_type: "mom", enabled: false, params: {} },
  { source_type: "slide", enabled: false, params: {} },
  { source_type: "tracker", enabled: false, params: {} },
  { source_type: "clickup_prev", enabled: true, params: {} },
];

const normalizeName = (name: string) => name.trim().toLowerCase();

type DbResult = { data: unknown; error: { message: string } | null };

// Hanya cek error: untuk maybeSingle dan perintah tulis tanpa .select() (data-nya memang null).
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

  // Tahap 1 (paralel): cari list ClickUp, baca pengaturan, dan ambil data week sebelumnya.
  const [list, settingsResult, prevByName] = await Promise.all([
    findWeekList(isoWeek.week),
    db.from("settings").select("pic_lead_option_id").eq("id", 1).maybeSingle<{ pic_lead_option_id: string | null }>(),
    loadPreviousWeek(shiftWeek(isoWeek, -1)),
  ]);
  if (!list) {
    const nn = String(isoWeek.week).padStart(2, "0");
    return {
      ok: false,
      message: `List "Week ${nn}" tidak ditemukan di folder ClickUp. Pastikan list minggu ini sudah dibuat, lalu coba lagi.`,
    };
  }
  const myOptionId = checkMaybe(settingsResult, "membaca pengaturan")?.pic_lead_option_id ?? null;

  // Tahap 2 (paralel): simpan week (sekaligus ambil activity yang sudah ada) dan ambil task ClickUp.
  const range = weekRange(isoWeek);
  const [weekResult, tasks] = await Promise.all([
    db
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
      .select("id, activities(clickup_task_id)")
      .single<{ id: string; activities: { clickup_task_id: string }[] }>(),
    fetchAllTasks(list.id),
  ]);
  const week = check(weekResult, "menyimpan week");

  const now = new Date().toISOString();
  const rows = tasks.map((task, index) => {
    const picField = getField(task, PIC_LEAD_FIELD_ID);
    const picOption = picField ? resolveDropdown(picField) : null;
    return {
      week_id: week.id,
      clickup_task_id: task.id,
      name: task.name,
      project: readDivisi(task), // kolom "project" dipakai untuk menyimpan Divisi
      assignee_names: picOption?.name ?? readAssigneeNames(task),
      assigned_to_me: Boolean(myOptionId && picOption?.id === myOptionId),
      sort_order: index,
      updated_at: now,
    };
  });

  const existingIds = new Set(week.activities.map((activity) => activity.clickup_task_id));
  const updates = rows.filter((row) => existingIds.has(row.clickup_task_id));
  const inserts = rows.filter((row) => !existingIds.has(row.clickup_task_id));

  // Tahap 3 (paralel):
  // - activity lama: perbarui data dari ClickUp, tetapi JANGAN sentuh selected dan style_mode;
  // - activity baru: selected = milik saya, gaya disalin dari activity bernama sama di week sebelumnya.
  const [updateResult, insertResult] = await Promise.all([
    updates.length > 0
      ? db.from("activities").upsert(updates, { onConflict: "week_id,clickup_task_id" })
      : null,
    inserts.length > 0
      ? db
          .from("activities")
          .insert(
            inserts.map((row) => ({
              ...row,
              selected: row.assigned_to_me,
              style_mode: prevByName.get(normalizeName(row.name))?.style_mode ?? "saya",
            })),
          )
          .select("id, name")
      : null,
  ]);
  if (updateResult) checkMaybe(updateResult, "memperbarui activity");

  if (insertResult) {
    const inserted = check(insertResult, "menambah activity") as { id: string; name: string }[];
    const sourceRows = inserted.flatMap((activity) => {
      const copied = prevByName.get(normalizeName(activity.name))?.sources;
      const template = copied && copied.length > 0 ? copied : DEFAULT_SOURCES;
      return template.map((source) => ({ ...source, activity_id: activity.id }));
    });
    checkMaybe(await db.from("activity_sources").insert(sourceRows), "menambah sumber activity");
  }

  return {
    ok: true,
    message: `Sinkron selesai dari "${list.name}": ${tasks.length} task, ${inserts.length} activity baru.`,
  };
}

// Activity week sebelumnya beserta sumbernya, dalam satu query. Kunci map: nama task (huruf kecil).
async function loadPreviousWeek(prev: IsoWeek): Promise<Map<string, PrevActivity>> {
  const result = await getSupabase()
    .from("weeks")
    .select("activities(name, style_mode, activity_sources(source_type, enabled, params))")
    .eq("iso_year", prev.year)
    .eq("iso_week", prev.week)
    .maybeSingle<{
      activities: { name: string; style_mode: StyleMode; activity_sources: SourceTemplate[] }[];
    }>();
  const data = checkMaybe(result, "membaca week sebelumnya");

  const byName = new Map<string, PrevActivity>();
  for (const activity of data?.activities ?? []) {
    byName.set(normalizeName(activity.name), {
      style_mode: activity.style_mode,
      sources: activity.activity_sources,
    });
  }
  return byName;
}
