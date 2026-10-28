"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/spinner";
import { syncAction } from "./actions";

export function SyncButton({ week }: { week: string }) {
  const [result, formAction, pending] = useActionState(syncAction, null);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <form action={formAction}>
        <input type="hidden" name="week" value={week} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {pending ? (
            <>
              <Spinner /> Menyinkron…
            </>
          ) : (
            "Sinkron dari ClickUp"
          )}
        </button>
      </form>
      {pending && <p className="text-sm text-slate-500">Mengambil task dari ClickUp, biasanya beberapa detik…</p>}
      {!pending && result && (
        <p
          role="status"
          className={`max-w-md text-sm ${result.ok ? "text-teal-dark" : "text-red-700"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
