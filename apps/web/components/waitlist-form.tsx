"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function WaitlistForm() {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMessage(response.ok ? "You are on the waitlist." : "Could not join the waitlist.");
    } catch {
      setMessage("Could not join the waitlist.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-copy flex-col items-center gap-sm sm:flex-row">
      <label htmlFor="waitlist-email" className="sr-only">
        Email address
      </label>
      <input
        id="waitlist-email"
        type="email"
        required
        autoComplete="email"
        disabled={pending}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="h-9 w-full rounded-corner-md border border-border-primary bg-transparent px-lg text-label text-text-primary outline-none placeholder:text-text-tertiary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
      />
      <Button type="submit" disabled={pending}>
        {pending ? (
          <span aria-hidden="true" className="ui-spinner inline-block size-4 rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {pending ? "Joining…" : "Join waitlist"}
      </Button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {message}
      </span>
      {message && <p className="text-label-sm text-text-secondary">{message}</p>}
    </form>
  );
}
