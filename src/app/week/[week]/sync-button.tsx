"use client";

import { useActionState } from "react";
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
          className="min-h-11 rounded-md bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {pending ? "Menyinkron…" : "Sinkron dari ClickUp"}
        </button>
      </form>
      {result && (
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
