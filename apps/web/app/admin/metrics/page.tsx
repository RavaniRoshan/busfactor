import { readFile } from "node:fs/promises";
import path from "node:path";
import { store, type ScanJob } from "@/lib/store";
import { summarizeFeedback, summarizeJobs } from "@/lib/ops-summary";
import { Badge } from "@/components/ui/badge";

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown[];
  } catch {
    return [];
  }
}

export const metadata = { robots: { index: false, follow: false } };

function Kpi({ label, value, unit, note }: { label: string; value: string | number; unit: string; note?: string }) {
  return (
    <div className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
      <p className="text-label-sm text-text-secondary">{label}</p>
      <p className="mt-sm flex items-baseline gap-sm">
        <span className="font-mono type-display tabular-nums text-text-primary">{value}</span>
        <span className="text-label-sm text-text-secondary">{unit}</span>
      </p>
      {note && <p className="mt-sm text-label-sm text-text-secondary">{note}</p>}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
      <h2 id={id} className="text-label font-medium text-text-primary">{title}</h2>
      <div className="mt-lg">{children}</div>
    </section>
  );
}

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

  const [waitlist, feedback, jobs, reportCount] = await Promise.all([
    readJsonArray(path.join(process.cwd(), "data", "waitlist.json")),
    readJsonArray(path.join(process.cwd(), "data", "feedback.json")),
    store.jobs.values(),
    store.reports.count(),
  ]);

  const health = summarizeJobs(jobs as ScanJob[]);
  const validation = summarizeFeedback(feedback as Array<{ helpful?: unknown }>);
  const action =
    health.failed > 0
      ? "Review the failed scan IDs below before inviting new users."
      : validation.answered === 0
        ? "No feedback yet — ask the first five scanned users if the report helped."
        : "No action from this data. Keep watching the fail rate and feedback.";

  const statuses = [
    { label: "Completed", value: health.complete, variant: "success" as const },
    { label: "Failed", value: health.failed, variant: "danger" as const },
    { label: "Running", value: health.running, variant: "warning" as const },
  ];

  return (
    <main className="min-h-screen bg-brand-tertiary px-xl py-4xl text-text-primary md:px-2xl">
      <div className="mx-auto w-full max-w-page">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="type-display">BusFactor operations</h1>
            <p className="mt-sm text-label-sm text-text-secondary">
              Scans, reports and validation signal. All numbers come from the live store and local data files.
            </p>
          </div>
          <Badge variant="warning">Internal · noindex</Badge>
        </div>

        <div className="mt-3xl grid gap-xl sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Scans" value={health.total} unit="jobs" />
          <Kpi label="Reports" value={reportCount} unit="reports" />
          <Kpi
            label="Fail rate"
            value={`${health.failRate}%`}
            unit={`of ${health.total} scans`}
            note="Provisional alert threshold: 5%"
          />
          <Kpi label="Waitlist" value={waitlist.length} unit="emails" note="Email addresses are never displayed" />
        </div>

        <div className="mt-xl grid gap-xl lg:grid-cols-2">
          <Section id="ops-health" title="Is it working? — job status (count)">
            <ul className="flex flex-col gap-lg">
              {statuses.map((status) => (
                <li key={status.label} className="flex items-center justify-between gap-lg">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="font-mono tabular-nums">{status.value}</span>
                </li>
              ))}
            </ul>
            {health.total > 0 && (
              <div className="mt-xl flex h-xs w-full overflow-hidden rounded-corner-full bg-bg-subtle" aria-hidden="true">
                {statuses.map((status) => (
                  <span
                    key={status.label}
                    className={`block h-full ${status.variant === "success" ? "bg-success" : status.variant === "danger" ? "bg-danger" : "bg-warning"}`}
                    style={{ width: `${(status.value / health.total) * 100}%` }}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section id="ops-validation" title="Is it helping? — feedback (count)">
            <ul className="flex flex-col gap-lg">
              <li className="flex items-center justify-between gap-lg">
                <span className="text-label-sm text-text-secondary">Would have helped · Yes</span>
                <span className="font-mono tabular-nums">{validation.yes}</span>
              </li>
              <li className="flex items-center justify-between gap-lg">
                <span className="text-label-sm text-text-secondary">Would have helped · No</span>
                <span className="font-mono tabular-nums">{validation.no}</span>
              </li>
              <li className="flex items-center justify-between gap-lg">
                <span className="text-label-sm text-text-secondary">Explicit answers</span>
                <span className="font-mono tabular-nums">{validation.answered}</span>
              </li>
            </ul>
            {validation.answered === 0 && (
              <p className="mt-lg text-label-sm text-text-secondary">No explicit answers recorded yet.</p>
            )}
          </Section>
        </div>

        <div className="mt-xl grid gap-xl">
          <Section id="ops-jobs" title="Where does it fail? — recent jobs (newest first)">
            {jobs.length === 0 ? (
              <p className="text-label-sm text-text-secondary">No scans recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-label-sm">
                  <thead>
                    <tr className="border-b border-border-secondary text-text-secondary">
                      <th className="py-sm pr-lg">Job ID</th>
                      <th className="py-sm pr-lg">Status</th>
                      <th className="py-sm">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.slice(0, 20).map((job) => (
                      <tr key={job.id} className="border-b border-border-secondary last:border-0">
                        <td className="py-sm pr-lg font-mono text-xs">{job.id}</td>
                        <td className="py-sm pr-lg">{job.status}</td>
                        <td className="py-sm font-mono text-xs">{job.slug ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-lg text-label-sm text-text-secondary">
              Error messages are omitted — scan output is untrusted and may contain secrets.
            </p>
          </Section>

          <Section id="ops-action" title="What should I do?">
            <p className="text-label text-text-primary">{action}</p>
          </Section>
        </div>
      </div>
    </main>
  );
}
