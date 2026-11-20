import { notFound } from "next/navigation";
import { reports } from "@/lib/store";
import { PageFrame } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import FeedbackWidget from "./FeedbackWidget";

type Report = {
  score: number;
  verdict: string;
  dimensions: Array<{ label: string; score: number; findingCount: number }>;
  findings: Array<{ severity: string; message: string; evidence?: Array<{ file: string; lineStart: number }> }>;
  authorQuestions: Array<{ question: string; evidence: Array<{ file: string; lineStart: number }> }>;
  operateMd: string;
  meta: { sha: string; engineVersion: string; rubricVersion: string };
};

// Static export: nested segments must not overwrite this noindex value.
export const metadata = {
  title: "Report — BusFactor",
  robots: { index: false, follow: false },
};

function Cite({ file, line }: { file: string; line: number }) {
  return (
    <code className="inline-flex rounded-corner-sm bg-bg-faint px-sm py-xs font-mono text-xs text-text-secondary">
      {file}:{line}
    </code>
  );
}

function severityVariant(severity: string): "danger" | "warning" | "secondary" {
  if (severity.includes("high") || severity.includes("critical")) return "danger";
  if (severity.includes("medium")) return "warning";
  return "secondary";
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stored = reports.get(slug);
  if (!stored) notFound();
  const report = stored.report as Report;

  return (
    <PageFrame>
      <div className="mx-auto w-full max-w-article">
        <header className="rounded-corner-lg border border-border-primary bg-surface-bg p-xl md:p-2xl">
          <div className="flex flex-wrap items-baseline justify-between gap-lg">
            <div>
              <p className="text-xs tracking-widest text-text-secondary uppercase">Operability verdict</p>
              <h1 className="type-display mt-sm">
                <span className="tabular-nums">{report.score}/100</span> — {report.verdict}
              </h1>
            </div>
            <Badge variant="secondary">Private report</Badge>
          </div>
          <p className="mt-lg font-mono text-xs text-text-secondary">
            SHA {report.meta.sha} · Engine {report.meta.engineVersion} · Rubric {report.meta.rubricVersion}
          </p>
        </header>

        <div className="mt-xl grid gap-xl">
          <section aria-labelledby="reasons-title" className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
            <h2 id="reasons-title" className="text-label font-medium text-text-primary">Top reasons</h2>
            <ul className="mt-lg flex flex-col divide-y divide-border-secondary">
              {report.findings.slice(0, 5).map((finding, index) => (
                <li key={index} className="flex flex-wrap items-center justify-between gap-md py-lg">
                  <span className="flex flex-col items-start gap-sm">
                    <span className="text-label-sm text-text-primary">{finding.message}</span>
                    {finding.evidence?.[0] && <Cite file={finding.evidence[0].file} line={finding.evidence[0].lineStart} />}
                  </span>
                  <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="risk-title" className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
            <h2 id="risk-title" className="text-label font-medium text-text-primary">Risk map</h2>
            <ul className="mt-lg flex flex-col gap-lg">
              {report.dimensions.map((dimension) => (
                <li key={dimension.label} className="grid grid-cols-3 items-center gap-lg">
                  <span className="text-label-sm text-text-secondary">{dimension.label}</span>
                  <span
                    className="col-span-2 h-xs overflow-hidden rounded-corner-full bg-bg-subtle"
                    role="img"
                    aria-label={`${dimension.label}: ${dimension.score} out of 100, ${dimension.findingCount} findings`}
                  >
                    <span
                      className={`block h-full rounded-corner-full ${dimension.score < 50 ? "bg-warning" : "bg-brand-primary"}`}
                      style={{ width: `${dimension.score}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="questions-title" className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
            <h2 id="questions-title" className="text-label font-medium text-text-primary">Author questions</h2>
            <ul className="mt-lg flex flex-col gap-md">
              {report.authorQuestions.map((question, index) => (
                <li key={index} className="flex flex-col items-start gap-sm rounded-corner-md bg-bg-faint p-lg">
                  <p className="text-label-sm text-text-primary">{question.question}</p>
                  {question.evidence[0] && <Cite file={question.evidence[0].file} line={question.evidence[0].lineStart} />}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="operate-title" className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
            <h2 id="operate-title" className="text-label font-medium text-text-primary">OPERATE.md</h2>
            <pre className="mt-lg overflow-x-auto rounded-corner-md bg-bg-faint p-lg font-mono text-xs whitespace-pre-wrap text-text-primary">
              {report.operateMd}
            </pre>
          </section>

          <section aria-label="Report downloads" className="flex flex-wrap gap-sm">
            <a href={`/api/report/${slug}/download`} className={buttonVariants({ variant: "default" })}>Download report</a>
            <a href={`/api/report/${slug}/fixes`} className={buttonVariants({ variant: "outline" })}>Download fix list</a>
            <a href={`/badge/${slug}.svg`} className={buttonVariants({ variant: "outline" })}>Badge</a>
          </section>

          <FeedbackWidget slug={slug} />
        </div>
      </div>
    </PageFrame>
  );
}
