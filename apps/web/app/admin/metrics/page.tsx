import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin-auth";
import { hasDatabase, getPool } from "@/lib/db";
import { buildDashboardMetrics, dashboardRange, type DashboardMetrics } from "@/lib/metrics";
import { getAnalyticsSummary } from "@/lib/analytics-events";
import { records } from "@/lib/records";
import { scanJobs } from "@/lib/scan-jobs";
import { spendStore, utcDay } from "@/lib/spend";
import { store } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/animated-number";
import { AdminLogoutButton } from "./logout-button";

export const metadata = { robots: { index: false, follow: false } };

function spendCapUsd(): number {
  const raw = Number(process.env.BUSFACTOR_DAILY_SPEND_CAP_USD ?? "10");
  return Number.isFinite(raw) && raw >= 0 ? raw : 10;
}

async function resolveDatabaseHealth(): Promise<"ok" | "memory" | "error"> {
  if (!hasDatabase()) return "memory";
  try {
    await getPool().query("SELECT 1");
    return "ok";
  } catch {
    return "error";
  }
}

function formatUsd(value: number | null): string {
  if (value === null) return "—";
  return `$${value.toFixed(6)}`;
}

function formatUsdShort(value: number): string {
  return `$${value.toFixed(4)}`;
}

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${value}%`;
}

function Kpi({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string | number;
  unit?: string;
  note?: string;
}) {
  const numeric = typeof value === "number";
  return (
    <div className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
      <p className="text-label-sm text-text-secondary">{label}</p>
      <p className="mt-sm flex items-baseline gap-sm">
        <span className="font-mono type-display text-text-primary">
          {numeric ? <AnimatedNumber value={value} /> : value}
        </span>
        {unit ? <span className="text-label-sm text-text-secondary">{unit}</span> : null}
      </p>
      {note ? <p className="mt-sm text-label-sm text-text-secondary">{note}</p> : null}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
      <h2 id={id} className="text-label font-medium text-text-primary">
        {title}
      </h2>
      <div className="mt-lg">{children}</div>
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-lg border-b border-border-secondary py-sm last:border-0">
      <span className="text-label-sm text-text-secondary">{label}</span>
      <span className="font-mono text-label-sm tabular-nums text-text-primary">{value}</span>
    </li>
  );
}

function RangeSelector({ current }: { current: 7 | 30 | 90 }) {
  const options: Array<7 | 30 | 90> = [7, 30, 90];
  return (
    <nav aria-label="Dashboard range" className="flex items-center gap-sm">
      {options.map((days) => {
        const active = days === current;
        return (
          <Link
            key={days}
            href={`/admin/metrics?days=${days}`}
            className={`rounded-corner-md border px-md py-xs text-label-sm ${
              active
                ? "border-border-primary bg-bg-subtle text-text-primary"
                : "border-border-secondary text-text-secondary hover:text-text-primary"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {days}d
          </Link>
        );
      })}
    </nav>
  );
}

