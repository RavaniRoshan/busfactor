"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ScanForm() {
  const [target, setTarget] = React.useState("");
  const [jobId, setJobId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("running");
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (!response.ok) {
        setError(await response.text());
        setStatus("");
        return;
      }
      const created = (await response.json()) as { id: string };
      setJobId(created.id);
      const poll = async () => {
        const statusResponse = await fetch(`/api/scan/${created.id}`);
        const current = (await statusResponse.json()) as { status: string; error?: string; slug?: string };
        setStatus(current.status);
        if (current.status === "running") setTimeout(poll, 1000);
        if (current.status === "complete" && current.slug) {
          window.location.href = `/r/${current.slug}`;
        }
        if (current.status === "failed") setError(current.error ?? "scan failed");
      };
      void poll();
    } catch {
      setError("Could not reach the scan service.");
      setStatus("");
    }
  }

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
          placeholder="https://github.com/owner/repo or local path"
          autoComplete="off"
          required
          className="h-10 w-full rounded-corner-md border border-border-primary bg-surface-bg px-lg font-mono text-label-sm text-text-primary outline-none placeholder:font-sans placeholder:text-text-tertiary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-label-sm text-text-secondary">Public GitHub URLs and local paths. Nothing is executed, and no signup is required.</p>
        <div>
          <Button type="submit" disabled={status === "running"}>
            {status === "running" ? "Scanning…" : "Scan repository"}
          </Button>
        </div>
      </form>
      {(jobId || status) && (
        <div className="mt-xl flex flex-wrap items-center gap-md border-t border-border-secondary pt-xl">
          {jobId && <code className="rounded-corner-sm bg-bg-faint px-sm py-xs font-mono text-xs text-text-secondary">{jobId}</code>}
          {status && <Badge variant={status === "failed" ? "danger" : status === "complete" ? "success" : "secondary"}>{status}</Badge>}
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
