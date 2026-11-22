import { PageFrame, PageIntro } from "@/components/site-chrome";

export const metadata = { title: "Removal request — BusFactor" };

const CONTACT = "ravaniroshansingh@gmail.com";

export default function RemovalPage() {
  return (
    <PageFrame>
      <PageIntro eyebrow="Legal" title="Removal request" text="How to have a report or your data taken offline." />
      <div className="mx-auto mt-3xl max-w-article space-y-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
        <p className="text-label text-text-secondary">
          Email{" "}
          <a className="underline underline-offset-4" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{" "}
          with the report URL, the email address used for the waitlist, or enough detail to identify the record. We
          handle removal requests for reports, waitlist entries, feedback records, and analytics events by anonymous
          visitor ID. Requests are handled manually by the operator; we aim to handle removal requests within 24 hours and will
          confirm when the requested record is gone. Do not assume automated public deletion beyond the operator
          endpoint.
        </p>
        <p className="text-label-sm text-text-secondary">
          Reports of third-party repositories are <code className="font-mono">noindex</code> by default. This page
          describes the current process; it is not a legal certification.
        </p>
        <p className="text-label-sm text-text-tertiary">Last updated: 22 November 2026.</p>
      </div>
    </PageFrame>
  );
}
