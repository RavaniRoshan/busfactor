"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function FeedbackWidget({ slug }: { slug: string }) {
  const [status, setStatus] = React.useState("");
  const [pending, setPending] = React.useState<boolean | null>(null);

  async function submit(helpful: boolean) {
    setPending(helpful);
    setStatus("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, helpful, note: "" }),
      });
      setStatus(response.ok ? (helpful ? "Thanks: marked helpful." : "Thanks: marked not helpful.") : "Could not record your feedback.");
    } catch {
      setStatus("Could not record your feedback.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-label="Report feedback" className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
      <h2 className="text-label font-medium text-text-primary">Would this have helped when the original author left?</h2>
      <div className="mt-lg flex flex-wrap items-center gap-sm">
        <Button type="button" variant="outline" disabled={pending !== null} onClick={() => void submit(true)}>
          {pending === true ? <PendingDot /> : null}
          Yes
        </Button>
        <Button type="button" variant="outline" disabled={pending !== null} onClick={() => void submit(false)}>
          {pending === false ? <PendingDot /> : null}
          No
        </Button>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {status}
        </span>
        {status && <p className="text-label-sm text-text-secondary">{status}</p>}
      </div>
    </section>
  );
}

function PendingDot() {
  return <span aria-hidden="true" className="ui-spinner inline-block size-4 rounded-full border-2 border-current border-t-transparent" />;
}
