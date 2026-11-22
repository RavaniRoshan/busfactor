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
      {children}
      {enabled && consent === null ? <ConsentBanner onChoose={choose} /> : null}
    </>
  );
}

function ConsentBanner({ onChoose }: { onChoose: (value: Consent) => void }) {
  return (
    <aside
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border-secondary bg-surface-bg/95 px-lg py-lg backdrop-blur"
    >
      <div className="mx-auto flex max-w-page flex-col gap-md md:flex-row md:items-center md:justify-between">
        <p className="max-w-3xl text-label-sm text-text-secondary">
          BusFactor uses privacy-friendly analytics (PostHog) to understand which pages and actions are useful. No
          repository contents, URLs, or paths are sent.
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
