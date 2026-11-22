"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanProgress } from "@/components/scan-progress";
import { bucketFileCount, capture, hasCompletedScan, markScanCompleted } from "@/lib/analytics";

export function ScanForm() {
  const [target, setTarget] = React.useState("");
  const [jobId, setJobId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");
  const [cached, setCached] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState(0);

  React.useEffect(() => {
    if (startedAt === null) return;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 200);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  function recordScanSuccess(body: {
    cacheHit?: boolean;
    durationMs?: number;
    model?: string | null;
    rubricVersion?: string | null;
    stack?: string | null;
    fileCount?: number | null;
  }) {
    if (hasCompletedScan()) capture("repeat_scan_completed");
    capture("scan_succeeded", {
      cache_hit: body.cacheHit === true,
      duration_ms: typeof body.durationMs === "number" ? body.durationMs : undefined,
      model: typeof body.model === "string" ? body.model : undefined,
      rubric_version: typeof body.rubricVersion === "string" ? body.rubricVersion : undefined,
      stack: typeof body.stack === "string" ? body.stack : undefined,
      file_count_bucket: typeof body.fileCount === "number" ? bucketFileCount(body.fileCount) : undefined,
    });
    markScanCompleted();
  }

  function recordScanFailure(errorMessage: string) {
    capture("scan_failed", { error_category: categorizeScanErrorMessage(errorMessage) });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCached(false);
    setStatus("running");
    setElapsedMs(0);
    setStartedAt(Date.now());
    capture("scan_started");
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        id?: string;
        status?: string;
        slug?: string;
        cached?: boolean;
        cacheHit?: boolean;
        durationMs?: number;
        model?: string | null;
        rubricVersion?: string | null;
        stack?: string | null;
        fileCount?: number | null;
        error?: string;
        category?: string;
      };
      if (!response.ok) {
        const message = typeof body.error === "string" && body.error ? body.error : "Scan failed.";
        recordScanFailure(typeof body.category === "string" ? body.category : message);
        setError(message);
        setStatus("");
        setStartedAt(null);
        return;
      }

      const createdId = typeof body.id === "string" ? body.id : "";
      setJobId(createdId);
      if (body.cached === true) setCached(true);
      if (body.status === "complete" && typeof body.slug === "string") {
        recordScanSuccess(body);
        setStatus("complete");
        window.location.href = `/r/${body.slug}`;
        return;
      }

      const poll = async () => {
        const statusResponse = await fetch(`/api/scan/${createdId}`);
        const current = (await statusResponse.json().catch(() => ({}))) as {
          status?: string;
          error?: string;
          category?: string;
          slug?: string;
          cacheHit?: boolean;
          durationMs?: number;
          model?: string | null;
          rubricVersion?: string | null;
          stack?: string | null;
          fileCount?: number | null;
        };
        const currentStatus = typeof current.status === "string" ? current.status : "";
        setStatus(currentStatus);
        if (currentStatus === "running") {
          setTimeout(poll, 500);
          return;
        }
        if (currentStatus === "complete" && typeof current.slug === "string") {
          recordScanSuccess(current);
          window.location.href = `/r/${current.slug}`;
          return;
        }
        if (currentStatus === "failed") {
          const message = typeof current.error === "string" && current.error ? current.error : "Scan failed.";
          recordScanFailure(typeof current.category === "string" ? current.category : message);
          setError(message);
          setStartedAt(null);
        }
      };
      void poll();
    } catch {
      recordScanFailure("network_error");
      setError("Could not reach the scan service.");
      setStatus("");
      setStartedAt(null);
    }
  }

  const busy = status === "running" || status === "complete";

  return (
    <div className="mx-auto mt-3xl w-full max-w-article rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-lg">
        <label htmlFor="scan-target" className="text-label font-medium text-text-primary">
          Repository
        </label>
        <input
          id="scan-target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="https://github.com/owner/repo"
          autoComplete="off"
          required
          disabled={busy}
          className="h-10 w-full rounded-corner-md border border-border-primary bg-surface-bg px-lg font-mono text-label-sm text-text-primary outline-none placeholder:font-sans placeholder:text-text-tertiary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        />
        <p className="text-label-sm text-text-secondary">
          Public GitHub repositories only. For local folders, use the CLI. Nothing is executed.
        </p>
        <div className="flex flex-wrap items-center gap-md">
          <Button type="submit" disabled={busy}>
            {busy ? <ScanningSpinner /> : null}
            {busy ? "Scanning…" : "Scan repository"}
          </Button>
          {cached && <Badge variant="secondary">Cached result</Badge>}
        </div>
      </form>
      {busy && <ScanProgress elapsedMs={elapsedMs} status={status} />}
      {(jobId || status) && !busy && (
        <div className="mt-xl flex flex-wrap items-center gap-md border-t border-border-secondary pt-xl">
          {jobId && <code className="rounded-corner-sm bg-bg-faint px-sm py-xs font-mono text-xs text-text-secondary">{jobId}</code>}
          {status && <Badge variant={status === "failed" ? "danger" : "secondary"}>{status}</Badge>}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-lg rounded-corner-md border border-danger/40 bg-danger/10 p-lg font-mono text-label-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function ScanningSpinner() {
  return (
    <span
      aria-hidden="true"
      className="ui-spinner inline-block size-4 rounded-full border-2 border-current border-t-transparent"
    />
  );
}

function categorizeScanErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (message.includes("_")) return message;
  if (normalized.includes("rate limit")) return "rate_limited";
  if (normalized.includes("spend cap")) return "spend_cap";
  if (normalized.includes("invalid")) return "invalid_input";
  if (normalized.includes("not found")) return "repo_not_found";
  if (normalized.includes("too large") || normalized.includes("exceeds")) return "repo_too_large";
  if (normalized.includes("provider")) return "provider_error";
  if (normalized.includes("temporarily disabled")) return "unavailable";
  return "internal_error";
}
