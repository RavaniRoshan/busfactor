export const PRODUCT_EVENTS = [
  "scan_page_viewed",
  "scan_started",
  "scan_succeeded",
  "scan_failed",
  "report_viewed",
  "report_downloaded",
  "fixes_downloaded",
  "badge_clicked",
  "report_shared",
  "feedback_submitted",
  "repeat_scan_completed",
] as const;

export const MARKETING_EVENTS = [
  "landing_viewed",
  "hero_cta_clicked",
  "scanner_cta_clicked",
  "docs_clicked",
  "cli_command_copied",
  "pricing_viewed",
  "campaign_clicked",
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];
export type MarketingEvent = (typeof MARKETING_EVENTS)[number];
export type AnalyticsEvent = ProductEvent | MarketingEvent;
export type AnalyticsSurface = "product" | "marketing";
export type AnalyticsPropertyValue = string | number | boolean;

const PRODUCT_EVENT_SET = new Set<string>(PRODUCT_EVENTS);
const MARKETING_EVENT_SET = new Set<string>(MARKETING_EVENTS);

const ALLOWED_PROPERTY_KEYS = new Set([
  "page",
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "device_type",
  "location",
  "target_path",
  "command",
  "cache_hit",
  "duration_ms",
  "model",
  "rubric_version",
  "stack",
  "file_count_bucket",
  "error_category",
  "helpful",
]);

const FORBIDDEN_KEYS = new Set([
  "target",
  "repository",
  "repo",
  "path",
  "url",
  "slug",
  "email",
  "secret",
  "token",
  "password",
  "file",
]);

const SITE_PATH_KEYS = new Set(["page", "target_path"]);
const ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;
const PROPERTY_KEY_PATTERN = /^[a-z][a-z0-9_]{0,40}$/;
const EMAIL_PATTERN = /\S+@\S+\.\S+/;

export function isAnalyticsId(value: string): boolean {
  return ID_PATTERN.test(value);
}

export interface NormalizedAnalyticsEvent {
  event: AnalyticsEvent;
  surface: AnalyticsSurface;
  distinctId: string;
  sessionId: string | null;
  properties: Record<string, AnalyticsPropertyValue>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeString(key: string, value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > 200) return null;
  if (SITE_PATH_KEYS.has(key)) {
    if (!trimmed.startsWith("/") || trimmed.includes("..")) return null;
    return trimmed;
  }
  if (trimmed.includes("github.com/") || trimmed.startsWith("file://")) return null;
  if (/^https?:\/\//i.test(trimmed) || EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown> | undefined
): Record<string, AnalyticsPropertyValue> {
  if (!properties) return {};
  const sanitized: Record<string, AnalyticsPropertyValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!PROPERTY_KEY_PATTERN.test(key) || !ALLOWED_PROPERTY_KEYS.has(key)) continue;
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === "number") {
      if (Number.isFinite(value)) sanitized[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const clean = sanitizeString(key, value);
      if (clean !== null) sanitized[key] = clean;
    }
  }
  return sanitized;
}

export function normalizeAnalyticsEvent(raw: unknown): NormalizedAnalyticsEvent | null {
  if (!isRecord(raw)) return null;
  const event = typeof raw.event === "string" ? raw.event : "";
  const surface = raw.surface === "product" || raw.surface === "marketing" ? raw.surface : null;
  const distinctId = typeof raw.distinct_id === "string" ? raw.distinct_id.trim() : "";
  const sessionId = typeof raw.session_id === "string" ? raw.session_id.trim() : "";

  if (!surface || !ID_PATTERN.test(distinctId)) return null;
  if (sessionId !== "" && !ID_PATTERN.test(sessionId)) return null;
  if (surface === "product" && !PRODUCT_EVENT_SET.has(event)) return null;
  if (surface === "marketing" && !MARKETING_EVENT_SET.has(event)) return null;

  return {
    event: event as AnalyticsEvent,
    surface,
    distinctId,
    sessionId: sessionId === "" ? null : sessionId,
    properties: sanitizeAnalyticsProperties(isRecord(raw.properties) ? raw.properties : undefined),
  };
}
