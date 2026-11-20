import { readFile } from "node:fs/promises";
import path from "node:path";

import { jobs, reports } from "@/lib/store";

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown[];
  } catch {
    return [];
  }
}

export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (token !== process.env.BUSFACTOR_ADMIN_TOKEN || !process.env.BUSFACTOR_ADMIN_TOKEN) {
    return (
      <main>
        <h1>Unauthorized</h1>
      </main>
    );
  }

  const waitlist = await readJsonArray(path.join(process.cwd(), "data", "waitlist.json"));
  const feedback = await readJsonArray(path.join(process.cwd(), "data", "feedback.json"));

  return (
    <main>
      <h1>BusFactor metrics</h1>
      <ul>
        <li>Jobs: {jobs.size}</li>
        <li>Reports: {reports.size}</li>
        <li>Waitlist emails: {waitlist.length}</li>
        <li>Feedback entries: {feedback.length}</li>
      </ul>
    </main>
  );
}
