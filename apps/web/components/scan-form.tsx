"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanProgress } from "@/components/scan-progress";

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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCached(false);
    setStatus("running");
    setElapsedMs(0);
    setStartedAt(Date.now());
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
        error?: string;
      };
      if (!response.ok) {
        setError(typeof body.error === "string" && body.error ? body.error : "Scan failed.");
        setStatus("");
        setStartedAt(null);
        return;
      }

      const createdId = typeof body.id === "string" ? body.id : "";
      setJobId(createdId);
      if (body.cached === true) setCached(true);
      if (body.status === "complete" && typeof body.slug === "string") {
        setStatus("complete");
        window.location.href = `/r/${body.slug}`;
        return;
      }

      const poll = async () => {
        const statusResponse = await fetch(`/api/scan/${createdId}`);
        const current = (await statusResponse.json().catch(() => ({}))) as {
          status?: string;
          error?: string;
          slug?: string;
        };
        const currentStatus = typeof current.status === "string" ? current.status : "";
        setStatus(currentStatus);
        if (currentStatus === "running") {
          setTimeout(poll, 500);
          return;
        }
        if (currentStatus === "complete" && typeof current.slug === "string") {
          window.location.href = `/r/${current.slug}`;
          return;
        }
        if (currentStatus === "failed") {
          setError(typeof current.error === "string" && current.error ? current.error : "Scan failed.");
          setStartedAt(null);
        }
      };
      void poll();
    } catch {
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
