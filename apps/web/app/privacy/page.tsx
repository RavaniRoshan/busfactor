import { PageFrame, PageIntro } from "@/components/site-chrome";

export const metadata = { title: "Privacy — BusFactor" };

const CONTACT = "ravaniroshansingh@gmail.com";

export default function PrivacyPage() {
  return (
    <PageFrame>
      <PageIntro eyebrow="Legal" title="Privacy" text="What BusFactor collects, why, and how to ask for removal." />
      <div className="mx-auto mt-3xl max-w-article space-y-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
        <section>
          <h2 className="text-label font-medium text-text-primary">Who operates this service</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            BusFactor is operated by Roshan Ravani, an individual operator. Contact:{" "}
            <a className="underline underline-offset-4" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">What is collected</h2>
          <ul className="mt-sm list-disc space-y-sm pl-lg text-label-sm text-text-secondary">
            <li>The repository target you submit (a public GitHub URL or a local path).</li>
            <li>Findings, scores, verdicts, OPERATE.md drafts and author questions derived from that target, stored in Neon Postgres as a report keyed by an unguessable slug.</li>
            <li>A salted SHA-256 hash of the requesting IP address, truncated to 24 hex characters, used only for daily rate limiting. The raw address is not stored.</li>
            <li>Waitlist email addresses and report feedback (slug, yes/no answer, optional note and timestamp), when those endpoints are used. These are held in a server-local JSON file, not in the browser.</li>
            <li>A <code className="font-mono">theme</code> preference in your browser&apos;s local storage, set by the theme toggle.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">How repository content is handled</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            Repository code is never executed. Downloaded GitHub snapshots are written to a temporary directory and deleted when the scan finishes; only the derived findings and report are retained. When a live LLM key is configured, selected repository excerpts are sent to Groq for analysis.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Analytics</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            If you accept the in-app analytics banner, BusFactor uses PostHog product analytics to understand which pages
            and actions are useful. Analytics is consent-gated, does not use session recording or autocapture, and does
            not send repository contents, repository URLs, local paths, report slugs, emails, secrets, or full reports.
            Event details are documented in <code className="font-mono">docs/analytics.md</code>. Full retention
            reconciliation across app, analytics, and legal records is handled by Task 10.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Recipients</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            Hosting is provided by Vercel, persistence by Neon Postgres, and (when enabled) language inference by Groq. BusFactor does not sell data or share reports with third parties. Third-party reports are <code className="font-mono">noindex</code> by default.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Retention and your rights</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            Reports are retained until a removal request is received; there is no automatic deletion timer in the current build. You can ask for a report, waitlist entry or feedback record to be removed by emailing {CONTACT} with the report URL or the email used. We will confirm when it is gone. Data access and deletion requests are handled manually by the operator.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Jurisdiction</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            Governing law and applicable privacy regime: [NEEDED — operator to specify before publication]. This page describes actual system behaviour; it is not a legal certification.
          </p>
        </section>

        <p className="text-label-sm text-text-tertiary">Last updated: 20 November 2026.</p>
      </div>
    </PageFrame>
  );
}
