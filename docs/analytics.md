# BusFactor Product Analytics

This document describes the consent-gated product analytics implementation in `apps/web`.

## Scope

- **Product surface**: `surface: "product"` for events emitted by the web app.
- **Marketing surface**: `surface: "marketing"` is reserved for marketing-site analytics. This app currently emits product events only.
- **Provider**: PostHog (`posthog-js`) on the client only. No server-side PostHog dependency is used for event capture.
- **Consent**: No analytics events are sent before explicit consent. The consent key is `busfactor.analytics.consent.v1` with values `granted` or `denied`.
- **Configuration**: If `NEXT_PUBLIC_POSTHOG_KEY` is absent, analytics is disabled, no consent banner is rendered, and capture calls are no-ops.
- **Privacy defaults**: `autocapture: false`, `capture_pageview: false`, `disable_session_recording: true`, `person_profiles: "identified_only"`, `persistence: "localStorage"`.

## Event Catalog

| Event | When emitted | Required/standard properties |
|---|---|---|
| `scan_page_viewed` | Scan page viewed once per browser session | `surface`, attribution super properties |
| `scan_started` | User submits scan form, before fetch | `surface`, attribution super properties |
| `scan_succeeded` | Scan request completes successfully in submit handler | `cache_hit`, `duration_ms`, `model`, `rubric_version`, `stack`, `file_count_bucket` |
| `scan_failed` | Scan request fails in submit handler or poll failure branch | `error_category` |
| `report_viewed` | Report page viewed once per slug per browser session | `file_count_bucket`, `stack`, `rubric_version` |
| `report_downloaded` | Download report link clicked | `surface` |
| `fixes_downloaded` | Download fix list link clicked | `surface` |
| `badge_clicked` | Badge link clicked | `surface` |
| `report_shared` | Copy report link succeeds and analytics capture succeeds | `surface` |
| `feedback_submitted` | Feedback POST succeeds | `helpful` |
| `repeat_scan_completed` | A scan succeeds after a prior completed scan flag exists | emitted alongside `scan_succeeded` context as a separate event |

## Attribution and Super Properties

Attribution is parsed from the landing URL and persisted in `sessionStorage` under `busfactor.attribution.v1`.

Captured UTM params:

- `utm_source` -> `source`
- `utm_medium` -> `medium`
- `utm_campaign` -> `campaign`
- `utm_content` -> `content`
- `utm_term` -> `term`

Registered super properties on init:

- `surface: "product"`
- `source`, `medium`, `campaign`, `content`, `term` (when present)

`device_type` is a required reporting dimension for analytics consumers; it should be derived by the analytics platform/reporting layer from standard client metadata when available. The product event schema reserves it as a standard property name and must not be populated with fingerprinting data.

## Forbidden Properties

The sanitizer must drop these keys from event properties:

- `target`
- `repository`
- `repo`
- `path`
- `url`
- `slug`

The sanitizer must also drop any string value containing `github.com/` or starting with `file://`.

Never send repository URLs, local paths, slugs, report bodies, emails, secrets, or full reports. Page paths such as `/scan` describe the site and are allowed if intentionally added by a future event, but current product events do not send them.

## Consent and Retention

- Consent is explicit opt-in via the in-app banner.
- Declining consent persists the choice and prevents initialization/capture.
- PostHog session recording is disabled.
- PostHog data retention and deletion should follow the configured PostHog project settings and BusFactor privacy/removal obligations. Task 10 will perform full retention reconciliation across app/legal/data stores.

## Reserved Monetization Events

These names are reserved and must not be emitted until billing exists:

- `signup_started`
- `signup_completed`
- `checkout_started`
- `payment_succeeded`
- `subscription_created`
- `subscription_cancelled`
- `subscription_renewed`
- `refund_issued`
