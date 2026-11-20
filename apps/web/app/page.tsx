"use client";

import { FormEvent, useState } from "react";

interface ScanJob {
  id: string;
  status: "running" | "complete" | "failed";
  report?: { score: number; verdict: string; operateMd: string };
  error?: string;
}

export default function Home() {
  const [target, setTarget] = useState("");
  const [job, setJob] = useState<ScanJob | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setJob(null);
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target }),
    });
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    const created = (await response.json()) as { id: string };
    const id = created.id;
    const poll = async () => {
      const statusResponse = await fetch(`/api/scan/${id}`);
      const current = (await statusResponse.json()) as ScanJob;
      setJob(current);
      if (current.status === "running") setTimeout(poll, 1000);
    };
    void poll();
  }

  return (
    <main>
      <h1>BusFactor</h1>
      <p>Could someone who didn&apos;t write this safely run it?</p>
      <form onSubmit={onSubmit}>
        <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="https://github.com/owner/repo or local path" />
        <button type="submit">Scan</button>
      </form>
      {error && <pre>{error}</pre>}
      {job?.status === "running" && <p>Scanning...</p>}
      {job?.status === "failed" && <pre>{job.error}</pre>}
      {job?.status === "complete" && job.report && (
        <section>
          <h2>{job.report.score}/100 — {job.report.verdict}</h2>
          <pre>{job.report.operateMd}</pre>
        </section>
      )}
    </main>
  );
}
