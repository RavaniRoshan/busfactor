"use client";

import * as React from "react";
import { ANALYTICS_READY_EVENT, bucketFileCount, capture, type AnalyticsEvent } from "@/lib/analytics";
import { buttonVariants } from "@/components/ui/button";
import { TrackedLink } from "@/components/tracked-link";

export function ReportViewTracker({
  slug,
  fileCount,
  stack,
  rubricVersion,
}: {
  slug: string;
  fileCount: number | null | undefined;
  stack: string | null | undefined;
  rubricVersion: string | null | undefined;
}) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `busfactor.analytics.report_viewed.${slug}`;
    const tryCapture = () => {
      try {
        if (window.sessionStorage.getItem(key) === "1") return;
      } catch {
        return;
      }
      const sent = capture("report_viewed", {
        file_count_bucket: typeof fileCount === "number" ? bucketFileCount(fileCount) : undefined,
        stack: typeof stack === "string" ? stack : undefined,
        rubric_version: typeof rubricVersion === "string" ? rubricVersion : undefined,
      });
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
  }, [fileCount, rubricVersion, slug, stack]);
  return null;
}

export function ReportActions({ slug }: { slug: string }) {
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "manual">("idle");
  const [manualUrl, setManualUrl] = React.useState("");

  async function copyReportLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      capture("report_shared");
      setCopyState("copied");
      setManualUrl("");
    } catch {
      setManualUrl(url);
      setCopyState("manual");
    }
  }

  return (
    <section aria-label="Report downloads" className="flex flex-wrap gap-sm">
      <TrackedDownload href={`/api/report/${slug}/download`} event="report_downloaded">
        Download report
      </TrackedDownload>
      <TrackedDownload href={`/api/report/${slug}/fixes`} event="fixes_downloaded">
        Download fix list
      </TrackedDownload>
      <TrackedLink href={`/badge/${slug}.svg`} event="badge_clicked" className={buttonVariants({ variant: "outline" })}>
        Badge
      </TrackedLink>
      <button type="button" className={buttonVariants({ variant: "outline" })} onClick={() => void copyReportLink()}>
        {copyState === "copied" ? "Copied report link" : "Copy report link"}
      </button>
      {copyState === "manual" && manualUrl ? (
        <label className="flex w-full flex-col gap-xs text-label-sm text-text-secondary">
          <span>Clipboard unavailable. Copy the report URL:</span>
          <input
            readOnly
            value={manualUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 w-full rounded-corner-md border border-border-primary bg-surface-bg px-lg font-mono text-label-sm text-text-primary"
          />
        </label>
      ) : null}
    </section>
  );
}

function TrackedDownload({
  href,
  event,
  children,
}: {
  href: string;
  event: AnalyticsEvent;
  children: React.ReactNode;
}) {
  return (
    <TrackedLink href={href} event={event} className={buttonVariants({ variant: event === "report_downloaded" ? "default" : "outline" })}>
      {children}
    </TrackedLink>
  );
}
