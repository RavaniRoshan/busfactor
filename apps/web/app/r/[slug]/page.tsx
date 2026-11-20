import { notFound } from "next/navigation";
import { reports } from "@/lib/store";

type Report = {
  score: number;
  verdict: string;
  dimensions: Array<{ label: string; score: number; findingCount: number }>;
  findings: Array<{ severity: string; message: string; evidence?: Array<{ file: string; lineStart: number }> }>;
  authorQuestions: Array<{ question: string; evidence: Array<{ file: string; lineStart: number }> }>;
  operateMd: string;
  meta: { sha: string; engineVersion: string; rubricVersion: string };
};

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stored = reports.get(slug);
  if (!stored) notFound();
  const report = stored.report as Report;

  return (
    <main>
      <h1>{report.score}/100 — {report.verdict}</h1>
      <p>SHA: {report.meta.sha} · Engine {report.meta.engineVersion} · Rubric {report.meta.rubricVersion}</p>

      <h2>Top reasons</h2>
      <ul>
        {report.findings.slice(0, 5).map((finding, index) => (
          <li key={index}>
            [{finding.severity}] {finding.message}{" "}
            {finding.evidence?.[0] ? `(${finding.evidence[0].file}:${finding.evidence[0].lineStart})` : ""}
          </li>
        ))}
      </ul>

      <h2>Risk map</h2>
      <ul>
        {report.dimensions.map((dimension) => (
          <li key={dimension.label}>
            {dimension.label}: {dimension.score}/100 ({dimension.findingCount} findings)
          </li>
        ))}
      </ul>

      <h2>Author questions</h2>
      <ul>
        {report.authorQuestions.map((question, index) => (
          <li key={index}>
            {question.question}{" "}
            {question.evidence[0] ? `(${question.evidence[0].file}:${question.evidence[0].lineStart})` : ""}
          </li>
        ))}
      </ul>

      <h2>OPERATE.md</h2>
      <pre>{report.operateMd}</pre>

      <p>
        <a href={`/api/report/${slug}/download`}>Download report</a> ·{" "}
        <a href={`/api/report/${slug}/fixes`}>Download fix list</a> ·{" "}
        <a href={`/badge/${slug}.svg`}>Badge</a>
      </p>
    </main>
  );
}
