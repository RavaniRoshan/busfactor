import { Badge } from "../ui/badge";
import { bandForScore, severityTone, type Report } from "../../lib/report-view";
import { CiteChip } from "./cite-chip";

export function VerdictView({ report }: { report: Report }) {
  return (
    <section aria-labelledby="rw-verdict-title">
      <p className="rw-eyebrow">OPERABILITY VERDICT</p>
      <h2 id="rw-verdict-title" className="type-display mt-sm">
        {bandForScore(report.score)}
      </h2>
      <p className="mt-md text-text-secondary">{report.verdict.replace(/-/g, " ")}</p>
      <p className="mt-xl flex items-baseline gap-sm">
        <span className="type-display tabular-nums">{report.score}</span>
        <span className="text-text-secondary">/ 100</span>
      </p>

      {report.findings.length === 0 ? (
        <p className="mt-xl text-text-secondary">No findings were recorded.</p>
      ) : (
        <ul className="mt-xl flex flex-col divide-y divide-border-secondary">
          {report.findings.slice(0, 5).map((finding, index) => (
            <li key={`${finding.message}-${index}`} className="flex flex-wrap items-center justify-between gap-md py-lg">
              <span className="flex flex-col items-start gap-sm">
                <span>{finding.message}</span>
                {finding.evidence?.[0] && (
                  <CiteChip file={finding.evidence[0].file} line={finding.evidence[0].lineStart} />
                )}
              </span>
              <Badge variant={severityTone(finding.severity)}>{finding.severity}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
