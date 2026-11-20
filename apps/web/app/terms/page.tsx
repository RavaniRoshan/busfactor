import { PageFrame, PageIntro } from "@/components/site-chrome";

export const metadata = { title: "Terms — BusFactor" };

export default function TermsPage() {
  return (
    <PageFrame>
      <PageIntro eyebrow="Legal" title="Terms" />
      <div className="mx-auto mt-3xl max-w-article space-y-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
        <p className="text-label text-text-secondary">BusFactor analyses repositories that you submit or own. You are responsible for having the right to scan them.</p>
        <p className="text-label text-text-secondary">Named public scores are published only with consent.</p>
      </div>
    </PageFrame>
  );
}
