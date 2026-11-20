"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setMessage(response.ok ? "You are on the waitlist." : "Could not join the waitlist.");
  }

  return (
    <main>
      <h1>Could someone who didn&apos;t write this safely run it?</h1>
      <p>
        BusFactor scans a repository and returns an operability verdict, a risk map, an OPERATE.md, and questions only the
        original author can answer. Every claim cites a file and line.
      </p>

      <h2>How it works</h2>
      <ol>
        <li>Point BusFactor at a local path or public GitHub URL.</li>
        <li>It runs deterministic checks and a citation-validated LLM review.</li>
        <li>You get a score, the top reasons, OPERATE.md, and author-only questions.</li>
      </ol>

      <p>
        <a href="/scan">Scan a repository</a> · <a href="/docs">Documentation</a> · <a href="/terms">Terms</a> ·{" "}
        <a href="/privacy">Privacy</a> · <a href="/removal">Removal</a>
      </p>

      <h2>Scoring</h2>
      <p>
        Seven dimensions, 100 points: runnability, secrets and config, failure handling and observability, tests and CI,
        critical paths, dependencies, and knowledge capture. Code computes the score; the LLM never grades.
      </p>

      <h2>FAQ</h2>
      <dl>
        <dt>Does it store private code?</dt>
        <dd>No by default. The private path is the local CLI with your own key.</dd>
        <dt>Can I publish a score?</dt>
        <dd>Only opt-in. Third-party reports are noindex by default.</dd>
        <dt>What if it cannot analyze something?</dt>
        <dd>It says so in the report. Unknown beats a guess.</dd>
      </dl>

      <h2>Pro waitlist</h2>
      <form onSubmit={onSubmit}>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" required />
        <button type="submit">Join waitlist</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  );
}
