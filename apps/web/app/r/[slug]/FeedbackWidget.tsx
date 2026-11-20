"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function FeedbackWidget({ slug }: { slug: string }) {
  const [status, setStatus] = React.useState("");

  async function submit(helpful: boolean) {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, helpful, note: "" }),
      });
      setStatus(helpful ? "Thanks: marked helpful." : "Thanks: marked not helpful.");
    } catch {
      setStatus("Could not record your feedback.");
    }
  }

  return (
    <section aria-label="Report feedback" className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
      <h2 className="text-label font-medium text-text-primary">Would this have helped when the original author left?</h2>
      <div className="mt-lg flex flex-wrap items-center gap-sm">
        <Button type="button" variant="outline" onClick={() => void submit(true)}>
          Yes
        </Button>
        <Button type="button" variant="outline" onClick={() => void submit(false)}>
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
