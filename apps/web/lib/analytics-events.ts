import { ensureSchema, getPool, hasDatabase } from "./db";
import type { AnalyticsSummary, AnalyticsVisitor } from "./metrics";
import type { NormalizedAnalyticsEvent } from "./analytics-schema";

interface StoredAnalyticsEvent extends NormalizedAnalyticsEvent {
  occurredAt: string;
}

interface AnalyticsStore {
  record(event: NormalizedAnalyticsEvent): Promise<void>;
  summary(days: number): Promise<AnalyticsSummary>;
  deleteByDistinctId(distinctId: string): Promise<number>;
}

type GlobalAnalytics = typeof globalThis & {
  __busfactorAnalyticsEvents?: StoredAnalyticsEvent[];
};

function memoryEvents(): StoredAnalyticsEvent[] {
  const globalStore = globalThis as GlobalAnalytics;
  if (!globalStore.__busfactorAnalyticsEvents) globalStore.__busfactorAnalyticsEvents = [];
  return globalStore.__busfactorAnalyticsEvents;
}

function cutoff(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function uniqueCount(events: StoredAnalyticsEvent[], predicate: (event: StoredAnalyticsEvent) => boolean): number {
  return new Set(events.filter(predicate).map((event) => event.distinctId)).size;
}

function count(events: StoredAnalyticsEvent[], predicate: (event: StoredAnalyticsEvent) => boolean): number {
  return events.filter(predicate).length;
}

function breakdown(
  events: StoredAnalyticsEvent[],
  key: "campaign" | "source"
): Array<{ campaign: string; visitors: number } | { source: string; visitors: number }> {
  const groups = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.event !== "landing_viewed" || event.surface !== "marketing") continue;
    const value = event.properties[key];
    if (typeof value !== "string" || value === "") continue;
    const ids = groups.get(value) ?? new Set<string>();
    ids.add(event.distinctId);
    groups.set(value, ids);
  }
  return [...groups.entries()]
    .map(([label, ids]) =>
      key === "campaign" ? { campaign: label, visitors: ids.size } : { source: label, visitors: ids.size }
    )
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10) as Array<{ campaign: string; visitors: number } | { source: string; visitors: number }>;
}

function qualifiedScans(events: StoredAnalyticsEvent[]): number {
  const scans = new Map<string, number>();
  const actions = new Map<string, number[]>();
  for (const event of events) {
    if (event.surface !== "product") continue;
    const time = Date.parse(event.occurredAt);
    if (event.event === "scan_succeeded") {
      const current = scans.get(event.distinctId);
      if (current === undefined || time < current) scans.set(event.distinctId, time);
    } else if (
      event.event === "report_downloaded" ||
      event.event === "report_shared" ||
      event.event === "feedback_submitted"
    ) {
      const list = actions.get(event.distinctId) ?? [];
      list.push(time);
      actions.set(event.distinctId, list);
    }
  }
  let qualified = 0;
  for (const [distinctId, scanTime] of scans) {
    const engagement = actions.get(distinctId) ?? [];
    if (engagement.some((time) => time >= scanTime && time <= scanTime + 7 * 24 * 60 * 60 * 1000)) {
      qualified += 1;
    }
  }
  return qualified;
}

function recentVisitors(events: StoredAnalyticsEvent[]): AnalyticsVisitor[] {
  const groups = new Map<string, { first: number; last: number; events: number; scans: number }>();
  for (const event of events) {
    const time = Date.parse(event.occurredAt);
    const group = groups.get(event.distinctId) ?? { first: time, last: time, events: 0, scans: 0 };
    group.first = Math.min(group.first, time);
    group.last = Math.max(group.last, time);
    group.events += 1;
    if (event.event === "scan_succeeded") group.scans += 1;
    groups.set(event.distinctId, group);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].last - a[1].last)
    .slice(0, 20)
    .map(([distinctId, group]) => ({
      distinctId,
      firstSeen: new Date(group.first).toISOString(),
      lastSeen: new Date(group.last).toISOString(),
      events: group.events,
      scans: group.scans,
    }));
}

