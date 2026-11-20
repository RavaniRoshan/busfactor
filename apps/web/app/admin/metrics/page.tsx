import { readFile } from "node:fs/promises";
import path from "node:path";
import { store } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown[];
  } catch {
    return [];
  }
}

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (token !== process.env.BUSFACTOR_ADMIN_TOKEN || !process.env.BUSFACTOR_ADMIN_TOKEN) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-tertiary p-xl text-text-primary">
        <div className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-2xl text-center">
          <h1 className="type-display">Unauthorized</h1>
        </div>
      </main>
    );
  }

  const [waitlist, feedback, jobCount, reportCount] = await Promise.all([
    readJsonArray(path.join(process.cwd(), "data", "waitlist.json")),
    readJsonArray(path.join(process.cwd(), "data", "feedback.json")),
    store.jobs.count(),
    store.reports.count(),
  ]);
  const metrics = [
    { label: "Jobs", value: jobCount },
    { label: "Reports", value: reportCount },
    { label: "Waitlist emails", value: waitlist.length },
    { label: "Feedback entries", value: feedback.length },
  ];

  return (
    <main className="min-h-screen bg-brand-tertiary px-xl py-4xl text-text-primary md:px-2xl">
      <div className="mx-auto w-full max-w-article">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h1 className="type-display">BusFactor metrics</h1>
          <Badge variant="warning">Internal</Badge>
        </div>
        <dl className="mt-3xl grid gap-xl sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
              <dt className="text-label-sm text-text-secondary">{metric.label}</dt>
              <dd className="mt-sm font-mono type-display tabular-nums text-text-primary">{metric.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
