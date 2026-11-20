import { PageFrame, PageIntro } from "@/components/site-chrome";

export const metadata = { title: "Removal request — BusFactor" };

export default function RemovalPage() {
  return (
    <PageFrame>
      <PageIntro eyebrow="Legal" title="Removal request" text="Reports can be taken offline. We act on requests within 24 hours." />
      <div className="mx-auto mt-3xl max-w-article rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
        <p className="text-label text-text-secondary">Email the report URL and we will take it offline within 24 hours.</p>
      </div>
    </PageFrame>
  );
}