function memorySummary(days: number): AnalyticsSummary {
  const since = cutoff(days);
  const events = memoryEvents().filter((event) => Date.parse(event.occurredAt) >= since);
  return {
    available: true,
    visitors: uniqueCount(events, () => true),
    landingVisitors: uniqueCount(
      events,
      (event) => event.event === "landing_viewed" && event.surface === "marketing"
    ),
    scannerCtaClicks: count(
      events,
      (event) => event.event === "scanner_cta_clicked" && event.surface === "marketing"
    ),
    scanPageViews: count(events, (event) => event.event === "scan_page_viewed" && event.surface === "product"),
    reportViews: count(events, (event) => event.event === "report_viewed" && event.surface === "product"),
    reportDownloads: count(
      events,
      (event) => event.event === "report_downloaded" && event.surface === "product"
    ),
    reportsShared: count(events, (event) => event.event === "report_shared" && event.surface === "product"),
    feedbackSubmitted: count(
      events,
      (event) => event.event === "feedback_submitted" && event.surface === "product"
    ),
    qualifiedScans7d: qualifiedScans(events),
    breakdownsAvailable: true,
    campaigns: breakdown(events, "campaign") as Array<{ campaign: string; visitors: number }>,
    sources: breakdown(events, "source") as Array<{ source: string; visitors: number }>,
    recentVisitors: recentVisitors(events),
  };
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function unavailable(): AnalyticsSummary {
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
    recentVisitors: [],
  };
}