function AcquisitionSection({ metrics }: { metrics: DashboardMetrics }) {
  const a = metrics.acquisition;
  return (
    <Section id="acquisition" title="B. Acquisition">
      {!a.available ? (
        <p className="text-label-sm text-text-secondary">Analytics events are unavailable.</p>
      ) : (
        <>
          <div className="grid gap-xl sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label="Visitors" value={a.visitors ?? "—"} unit={a.visitors === null ? "unavailable" : "people"} />
            <Kpi
              label="Landing visitors"
              value={a.landingVisitors ?? "—"}
              unit={a.landingVisitors === null ? "unavailable" : "people"}
            />
            <Kpi
              label="Scanner CTA clicks"
              value={a.scannerCtaClicks ?? "—"}
              unit={a.scannerCtaClicks === null ? "unavailable" : "clicks"}
            />
            <Kpi
              label="Scan page views"
              value={a.scanPageViews ?? "—"}
              unit={a.scanPageViews === null ? "unavailable" : "views"}
            />
            <Kpi
              label="Landing conversion"
              value={a.landingConversionPct === null ? "—" : `${a.landingConversionPct}%`}
              unit={a.landingConversionPct === null ? "unavailable" : "scan / landing"}
            />
          </div>
          <div className="mt-xl grid gap-xl lg:grid-cols-2">
            <div>
              <h3 className="text-label-sm font-medium text-text-primary">Campaigns</h3>
              {!a.breakdownsAvailable ? (
                <p className="mt-sm text-label-sm text-text-secondary">Unavailable.</p>
              ) : a.campaigns.length === 0 ? (
                <p className="mt-sm text-label-sm text-text-secondary">No data yet.</p>
              ) : (
                <div className="mt-sm overflow-x-auto">
                  <table className="w-full text-left text-label-sm">
                    <thead>
                      <tr className="border-b border-border-secondary text-text-secondary">
                        <th className="py-sm pr-lg">Campaign</th>
                        <th className="py-sm">Visitors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.campaigns.map((row) => (
                        <tr key={row.campaign} className="border-b border-border-secondary last:border-0">
                          <td className="py-sm pr-lg font-mono text-xs">{row.campaign}</td>
                          <td className="py-sm font-mono tabular-nums">{row.visitors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-label-sm font-medium text-text-primary">Sources</h3>
              {!a.breakdownsAvailable ? (
                <p className="mt-sm text-label-sm text-text-secondary">Unavailable.</p>
              ) : a.sources.length === 0 ? (
                <p className="mt-sm text-label-sm text-text-secondary">No data yet.</p>
              ) : (
                <div className="mt-sm overflow-x-auto">
                  <table className="w-full text-left text-label-sm">
                    <thead>
                      <tr className="border-b border-border-secondary text-text-secondary">
                        <th className="py-sm pr-lg">Source</th>
                        <th className="py-sm">Visitors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.sources.map((row) => (
                        <tr key={row.source} className="border-b border-border-secondary last:border-0">
                          <td className="py-sm pr-lg font-mono text-xs">{row.source}</td>
                          <td className="py-sm font-mono tabular-nums">{row.visitors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <p className="mt-lg text-label-sm text-text-secondary">
            First-party events stored in Neon. Consent-gated; visitors who declined are not represented.
          </p>
        </>
      )}
    </Section>
  );
}

export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  if (!(await isAdminRequest())) {
    redirect("/admin/login");
  }

  const sp = await searchParams;
  const days = dashboardRange(sp);
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

  const [waitlistCount, feedback, jobs, reportCount, costSummary, spendTodayUsd, analytics, dbHealth] =
    await Promise.all([
      records.countWaitlist(),
      records.feedbackSummary(),
      scanJobs.list(500),
      store.reports.count(),
      scanJobs.costSummary(days),
      spendStore.get(utcDay()),
      getAnalyticsSummary(days),
      resolveDatabaseHealth(),
    ]);

  const filteredJobs = jobs.filter((job) => Date.parse(job.createdAt) >= sinceMs);

  const metrics = buildDashboardMetrics({
    jobs: filteredJobs,
    costs: {
      totalUsd: costSummary.totalUsd,
      averageUsd: costSummary.averageUsd === 0 && filteredJobs.length === 0 ? null : costSummary.averageUsd,
      medianUsd: costSummary.medianUsd === 0 && filteredJobs.length === 0 ? null : costSummary.medianUsd,
    },
    waitlist: waitlistCount,
    feedback,
    reports: reportCount,
    spendTodayUsd,
    analytics,
    databaseHealth: dbHealth,
    spendCapUsd: spendCapUsd(),
  });

  return (
    <main className="min-h-screen bg-brand-tertiary px-xl py-4xl text-text-primary md:px-2xl">
      <div className="mx-auto w-full max-w-page">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="type-display">BusFactor KPI dashboard</h1>
            <p className="mt-sm text-label-sm text-text-secondary">
              Real data only. Range-scoped cards show the last {days} days; lifetime and current-day cards are labeled explicitly. No customer emails are displayed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-md">
            <RangeSelector current={days} />
            <Badge variant="warning">Internal · noindex</Badge>
            <AdminLogoutButton />
          </div>
        </div>

        <div className="mt-3xl grid gap-xl">
          <Section id="business-overview" title="A. Business overview">
            <div className="grid gap-xl sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Total scans" value={metrics.business.totalScans} unit={`scans · last ${days} days`} />
              <Kpi
                label="Successful scans"
                value={metrics.business.successfulScans}
                unit={`scans · last ${days} days`}
              />
              <Kpi label="Reports" value={metrics.business.reports} unit="reports · all time" />
              <Kpi label="Waitlist" value={metrics.business.waitlist} unit="signups · all time" />
              <Kpi label="Feedback answers" value={metrics.business.feedbackAnswers} unit="answers · all time" />
              <Kpi label="Paying customers" value="Not enabled" note="Billing is not enabled in this build." />
              <Kpi label="MRR" value="Not enabled" note="Billing is not enabled in this build." />
            </div>

            <div className="mt-xl">
              <h3 className="text-label-sm font-medium text-text-primary">Recent anonymous visitors</h3>
              {metrics.business.recentVisitors.length === 0 ? (
                <p className="mt-sm text-label-sm text-text-secondary">No data yet.</p>
              ) : (
                <div className="mt-sm overflow-x-auto">
                  <table className="w-full text-left text-label-sm">
                    <thead>
                      <tr className="border-b border-border-secondary text-text-secondary">
                        <th className="py-sm pr-lg">Visitor</th>
                        <th className="py-sm pr-lg">First seen</th>
                        <th className="py-sm pr-lg">Last seen</th>
                        <th className="py-sm pr-lg">Events</th>
                        <th className="py-sm">Scans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.business.recentVisitors.map((visitor) => (
                        <tr key={visitor.distinctId} className="border-b border-border-secondary last:border-0">
                          <td className="py-sm pr-lg font-mono text-xs">{visitor.distinctId.slice(0, 8)}</td>
                          <td className="py-sm pr-lg font-mono text-xs">{visitor.firstSeen.slice(0, 16).replace("T", " ")}</td>
                          <td className="py-sm pr-lg font-mono text-xs">{visitor.lastSeen.slice(0, 16).replace("T", " ")}</td>
                          <td className="py-sm pr-lg font-mono tabular-nums">{visitor.events}</td>
                          <td className="py-sm font-mono tabular-nums">{visitor.scans}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-sm text-label-sm text-text-secondary">
                Anonymous IDs until accounts are introduced. Analytics events are stored in Neon and can be deleted by
                visitor ID through the admin deletion endpoint.
              </p>
            </div>
          </Section>

          <AcquisitionSection metrics={metrics} />

          <Section id="activation-engagement" title="C. Activation and engagement">
            <div className="grid gap-xl sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Scan starts" value={metrics.engagement.scanStarts} unit={`jobs · last ${days} days`} />
              <Kpi label="Successes" value={metrics.engagement.successes} unit={`jobs · last ${days} days`} />
              <Kpi label="Failures" value={metrics.engagement.failures} unit={`jobs · last ${days} days`} />
              <Kpi
                label="Completion rate"
                value={`${metrics.engagement.completionRatePct}%`}
                unit={`complete · last ${days} days`}
              />
              <Kpi
                label="Report views"
                value={metrics.engagement.reportViews ?? "—"}
                unit={metrics.acquisition.available ? `views · last ${days} days` : "not configured"}
              />
              <Kpi
                label="Report downloads"
                value={metrics.engagement.reportDownloads ?? "—"}
                unit={metrics.acquisition.available ? `downloads · last ${days} days` : "not configured"}
              />
              <Kpi
                label="Reports shared"
                value={metrics.engagement.reportsShared ?? "—"}
                unit={metrics.acquisition.available ? `shares · last ${days} days` : "not configured"}
              />
              <Kpi
                label="Feedback submitted"
                value={metrics.engagement.feedbackSubmitted ?? "—"}
                unit={metrics.acquisition.available ? `events · last ${days} days` : "not configured"}
              />
              <Kpi
                label="Positive feedback"
                value={pct(metrics.engagement.positiveFeedbackRate)}
                unit="of explicit answers · all time"
              />
              <Kpi
                label="Repeat scan rate"
                value={pct(metrics.engagement.repeatScanRate)}
                unit="not available"
              />
              <Kpi
                label="Qualified scans (7d)"
                value={metrics.engagement.qualifiedScans7d ?? "—"}
                unit={`North Star · last ${days} days`}
                note="Scan succeeded + download/share/feedback within 7 days."
              />
            </div>
          </Section>

          <Section id="operational-health" title="D. Operational health">
            <div className="grid gap-xl sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Success rate" value={`${metrics.operations.successRatePct}%`} unit={`of jobs · last ${days} days`} />
              <Kpi label="Failure rate" value={`${metrics.operations.failureRatePct}%`} unit={`of jobs · last ${days} days`} />
              <Kpi
                label="Median duration"
                value={metrics.operations.medianDurationMs === null ? "—" : Math.round(metrics.operations.medianDurationMs / 1000)}
                unit={metrics.operations.medianDurationMs === null ? "no data" : `seconds · last ${days} days`}
              />
              <Kpi
                label="P95 duration"
                value={metrics.operations.p95DurationMs === null ? "—" : Math.round(metrics.operations.p95DurationMs / 1000)}
                unit={metrics.operations.p95DurationMs === null ? "no data" : `seconds · last ${days} days`}
              />
              <Kpi label="Running jobs" value={metrics.operations.runningJobs} unit={`jobs · last ${days} days`} />
              <Kpi label="Failed jobs" value={metrics.operations.failedJobs} unit={`jobs · last ${days} days`} />
              <Kpi
                label="Cache hit rate"
                value={`${metrics.operations.cacheHitRatePct}%`}
                unit={`of complete · last ${days} days`}
              />
              <Kpi label="Database health" value={metrics.operations.databaseHealth} unit="status · current" />
              <Kpi label="Provider errors" value={metrics.operations.providerErrors} unit={`jobs · last ${days} days`} />
              <Kpi label="Spend today" value={formatUsdShort(metrics.operations.spendTodayUsd)} unit="USD · today" />
              <Kpi label="Spend cap" value={formatUsdShort(metrics.operations.spendCapUsd)} unit="USD/day · current" />
              <Kpi label="Spend used" value={`${metrics.operations.spendPct}%`} unit="of cap · today" />
            </div>
          </Section>

          <Section id="revenue" title="E. Revenue">
            <p className="text-label text-text-primary">
              Billing is not enabled in this build; no revenue data exists.
            </p>
          </Section>

          <Section id="unit-economics" title="F. Unit economics">
            <div className="grid gap-xl sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label="Total LLM cost"
                value={formatUsd(metrics.unitEconomics.totalLlmCostUsd)}
                unit={`USD · last ${days} days`}
              />
              <Kpi
                label="Avg cost / attempt"
                value={formatUsd(metrics.unitEconomics.averageCostPerAttemptUsd)}
                unit={`USD · last ${days} days`}
              />
              <Kpi
                label="Median cost / attempt"
                value={formatUsd(metrics.unitEconomics.medianCostPerAttemptUsd)}
                unit={`USD · last ${days} days`}
              />
              <Kpi
                label="Cost / successful scan"
                value={formatUsd(metrics.unitEconomics.costPerSuccessfulScanUsd)}
                unit={`USD · last ${days} days`}
              />
            </div>
            <ul className="mt-xl">
              {metrics.unitEconomics.notTracked.map((item) => (
                <StatRow key={item} label={item} value="Not tracked" />
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </main>
  );
}
