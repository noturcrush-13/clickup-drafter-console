// Perhitungan minggu ISO berbasis WITA (UTC+8). Server Vercel berjalan di UTC,
// jadi waktu "sekarang" digeser +8 jam lalu dibaca dengan getter UTC.

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type IsoWeek = { year: number; week: number };

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Tanggal (tengah malam UTC) yang mewakili hari kalender WITA saat ini.
function todayWita(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + WITA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

function isoWeekOfDay(day: Date): IsoWeek {
  // Kamis di minggu yang sama menentukan tahun ISO.
  const dayNum = (day.getUTCDay() + 6) % 7; // Senin = 0
  const thursday = new Date(day.getTime() + (3 - dayNum) * DAY_MS);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = 1 + Math.floor((thursday.getTime() - jan1) / DAY_MS / 7);
  return { year, week };
}

function mondayOf({ year, week }: IsoWeek): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayNum = (jan4.getUTCDay() + 6) % 7;
  return new Date(jan4.getTime() + (-jan4DayNum + (week - 1) * 7) * DAY_MS);
}

function toDateString(day: Date): string {
  return day.toISOString().slice(0, 10);
}

export function currentWeek(now?: Date): IsoWeek {
  return isoWeekOfDay(todayWita(now));
}

export function formatWeekParam({ year, week }: IsoWeek): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// "2026-W44" → { year: 2026, week: 44 }, atau null bila tidak valid.
export function parseWeekParam(param: string): IsoWeek | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(param);
  if (!match) return null;
  const candidate = { year: Number(match[1]), week: Number(match[2]) };
  if (candidate.week < 1) return null;
  // Validasi: Senin minggu itu harus kembali ke minggu yang sama (menolak W53 di tahun tanpa W53).
  const check = isoWeekOfDay(mondayOf(candidate));
  return check.year === candidate.year && check.week === candidate.week ? candidate : null;
}

export function weekRange(isoWeek: IsoWeek): { start: string; end: string } {
  const monday = mondayOf(isoWeek);
  return { start: toDateString(monday), end: toDateString(new Date(monday.getTime() + 6 * DAY_MS)) };
}

export function shiftWeek(isoWeek: IsoWeek, delta: number): IsoWeek {
  return isoWeekOfDay(new Date(mondayOf(isoWeek).getTime() + delta * 7 * DAY_MS));
}

// "2026-10-26" → "26 Oktober 2026"
export function formatTanggal(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return `${day} ${BULAN[month - 1]} ${year}`;
}
