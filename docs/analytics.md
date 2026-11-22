# BusFactor First-Party Analytics

BusFactor stores its analytics events in its own Neon database. There is no third-party analytics SDK and no external analytics project.

## Architecture

- **Table:** `analytics_events` in Neon.
- **Ingest:** `POST /api/events` on the hosted app. Both the app and the marketing site send events there.
- **Rendering:** `/admin/metrics` queries the table directly.
- **Consent:** no event is sent before explicit consent. The consent key is `busfactor.analytics.consent.v1` with values `granted` or `denied`.
- **Identity:** an anonymous visitor ID is generated locally on first consent (`busfactor.analytics.id.v1`); a session ID is stored per tab (`busfactor.analytics.session.v1`). No account identity is attached in this build.
- **CORS:** the ingest route accepts cross-origin POSTs so the static marketing site and previews can send events. It carries no credentials; validation and IP rate limiting protect it.
- **Kill flag:** `NEXT_PUBLIC_ANALYTICS_DISABLED=1` disables capture in the app at build time.

## Stored Fields

```text
analytics_events
  id            bigserial
  occurred_at   timestamptz
  event         text
  surface       'product' | 'marketing'
  distinct_id   text
  session_id    text nullable
  properties    jsonb
```

## Event Catalog

### Product (`surface = 'product'`)

| Event | When emitted | Allowed properties |
|---|---|---|
| `scan_page_viewed` | Scan page viewed once per session | `page`, attribution |
| `scan_started` | Scan form submitted | `page` |
| `scan_succeeded` | Scan completes | `cache_hit`, `duration_ms`, `model`, `rubric_version`, `stack`, `file_count_bucket` |
| `scan_failed` | Scan fails | `error_category` |
| `report_viewed` | Report page viewed once per slug per session | `file_count_bucket`, `stack`, `rubric_version` |
| `report_downloaded` | Download report clicked | none |
| `fixes_downloaded` | Download fix list clicked | none |
| `badge_clicked` | Badge link clicked | none |
| `report_shared` | Copy report link succeeds | none |
| `feedback_submitted` | Feedback POST succeeds | `helpful` |
| `repeat_scan_completed` | A scan succeeds after a prior success | none |

### Marketing (`surface = 'marketing'`)

| Event | When emitted | Allowed properties |
|---|---|---|
| `landing_viewed` | Marketing page loaded after consent | `page`, `device_type`, attribution |
| `hero_cta_clicked` | Hero scanner CTA clicked | `location` |
| `scanner_cta_clicked` | Any scanner CTA clicked | `location` |
| `docs_clicked` | Docs link clicked | `location` |
| `cli_command_copied` | CLI scan command copied | `command` |
| `pricing_viewed` | Free-beta section enters viewport | none |
| `campaign_clicked` | Outbound app link clicked with UTM attribution | `target_path` |

## Allowed Property Keys

`sanitizeAnalyticsProperties` keeps only these keys:

```text
page, source, medium, campaign, content, term, device_type,
location, target_path, command, cache_hit, duration_ms, model,
rubric_version, stack, file_count_bucket, error_category, helpful
```

Values must be strings, finite numbers, or booleans. Strings are trimmed and capped at 200 characters. `page` and `target_path` must be site-relative paths starting with `/` and must not contain `..`.

## Forbidden Data

The ingest route rejects or drops:

- repository URLs, repository names, local filesystem paths, report slugs;
- raw source files, report bodies, diffs, environment variables, tokens, secrets;
- email addresses and any `http(s)://` URL;
- unknown property keys.

The client sanitizer and the server normalizer enforce the same allowlist.

## Attribution

The marketing site maps UTM parameters to `source`, `medium`, `campaign`, `content`, and `term`, and persists them in `sessionStorage`. The app reads the same parameters when it receives a UTM-tagged link. Attribution is stored on the event, not on a cross-domain person profile.

## Retention and Deletion

- Events are retained until a removal request. There is no automatic expiry in this build.
- An operator can delete every event for a visitor ID through the authenticated `DELETE /api/admin/analytics` endpoint (`{ "distinctId": "..." }`).
- Declining consent prevents all capture; the consent choice is stored locally.
- No session recording, autocapture, or third-party analytics processor is used.

## Dashboard

`/admin/metrics` reads from Neon and shows:

- acquisition counts by marketing surface;
- scan and report engagement by product surface;
- campaign/source breakdowns from landing events;
- qualified scans (successful scan followed by download/share/feedback within 7 days);
- recent anonymous visitors with first seen, last seen, event count, and scan count.

Revenue fields remain disabled until billing exists. Hosting, database, and payment-processing costs are not tracked in this build.

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
