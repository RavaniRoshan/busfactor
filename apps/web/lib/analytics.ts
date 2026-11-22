"use client";

import {
  sanitizeAnalyticsProperties,
  type ProductEvent,
} from "./analytics-schema";

export type AnalyticsEvent = ProductEvent;
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
const CLIENT_ID_KEY = "busfactor.analytics.id.v1";
const SESSION_ID_KEY = "busfactor.analytics.session.v1";
const SCAN_COMPLETED_KEY = "busfactor.scan.completed";
export const ANALYTICS_READY_EVENT = "busfactor:analytics-ready";

let initialized = false;
let fallbackClientId: string | null = null;
let fallbackSessionId: string | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function readId(storage: Storage, key: string, fallback: () => string): string {
  try {
    const existing = storage.getItem(key);
    if (existing !== null && existing.trim() !== "") return existing;
    const created = fallback();
    storage.setItem(key, created);
    return created;
  } catch {
    return fallback();
  }
}

function getClientId(): string {
  if (!isBrowser()) {
    fallbackClientId ??= randomId();
    return fallbackClientId;
  }
  return readId(window.localStorage, CLIENT_ID_KEY, () => {
    fallbackClientId ??= randomId();
    return fallbackClientId;
  });
}

function getSessionId(): string {
  if (!isBrowser()) {
    fallbackSessionId ??= randomId();
    return fallbackSessionId;
  }
  return readId(window.sessionStorage, SESSION_ID_KEY, () => {
    fallbackSessionId ??= randomId();
    return fallbackSessionId;
  });
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

export { sanitizeAnalyticsProperties };

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

export function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_DISABLED !== "1";
}

export function hasAnalyticsKey(): boolean {
  return isAnalyticsEnabled();
}

export function initAnalytics(): void {
  if (!isBrowser()) return;
  if (initialized) return;
  if (!isAnalyticsEnabled()) return;
  if (getConsent() !== "granted") return;

  initialized = true;
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
}

export function capture(event: AnalyticsEvent, properties?: Record<string, unknown>): boolean {
  if (!isBrowser() || !initialized) return false;
  try {
    const payload = {
      event,
      surface: "product" as const,
      distinct_id: getClientId(),
      session_id: getSessionId(),
      properties: {
        ...getAttribution(),
        page: window.location.pathname,
        ...sanitizeAnalyticsProperties(properties),
      },
    };
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export function __resetAnalyticsForTests(): void {
  initialized = false;
  fallbackClientId = null;
  fallbackSessionId = null;
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
