import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { PageFrame } from "@/components/site-chrome";
import { ReportWindow } from "@/components/report-window";
import { buttonVariants } from "@/components/ui/button";
import { parseReportView, type Report } from "@/lib/report-view";
import FeedbackWidget from "./FeedbackWidget";

// Static export: nested segments must not overwrite this noindex value.
export const metadata = {
  title: "Report — BusFactor",
  robots: { index: false, follow: false },
};

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const { view: rawView } = await searchParams;
  const stored = await store.reports.get(slug);
  if (!stored) notFound();

  const report = stored.report as Report;
  const view = parseReportView(rawView);

  return (
    <PageFrame>
      <div className="report-backdrop py-lg">
        <ReportWindow report={report} slug={slug} view={view} />
      </div>

      <div className="mx-auto mt-xl grid w-full max-w-article gap-xl">
        <section aria-label="Report downloads" className="flex flex-wrap gap-sm">
          <a href={`/api/report/${slug}/download`} className={buttonVariants({ variant: "default" })}>
            Download report
          </a>
          <a href={`/api/report/${slug}/fixes`} className={buttonVariants({ variant: "outline" })}>
            Download fix list
          </a>
          <a href={`/badge/${slug}.svg`} className={buttonVariants({ variant: "outline" })}>
            Badge
          </a>
        </section>

        <section aria-label="More actions" className="flex flex-wrap gap-sm">
          <a href="/scan" className={buttonVariants({ variant: "default" })}>
            Scan another repository
          </a>
          <a href="/docs" className={buttonVariants({ variant: "outline" })}>
            Documentation
          </a>
          <a href="/" className={buttonVariants({ variant: "outline" })}>
            Back to home
          </a>
        </section>

        <FeedbackWidget slug={slug} />
      </div>
    </PageFrame>
  );
}
