import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentWeek, formatWeekParam } from "@/lib/week";

export default async function Home() {
  await connection(); // pastikan dihitung saat request, bukan saat build
  redirect(`/week/${formatWeekParam(currentWeek())}`);
}
