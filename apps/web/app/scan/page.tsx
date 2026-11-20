"use client";

import { FormEvent, useState } from "react";

export default function ScanPage() {
  const [target, setTarget] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("running");
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
  }

  return (
    <main>
      <h1>Scan a repository</h1>
      <form onSubmit={onSubmit}>
        <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="https://github.com/owner/repo or local path" />
        <button type="submit">Scan</button>
      </form>
      {jobId && <p>Job: {jobId}</p>}
      {status && <p>Status: {status}</p>}
      {error && <pre>{error}</pre>}
    </main>
  );
}
