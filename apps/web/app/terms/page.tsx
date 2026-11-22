import { PageFrame, PageIntro } from "@/components/site-chrome";

export const metadata = { title: "Terms — BusFactor" };

const CONTACT = "ravaniroshansingh@gmail.com";

export default function TermsPage() {
  return (
    <PageFrame>
      <PageIntro eyebrow="Legal" title="Terms" text="The terms under which BusFactor is provided." />
      <div className="mx-auto mt-3xl max-w-article space-y-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
        <section>
          <h2 className="text-label font-medium text-text-primary">Service</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            BusFactor is operated by Roshan Ravani. It scans a repository you submit and returns an operability
            verdict, a risk map, an OPERATE.md draft and questions for the author. Findings are evidence-based and the
            score is computed by deterministic code; the service does not execute repository code and does not guarantee
            that a report is complete.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Your responsibility</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            Submit only repositories you own or have the right to analyse. Do not use the service to scan code you are
            not authorised to process. Named public scores are published only with consent, and third-party reports are
            not indexed by default.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Data processing</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            BusFactor uses Vercel for hosting, Neon for persistence, Groq for language inference when a key is
            configured, and PostHog for consent-gated product analytics when a key is configured. See the Privacy page
            for the data inventory and removal process.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Availability and changes</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            The service is provided as-is, without a service-level guarantee. It may change or be withdrawn. Reports can
            be removed on request; see the Removal page. There are no paid plans, subscriptions or refunds in this
            build.
          </p>
        </section>

        <section>
          <h2 className="text-label font-medium text-text-primary">Contact and governing law</h2>
          <p className="mt-sm text-label-sm text-text-secondary">
            Questions and removal requests:{" "}
            <a className="underline underline-offset-4" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            . Governing law: [NEEDED — operator to specify before publication].
          </p>
        </section>

        <p className="text-label-sm text-text-tertiary">Last updated: 22 November 2026.</p>
      </div>
    </PageFrame>
  );
}
