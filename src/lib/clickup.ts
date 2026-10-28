import "server-only";
import { getEnv } from "./env";

const BASE_URL = "https://api.clickup.com/api/v2";
export const PIC_LEAD_FIELD_ID = "e77a8ae0-1deb-4ea9-af5e-4f8d5d926bdc";

type DropdownOption = { id: string; name: string; orderindex: number | string };

export type ClickUpField = {
  id: string;
  name: string;
  type: string;
  type_config?: { options?: DropdownOption[] };
  value?: unknown;
};

export type ClickUpTask = {
  id: string;
  name: string;
  assignees?: { username?: string | null; email?: string }[];
  custom_fields?: ClickUpField[];
};

type ClickUpList = { id: string; name: string };

async function clickupGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: getEnv().CLICKUP_TOKEN }, // tanpa kata "Bearer"
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`ClickUp menolak permintaan (HTTP ${res.status}).`);
  }
  return (await res.json()) as T;
}

// Cari list "Week NN" di folder. Contoh: week 44 cocok dengan "Week 44", "week44", "WEEK 44 - ...".
export async function findWeekList(weekNumber: number): Promise<ClickUpList | null> {
  const { lists } = await clickupGet<{ lists: ClickUpList[] }>(
    `/folder/${getEnv().CLICKUP_FOLDER_ID}/list`,
  );
  const pattern = new RegExp(`^\\s*week\\s*0?${weekNumber}\\b`, "i");
  return lists.find((list) => pattern.test(list.name)) ?? null;
}

// Ambil semua task (maks. 100 per halaman), ulangi sampai halaman kosong.
export async function fetchAllTasks(listId: string): Promise<ClickUpTask[]> {
  const all: ClickUpTask[] = [];
  for (let page = 0; page < 50; page++) {
    const { tasks } = await clickupGet<{ tasks: ClickUpTask[] }>(
      `/list/${listId}/task?include_closed=true&page=${page}`,
    );
    if (tasks.length === 0) break;
    all.push(...tasks);
  }
  return all;
}

// Nilai drop_down bisa berupa orderindex (angka) atau id opsi (string). Tangani keduanya.
export function resolveDropdown(field: ClickUpField): DropdownOption | null {
  const options = field.type_config?.options ?? [];
  const { value } = field;
  if (value === null || value === undefined || value === "") return null;
  const byId = options.find((option) => option.id === value);
  if (byId) return byId;
  const asIndex =
    typeof value === "number" ? value : /^\d+$/.test(String(value)) ? Number(value) : Number.NaN;
  return options.find((option) => Number(option.orderindex) === asIndex) ?? null;
}

export function getField(task: ClickUpTask, fieldId: string): ClickUpField | undefined {
  return task.custom_fields?.find((field) => field.id === fieldId);
}

// Kolom "project": custom field pertama yang namanya mengandung "project" dan berisi nilai.
export function readProject(task: ClickUpTask): string | null {
  for (const field of task.custom_fields ?? []) {
    if (!/project/i.test(field.name)) continue;
    if (field.type === "drop_down") {
      const option = resolveDropdown(field);
      if (option) return option.name;
    } else if (typeof field.value === "string" && field.value.trim()) {
      return field.value.trim();
    }
  }
  return null;
}

export function readAssigneeNames(task: ClickUpTask): string | null {
  const names = (task.assignees ?? [])
    .map((person) => person.username || person.email)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : null;
}
