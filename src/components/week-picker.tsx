import Link from "next/link";
import { type IsoWeek, formatTanggal, formatWeekParam, shiftWeek, weekRange } from "@/lib/week";

// suffix: "" untuk halaman activity, "/matriks" untuk halaman matriks.
export function WeekPicker({ isoWeek, suffix = "" }: { isoWeek: IsoWeek; suffix?: string }) {
  const range = weekRange(isoWeek);
  const linkClass =
    "flex size-11 items-center justify-center rounded-md border border-slate-300 bg-white text-lg text-slate-700 hover:bg-slate-50";

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/week/${formatWeekParam(shiftWeek(isoWeek, -1))}${suffix}`}
        className={linkClass}
        aria-label="Week sebelumnya"
      >
        ‹
      </Link>
      <div className="min-w-0 text-center">
        <p className="font-semibold text-slate-900">
          Week {String(isoWeek.week).padStart(2, "0")} · {isoWeek.year}
        </p>
        <p className="text-xs text-slate-500">
          {formatTanggal(range.start)} – {formatTanggal(range.end)}
        </p>
      </div>
      <Link
        href={`/week/${formatWeekParam(shiftWeek(isoWeek, 1))}${suffix}`}
        className={linkClass}
        aria-label="Week berikutnya"
      >
        ›
      </Link>
    </div>
  );
}
