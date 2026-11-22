import type { ScanJob } from "./scan-jobs";

export interface AnalyticsSummary {
  available: boolean;
  visitors: number | null;
  landingVisitors: number | null;
  scannerCtaClicks: number | null;
  scanPageViews: number | null;
  reportViews: number | null;
  reportDownloads: number | null;
  reportsShared: number | null;
  feedbackSubmitted: number | null;
  qualifiedScans7d: number | null;
  campaigns: Array<{ campaign: string; visitors: number }>;
  sources: Array<{ source: string; visitors: number }>;
}

export interface DashboardMetricsInput {
  jobs: ScanJob[];
  costs: { totalUsd: number; averageUsd: number | null; medianUsd: number | null };
  waitlist: number;
  feedback: { yes: number; no: number; answered: number };
  reports: number;
  spendTodayUsd: number;
  analytics: AnalyticsSummary | null;
  databaseHealth?: "ok" | "memory" | "error";
  spendCapUsd?: number;
}

export interface DashboardMetrics {
  business: {
    totalScans: number;
    successfulScans: number;
    reports: number;
    waitlist: number;
    feedbackAnswers: number;
    payingCustomers: null;
    mrrUsd: null;
  };
  acquisition: {
    available: boolean;
    visitors: number | null;
    landingVisitors: number | null;
    scannerCtaClicks: number | null;
    scanPageViews: number | null;
    landingConversionPct: number | null;
    campaigns: AnalyticsSummary["campaigns"];
    sources: AnalyticsSummary["sources"];
  };
  engagement: {
    scanStarts: number;
    successes: number;
    failures: number;
    completionRatePct: number;
    reportViews: number | null;
    reportDownloads: number | null;
    reportsShared: number | null;
    feedbackSubmitted: number | null;
    positiveFeedbackRate: number | null;
    repeatScanRate: number | null;
    qualifiedScans7d: number | null;
  };
  operations: {
    successRatePct: number;
    failureRatePct: number;
    medianDurationMs: number | null;
    p95DurationMs: number | null;
    runningJobs: number;
    failedJobs: number;
    cacheHitRatePct: number;
    databaseHealth: "ok" | "memory" | "error";
    providerErrors: number;
    spendTodayUsd: number;
    spendCapUsd: number;
    spendPct: number;
  };
  revenue: { enabled: false; mrrUsd: null; arrUsd: null; activeSubscriptions: null };
  unitEconomics: {
    totalLlmCostUsd: number;
    averageCostPerAttemptUsd: number | null;
    medianCostPerAttemptUsd: number | null;
    costPerSuccessfulScanUsd: number | null;
    notTracked: string[];
  };
}

function roundPct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function roundPctZero(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1];
  const b = sorted[mid];
  if (a === undefined || b === undefined) return null;
  return (a + b) / 2;
}

function percentileNearestRank(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.max(0, Math.ceil(p * sorted.length) - 1);
  return sorted[index] ?? null;
}

export function dashboardRange(searchParams: { days?: string }): 7 | 30 | 90 {
  if (searchParams.days === "7" || searchParams.days === "30" || searchParams.days === "90") {
    return Number(searchParams.days) as 7 | 30 | 90;
  }
  return 30;
}

export function buildDashboardMetrics(input: DashboardMetricsInput): DashboardMetrics {
  const totalScans = input.jobs.length;
  const successes = input.jobs.filter((job) => job.status === "complete").length;
  const failures = input.jobs.filter((job) => job.status === "failed").length;
  const runningJobs = input.jobs.filter((job) => job.status === "running").length;
  const durations = input.jobs
    .filter((job) => typeof job.durationMs === "number")
    .map((job) => job.durationMs as number)
    .sort((a, b) => a - b);
  const cacheHits = input.jobs.filter((job) => job.status === "complete" && job.cacheHit).length;
  const providerErrors = input.jobs.filter(
    (job) => job.errorCategory === "provider_error" || job.errorCategory === "provider_rate_limited"
  ).length;

  const completionRatePct = roundPctZero(successes, totalScans);
  const successRatePct = roundPctZero(successes, totalScans);
  const failureRatePct = roundPctZero(failures, totalScans);
  const cacheHitRatePct = roundPctZero(cacheHits, successes);

  const analytics = input.analytics;
  const analyticsAvailable = analytics?.available === true;
  const landingVisitors = analyticsAvailable ? analytics.landingVisitors : null;
  const scanPageViews = analyticsAvailable ? analytics.scanPageViews : null;
  const landingConversionPct =
    landingVisitors !== null && scanPageViews !== null ? roundPct(scanPageViews, landingVisitors) : null;

  const positiveFeedbackRate = roundPct(input.feedback.yes, input.feedback.answered);
  const costPerSuccessfulScanUsd = successes > 0 ? input.costs.totalUsd / successes : null;

  const spendCapUsd = input.spendCapUsd ?? 0;
  const databaseHealth = input.databaseHealth ?? "memory";
  const spendPct =
    spendCapUsd > 0 ? Math.round((input.spendTodayUsd / spendCapUsd) * 100) : 0;

  return {
    business: {
      totalScans,
      successfulScans: successes,
      reports: input.reports,
      waitlist: input.waitlist,
      feedbackAnswers: input.feedback.answered,
      payingCustomers: null,
      mrrUsd: null,
    },
    acquisition: {
      available: analyticsAvailable,
      visitors: analyticsAvailable ? analytics.visitors : null,
      landingVisitors,
      scannerCtaClicks: analyticsAvailable ? analytics.scannerCtaClicks : null,
      scanPageViews,
      landingConversionPct,
      campaigns: analyticsAvailable ? analytics.campaigns : [],
      sources: analyticsAvailable ? analytics.sources : [],
    },
    engagement: {
      scanStarts: totalScans,
      successes,
      failures,
      completionRatePct,
      reportViews: analyticsAvailable ? analytics.reportViews : null,
      reportDownloads: analyticsAvailable ? analytics.reportDownloads : null,
      reportsShared: analyticsAvailable ? analytics.reportsShared : null,
      feedbackSubmitted: analyticsAvailable ? analytics.feedbackSubmitted : null,
      positiveFeedbackRate,
      repeatScanRate: null,
      qualifiedScans7d: analyticsAvailable ? analytics.qualifiedScans7d : null,
    },
    operations: {
      successRatePct,
      failureRatePct,
      medianDurationMs: median(durations),
      p95DurationMs: percentileNearestRank(durations, 0.95),
      runningJobs,
      failedJobs: failures,
      cacheHitRatePct,
      databaseHealth,
      providerErrors,
      spendTodayUsd: input.spendTodayUsd,
      spendCapUsd,
      spendPct,
    },
    revenue: {
      enabled: false,
      mrrUsd: null,
      arrUsd: null,
      activeSubscriptions: null,
    },
    unitEconomics: {
      totalLlmCostUsd: input.costs.totalUsd,
      averageCostPerAttemptUsd: input.costs.averageUsd,
      medianCostPerAttemptUsd: input.costs.medianUsd,
      costPerSuccessfulScanUsd,
      notTracked: ["hosting", "database", "payment processing"],
    },
  };
}
