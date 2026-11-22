import type { AnalyticsSummary } from "./metrics";

type HogQLResponse = {
  results?: unknown[][];
};

const VALID_DAYS = new Set([7, 30, 90]);

export function unavailableAnalytics(): AnalyticsSummary {
  return {
    available: false,
    visitors: null,
    landingVisitors: null,
    scannerCtaClicks: null,
    scanPageViews: null,
    reportViews: null,
    reportDownloads: null,
    reportsShared: null,
    feedbackSubmitted: null,
    qualifiedScans7d: null,
    breakdownsAvailable: false,
    campaigns: [],
    sources: [],
  };
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function normalizeDays(days: number): 7 | 30 | 90 | null {
  return VALID_DAYS.has(days) ? (days as 7 | 30 | 90) : null;
}

function posthogConfig(): { apiKey: string; projectId: string; host: string } | null {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!apiKey || !projectId) return null;
  const host = (process.env.POSTHOG_API_HOST?.trim() || "https://us.posthog.com").replace(/\/+$/, "");
  return { apiKey, projectId, host };
}

async function hogqlQuery<T>(
  config: { apiKey: string; projectId: string; host: string },
  query: string
): Promise<T[] | null> {
  try {
    const response = await fetch(`${config.host}/api/projects/${config.projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as HogQLResponse;
    if (!body || !Array.isArray(body.results)) return null;
    return body.results as T[];
  } catch {
    return null;
  }
}

function parseSummaryRow(
  row: unknown[] | undefined
): Omit<AnalyticsSummary, "available" | "campaigns" | "sources" | "qualifiedScans7d" | "breakdownsAvailable"> | null {
  if (!row) return null;
  const [
    visitors,
    landingVisitors,
    scannerCtaClicks,
    scanPageViews,
    reportViews,
    reportDownloads,
    reportsShared,
    feedbackSubmitted,
  ] = row;
  return {
    visitors: asNumber(visitors),
    landingVisitors: asNumber(landingVisitors),
    scannerCtaClicks: asNumber(scannerCtaClicks),
    scanPageViews: asNumber(scanPageViews),
    reportViews: asNumber(reportViews),
    reportDownloads: asNumber(reportDownloads),
    reportsShared: asNumber(reportsShared),
    feedbackSubmitted: asNumber(feedbackSubmitted),
  };
}

function parseBreakdown(rows: unknown[][] | null, key: "campaign" | "source"): Array<{ campaign: string; visitors: number } | { source: string; visitors: number }> {
  if (!rows) return [];
  const parsed: Array<{ campaign: string; visitors: number } | { source: string; visitors: number }> = [];
  for (const row of rows) {
    const label = row[0];
    const visitors = asNumber(row[1]);
    if (typeof label !== "string" || visitors === null) continue;
    if (key === "campaign") parsed.push({ campaign: label, visitors });
    else parsed.push({ source: label, visitors });
  }
  return parsed;
}

export async function getAnalyticsSummary(days: number): Promise<AnalyticsSummary> {
  const normalizedDays = normalizeDays(days);
  const config = posthogConfig();
  if (!normalizedDays || !config) return unavailableAnalytics();

  const summaryQuery = `
SELECT
  uniq(distinct_id) AS visitors,
  uniqIf(distinct_id, event = 'landing_viewed') AS landing_visitors,
  countIf(event = 'scanner_cta_clicked') AS scanner_cta_clicks,
  countIf(event = 'scan_page_viewed') AS scan_page_views,
  countIf(event = 'report_viewed') AS report_views,
  countIf(event = 'report_downloaded') AS report_downloads,
  countIf(event = 'report_shared') AS reports_shared,
  countIf(event = 'feedback_submitted') AS feedback_submitted
FROM events
WHERE timestamp >= now() - INTERVAL ${normalizedDays} DAY
`.trim();

  const campaignQuery = `
SELECT properties.campaign AS campaign, uniq(distinct_id) AS visitors
FROM events
WHERE event = 'landing_viewed' AND properties.campaign IS NOT NULL
GROUP BY campaign
ORDER BY visitors DESC
LIMIT 10
`.trim();

  const sourceQuery = `
SELECT properties.source AS source, uniq(distinct_id) AS visitors
FROM events
WHERE event = 'landing_viewed' AND properties.source IS NOT NULL
GROUP BY source
ORDER BY visitors DESC
LIMIT 10
`.trim();

  const qualifiedQuery = `
SELECT count(DISTINCT s.distinct_id) AS qualified_scans_7d
FROM (
  SELECT distinct_id, min(timestamp) AS scan_ts
  FROM events
  WHERE event = 'scan_succeeded' AND timestamp >= now() - INTERVAL ${normalizedDays} DAY
  GROUP BY distinct_id
) s
JOIN (
  SELECT distinct_id, timestamp
  FROM events
  WHERE event IN ('report_downloaded', 'report_shared', 'feedback_submitted')
    AND timestamp >= now() - INTERVAL ${normalizedDays} DAY
) a ON s.distinct_id = a.distinct_id
WHERE a.timestamp >= s.scan_ts AND a.timestamp <= s.scan_ts + INTERVAL 7 DAY
`.trim();

  const [summaryRows, campaignRows, sourceRows, qualifiedRows] = await Promise.all([
    hogqlQuery<unknown[]>(config, summaryQuery),
    hogqlQuery<unknown[]>(config, campaignQuery),
    hogqlQuery<unknown[]>(config, sourceQuery),
    hogqlQuery<unknown[]>(config, qualifiedQuery),
  ]);

  const summary = parseSummaryRow(summaryRows?.[0]);
  if (!summaryRows || !summary) return unavailableAnalytics();

  const breakdownsAvailable = campaignRows !== null && sourceRows !== null;
  const campaigns = breakdownsAvailable
    ? (parseBreakdown(campaignRows, "campaign") as Array<{ campaign: string; visitors: number }>)
    : [];
  const sources = breakdownsAvailable
    ? (parseBreakdown(sourceRows, "source") as Array<{ source: string; visitors: number }>)
    : [];

  let qualifiedScans7d: number | null = null;
  if (qualifiedRows && qualifiedRows[0]) {
    qualifiedScans7d = asNumber(qualifiedRows[0][0]);
  }

  return {
    available: true,
    ...summary,
    qualifiedScans7d,
    breakdownsAvailable,
    campaigns,
    sources,
  };
}
