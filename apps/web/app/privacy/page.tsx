import { PageFrame, PageIntro } from "@/components/site-chrome";

export const metadata = { title: "Privacy — BusFactor" };

const CONTACT = "ravaniroshansingh@gmail.com";

export default function PrivacyPage() {
  return (
    <PageFrame>
      <PageIntro
        eyebrow="Legal"
        title="Privacy"
        text="What BusFactor collects, why, and how to ask for removal."
      />
      <div className="mx-auto mt-3xl max-w-article space-y-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
        <section>
          <h2 className="text-label font-medium text-text-primary">Who operates this service</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            BusFactor is operated by Roshan Ravani, an individual operator. Contact:{" "}
            <a className="underline underline-offset-4" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Data inventory</h2>
          <ul className="mt-sm list-disc space-y-sm pl-lg text-label-sm text-text-secondary">
            <li>
              <strong className="font-medium text-text-primary">Repository snapshots:</strong> downloaded to a temporary
              directory, never executed, deleted when the scan finishes (success or failure). Selected excerpts may be
              sent to Groq when a key is configured.
            </li>
            <li>
              <strong className="font-medium text-text-primary">Reports:</strong> stored in Neon with an unguessable
              slug; retained until a removal request; <code className="font-mono">noindex</code> by default; published
              only by explicit opt-in.
            </li>
            <li>
              <strong className="font-medium text-text-primary">Feedback:</strong> stored in Neon (
              <code className="font-mono">report_feedback</code>) with slug, yes/no, optional note, timestamp; retained
              until removal.
            </li>
            <li>
              <strong className="font-medium text-text-primary">Waitlist:</strong> stored in Neon (
              <code className="font-mono">waitlist_entries</code>) with email, optional source/campaign, timestamp;
              retained until removal; never displayed in the dashboard.
            </li>
            <li>
              <strong className="font-medium text-text-primary">Rate limiting:</strong> salted, truncated SHA-256 of the
              IP address in a daily counter; the raw IP is not stored; the latest daily counter per hashed address
              remains in the rate-limit store.
            </li>
            <li>
              <strong className="font-medium text-text-primary">Analytics:</strong> consent-gated PostHog events with
              page path, device type, campaign attribution, and action names; never repository contents, URLs, local
              paths, slugs, or secrets. Declining analytics initializes no PostHog tracking and sends no events.
              Retention follows the PostHog project settings; requests can be sent to the contact address.
            </li>
            <li>
              <strong className="font-medium text-text-primary">Admin sessions:</strong> HttpOnly cookie, 8 hours.
            </li>
            <li>
              <strong className="font-medium text-text-primary">Billing:</strong> no accounts, payments, or
              subscriptions in this build.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Recipients</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            Hosting is provided by Vercel, persistence by Neon Postgres, and, when enabled, language inference by Groq.
            Product analytics, when consented, is provided by PostHog. BusFactor does not sell data or share reports
            with third parties.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Your rights and removal</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            You can ask for a report, waitlist entry, feedback record, or analytics deletion request to be handled by
            emailing {CONTACT} with the report URL, the email used, or enough detail to identify the record. Requests
            are handled manually by the operator; we aim to handle removal requests within 24 hours and will confirm
            when the requested record is gone. Data access and deletion requests are handled manually by the operator.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Jurisdiction</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            Governing law and applicable privacy regime: [NEEDED — operator to specify before publication]. This page
            describes actual system behaviour; it is not a legal certification.
          </p>
        </section>

        <p className="text-label-sm text-text-tertiary">Last updated: 20 November 2026.</p>
      </div>
    </PageFrame>
  );
}
