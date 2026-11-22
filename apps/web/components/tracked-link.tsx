"use client";

import * as React from "react";
import { capture, type AnalyticsEvent } from "@/lib/analytics";

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

export function TrackedLink({
  event,
  properties,
  onClick,
  ...props
}: AnchorProps & {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
}) {
  return (
    <a
      {...props}
      onClick={(e) => {
        capture(event, properties);
        onClick?.(e);
      }}
    />
  );
}
