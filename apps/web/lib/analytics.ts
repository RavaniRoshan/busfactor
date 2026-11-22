"use client";

import posthog from "posthog-js";

export type AnalyticsEvent =
  | "scan_page_viewed"
  | "scan_started"
  | "scan_succeeded"
  | "scan_failed"
  | "report_viewed"
  | "report_downloaded"
  | "fixes_downloaded"
  | "badge_clicked"
  | "report_shared"
  | "feedback_submitted"
  | "repeat_scan_completed";

export type Consent = "granted" | "denied";

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

const CONSENT_KEY = "busfactor.analytics.consent.v1";
const ATTRIBUTION_KEY = "busfactor.attribution.v1";
const SCAN_COMPLETED_KEY = "busfactor.scan.completed";
export const ANALYTICS_READY_EVENT = "busfactor:analytics-ready";

const FORBIDDEN_KEYS = new Set(["target", "repository", "repo", "path", "url", "slug"]);

let initialized = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function buildAttribution(search: string): Attribution {
  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  const params = new URLSearchParams(query);
  const attribution: Attribution = {};
  const source = params.get("utm_source")?.trim();
  const medium = params.get("utm_medium")?.trim();
  const campaign = params.get("utm_campaign")?.trim();
  const content = params.get("utm_content")?.trim();
  const term = params.get("utm_term")?.trim();
  if (source) attribution.source = source;
  if (medium) attribution.medium = medium;
  if (campaign) attribution.campaign = campaign;
  if (content) attribution.content = content;
  if (term) attribution.term = term;
  return attribution;
}

export function bucketFileCount(count: number): "0-100" | "100-500" | "500-2000" | "2000+" {
  if (count < 100) return "0-100";
  if (count < 500) return "100-500";
  if (count < 2000) return "500-2000";
  return "2000+";
}

function isForbiddenValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.includes("github.com/") || value.startsWith("file://");
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!properties) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (isForbiddenValue(value)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

export function getConsent(): Consent | null {
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setConsent(value: Consent): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CONSENT_KEY, value);
}

export function getAttribution(): Attribution {
  if (!isBrowser()) return {};
  try {
    const stored = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (parsed && typeof parsed === "object") {
        return sanitizeAttribution(parsed as Record<string, unknown>);
      }
    }
  } catch {
    // ignore invalid session state
  }
  const attribution = buildAttribution(window.location.search);
  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // ignore storage failures
  }
  return attribution;
}

function sanitizeAttribution(value: Record<string, unknown>): Attribution {
  const attribution: Attribution = {};
  for (const key of ["source", "medium", "campaign", "content", "term"] as const) {
    const raw = value[key];
    if (typeof raw === "string" && raw.trim() !== "") attribution[key] = raw;
  }
  return attribution;
}

export function hasAnalyticsKey(): boolean {
  return typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === "string" && process.env.NEXT_PUBLIC_POSTHOG_KEY.trim() !== "";
}

export function initAnalytics(): void {
  if (!isBrowser()) return;
  if (initialized) return;
  if (!hasAnalyticsKey()) return;
  if (getConsent() !== "granted") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY as string;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
  const attribution = getAttribution();

  try {
    posthog.init(key, {
      api_host: apiHost,
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
      persistence: "localStorage",
    });

    posthog.register({
      surface: "product",
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      content: attribution.content,
      term: attribution.term,
    });

    initialized = true;
    window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  } catch {
    initialized = false;
  }
}

export function capture(event: AnalyticsEvent, properties?: Record<string, unknown>): boolean {
  if (!isBrowser()) return false;
  if (!initialized) return false;
  try {
    posthog.capture(event, sanitizeAnalyticsProperties(properties));
    return true;
  } catch {
    return false;
  }
}

export function __resetAnalyticsForTests(): void {
  initialized = false;
}

export function markScanCompleted(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SCAN_COMPLETED_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasCompletedScan(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(SCAN_COMPLETED_KEY) === "1";
  } catch {
    return false;
  }
}
