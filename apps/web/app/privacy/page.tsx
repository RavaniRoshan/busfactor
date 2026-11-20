import { PageFrame, PageIntro } from "@/components/site-chrome";

export const metadata = { title: "Privacy — BusFactor" };

export default function PrivacyPage() {
  return (
    <PageFrame>
      <PageIntro eyebrow="Legal" title="Privacy" />
      <div className="mx-auto mt-3xl max-w-article space-y-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
        <p className="text-label text-text-secondary">Source snapshots are deleted after 7 days. Only findings and reports are retained.</p>
        <p className="text-label text-text-secondary">Secrets are redacted and never stored raw, including in logs.</p>
        <p className="text-label text-text-secondary">Third-party reports are noindex by default.</p>
      </div>
    </PageFrame>
  );
}
