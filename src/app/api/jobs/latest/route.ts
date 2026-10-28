import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { findWeekId, getLatestJob } from "@/lib/jobs";
import { parseWeekParam } from "@/lib/week";

const querySchema = z.object({ week: z.string().regex(/^\d{4}-W\d{2}$/) });

// GET /api/jobs/latest?week=2026-W44 → { job: {...} | null }
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({ week: request.nextUrl.searchParams.get("week") });
  const isoWeek = parsed.success ? parseWeekParam(parsed.data.week) : null;
  if (!isoWeek) return NextResponse.json({ error: "Parameter week tidak valid." }, { status: 400 });

  try {
    const weekId = await findWeekId(isoWeek);
    const job = weekId ? await getLatestJob(weekId) : null;
    return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
