import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentWeek, formatWeekParam } from "@/lib/week";

export default async function MatriksRedirect() {
  await connection();
  redirect(`/week/${formatWeekParam(currentWeek())}/matriks`);
}
