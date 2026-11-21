"use client";

import { LoaderCircle } from "lucide-react";

export function ScanProgress({
  elapsedMs,
  status,
}: {
  elapsedMs: number;
  status: string;
}) {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return (
    <div
      className="ui-progress mt-xl rounded-corner-md border border-border-secondary bg-bg-faint p-lg"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-sm text-label font-medium text-text-primary">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        {status === "complete" ? "Report ready — opening…" : "Scanning repository…"}
      </div>
      <div className="ui-progress-track mt-lg h-1.5 w-full overflow-hidden rounded-corner-full bg-bg-subtle">
        <div className="ui-progress-indeterminate h-full w-1/3 rounded-corner-full bg-brand-primary" />
      </div>
      <p className="mt-md font-mono text-xs tabular-nums text-text-secondary">
        Elapsed {seconds}s · source is never executed
      </p>
    </div>
  );
}
