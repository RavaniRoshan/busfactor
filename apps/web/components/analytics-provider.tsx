"use client";

import * as React from "react";
import { ANALYTICS_READY_EVENT, capture, getConsent, hasAnalyticsKey, initAnalytics, setConsent, type Consent } from "@/lib/analytics";

type ConsentState = Consent | null | "unknown";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsentState] = React.useState<ConsentState>("unknown");
  const enabled = hasAnalyticsKey();

  React.useEffect(() => {
    if (!enabled) return;
    const current = getConsent();
    setConsentState(current);
    if (current === "granted") initAnalytics();
  }, [enabled]);

  function choose(value: Consent) {
    setConsent(value);
    setConsentState(value);
    if (value === "granted") initAnalytics();
  }

  return (
    <>
      {enabled && consent === null ? <ConsentBanner onChoose={choose} /> : null}
      {children}
    </>
  );
}

function ConsentBanner({ onChoose }: { onChoose: (value: Consent) => void }) {
  return (
    <aside
      aria-label="Analytics consent"
      className="w-full border-b border-border-secondary bg-surface-bg px-lg py-md"
    >
      <div className="mx-auto flex w-full max-w-page flex-col gap-md md:flex-row md:items-center md:justify-between">
        <p className="min-w-0 flex-1 text-label-sm text-text-secondary md:max-w-article">
          BusFactor stores privacy-friendly analytics events in its own database to understand which pages and
          actions are useful. No repository contents, URLs, or paths are sent.
        </p>
        <div className="flex shrink-0 gap-sm">
          <button
            type="button"
            onClick={() => onChoose("denied")}
            className="rounded-corner-md border border-border-primary px-md py-xs text-label-sm text-text-primary"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => onChoose("granted")}
            className="rounded-corner-md bg-brand-primary px-md py-xs text-label-sm text-on-brand"
          >
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}

export function ScanPageTracker() {
  React.useEffect(() => {
    const key = "busfactor.analytics.scan_page_viewed";
    const tryCapture = () => {
      if (typeof window === "undefined") return;
      try {
        if (window.sessionStorage.getItem(key) === "1") return;
      } catch {
        return;
      }
      const sent = capture("scan_page_viewed");
      if (!sent) return;
      try {
        window.sessionStorage.setItem(key, "1");
      } catch {
        // ignore storage failures after successful capture
      }
    };

    tryCapture();
    window.addEventListener(ANALYTICS_READY_EVENT, tryCapture);
    return () => window.removeEventListener(ANALYTICS_READY_EVENT, tryCapture);
  }, []);
  return null;
}