function createPostgresStore(): AnalyticsStore {
  return {
    async record(event) {
      await ensureSchema();
      await getPool().query(
        `INSERT INTO analytics_events (event, surface, distinct_id, session_id, properties)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [event.event, event.surface, event.distinctId, event.sessionId, JSON.stringify(event.properties)]
      );
    },
    async summary(days) {
      try {
        await ensureSchema();
        const pool = getPool();
        const window = days;
        const summaryResult = await pool.query(
          `SELECT
             count(DISTINCT distinct_id)::int AS visitors,
             count(DISTINCT distinct_id) FILTER (
               WHERE event = 'landing_viewed' AND surface = 'marketing'
             )::int AS landing_visitors,
             count(*) FILTER (
               WHERE event = 'scanner_cta_clicked' AND surface = 'marketing'
             )::int AS scanner_cta_clicks,
             count(*) FILTER (
               WHERE event = 'scan_page_viewed' AND surface = 'product'
             )::int AS scan_page_views,
             count(*) FILTER (
               WHERE event = 'report_viewed' AND surface = 'product'
             )::int AS report_views,
             count(*) FILTER (
               WHERE event = 'report_downloaded' AND surface = 'product'
             )::int AS report_downloads,
             count(*) FILTER (
               WHERE event = 'report_shared' AND surface = 'product'
             )::int AS reports_shared,
             count(*) FILTER (
               WHERE event = 'feedback_submitted' AND surface = 'product'
             )::int AS feedback_submitted
           FROM analytics_events
           WHERE occurred_at >= now() - ($1::int * interval '1 day')`,
          [window]
        );
        const row = summaryResult.rows[0] ?? {};
        const campaignResult = await pool.query(
          `SELECT properties->>'campaign' AS campaign, count(DISTINCT distinct_id)::int AS visitors
           FROM analytics_events
           WHERE event = 'landing_viewed' AND surface = 'marketing'
             AND occurred_at >= now() - ($1::int * interval '1 day')
             AND properties->>'campaign' IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
          [window]
        );
        const sourceResult = await pool.query(
          `SELECT properties->>'source' AS source, count(DISTINCT distinct_id)::int AS visitors
           FROM analytics_events
           WHERE event = 'landing_viewed' AND surface = 'marketing'
             AND occurred_at >= now() - ($1::int * interval '1 day')
             AND properties->>'source' IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
          [window]
        );
        const qualifiedResult = await pool.query(
          `WITH scans AS (
             SELECT distinct_id, min(occurred_at) AS scan_ts
             FROM analytics_events
             WHERE event = 'scan_succeeded' AND surface = 'product'
               AND occurred_at >= now() - ($1::int * interval '1 day')
             GROUP BY distinct_id
           ), actions AS (
             SELECT distinct_id, occurred_at
             FROM analytics_events
             WHERE event IN ('report_downloaded','report_shared','feedback_submitted')
               AND surface = 'product'
               AND occurred_at >= now() - ($1::int * interval '1 day')
           )
           SELECT count(DISTINCT scans.distinct_id)::int AS qualified
           FROM scans JOIN actions ON scans.distinct_id = actions.distinct_id
           WHERE actions.occurred_at >= scans.scan_ts
             AND actions.occurred_at <= scans.scan_ts + interval '7 days'`,
          [window]
        );
        const visitorResult = await pool.query(
          `SELECT distinct_id,
                  min(occurred_at) AS first_seen,
                  max(occurred_at) AS last_seen,
                  count(*)::int AS events,
                  count(*) FILTER (WHERE event = 'scan_succeeded')::int AS scans
           FROM analytics_events
           WHERE occurred_at >= now() - ($1::int * interval '1 day')
           GROUP BY distinct_id
           ORDER BY max(occurred_at) DESC
           LIMIT 20`,
          [window]
        );

        return {
          available: true,
          visitors: numberOrNull(row.visitors),
          landingVisitors: numberOrNull(row.landing_visitors),
          scannerCtaClicks: numberOrNull(row.scanner_cta_clicks),
          scanPageViews: numberOrNull(row.scan_page_views),
          reportViews: numberOrNull(row.report_views),
          reportDownloads: numberOrNull(row.report_downloads),
          reportsShared: numberOrNull(row.reports_shared),
          feedbackSubmitted: numberOrNull(row.feedback_submitted),
          qualifiedScans7d: numberOrNull(qualifiedResult.rows[0]?.qualified),
          breakdownsAvailable: true,
          campaigns: campaignResult.rows
            .map((entry) => ({ campaign: stringOrEmpty(entry.campaign), visitors: numberOrNull(entry.visitors) ?? 0 }))
            .filter((entry) => entry.campaign !== ""),
          sources: sourceResult.rows
            .map((entry) => ({ source: stringOrEmpty(entry.source), visitors: numberOrNull(entry.visitors) ?? 0 }))
            .filter((entry) => entry.source !== ""),
          recentVisitors: visitorResult.rows.map((entry) => ({
            distinctId: stringOrEmpty(entry.distinct_id),
            firstSeen: new Date(entry.first_seen).toISOString(),
            lastSeen: new Date(entry.last_seen).toISOString(),
            events: numberOrNull(entry.events) ?? 0,
            scans: numberOrNull(entry.scans) ?? 0,
          })),
        };
      } catch {
        return unavailable();
      }
    },
    async deleteByDistinctId(distinctId) {
      await ensureSchema();
      const result = await getPool().query(`DELETE FROM analytics_events WHERE distinct_id = $1`, [distinctId]);
      return result.rowCount ?? 0;
    },
  };
}

function createMemoryStore(): AnalyticsStore {
  return {
    async record(event) {
      memoryEvents().push({ ...event, occurredAt: new Date().toISOString() });
    },
    async summary(days) {
      return memorySummary(days);
    },
    async deleteByDistinctId(distinctId) {
      const events = memoryEvents();
      const before = events.length;
      const remaining = events.filter((event) => event.distinctId !== distinctId);
      (globalThis as GlobalAnalytics).__busfactorAnalyticsEvents = remaining;
      return before - remaining.length;
    },
  };
}

export const analyticsStore: AnalyticsStore = hasDatabase() ? createPostgresStore() : createMemoryStore();

export async function getAnalyticsSummary(days: number): Promise<AnalyticsSummary> {
  return analyticsStore.summary(days);
}

export function __resetAnalyticsEventsForTests(): void {
  (globalThis as GlobalAnalytics).__busfactorAnalyticsEvents = [];
}
