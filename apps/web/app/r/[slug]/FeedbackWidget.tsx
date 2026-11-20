"use client";

import { useState } from "react";

export default function FeedbackWidget({ slug }: { slug: string }) {
  const [status, setStatus] = useState("");

  async function submit(helpful: boolean) {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, helpful, note: "" }),
    });
    setStatus(helpful ? "Thanks: marked helpful." : "Thanks: marked not helpful.");
  }

  return (
    <section>
      <p>Would this have helped when the original author left?</p>
      <button onClick={() => void submit(true)}>Yes</button>{" "}
      <button onClick={() => void submit(false)}>No</button>
      {status && <p>{status}</p>}
    </section>
  );
}
