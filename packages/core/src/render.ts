import type { Report } from "./types.js";

export function renderMarkdownReport(report: Report): string {
  const lines: string[] = [];
  lines.push(`# BusFactor report`);
  lines.push("");
  lines.push(`**Score:** ${report.score}/100`);
  lines.push(`**Verdict:** ${report.verdict}`);
  lines.push(`**SHA:** ${report.meta.sha}`);
  lines.push("");
  lines.push("## Dimensions");
  lines.push("");
  for (const dimension of report.dimensions) {
    lines.push(`- ${dimension.label}: ${dimension.score}/100 (${dimension.findingCount} findings)`);
  }
  lines.push("");
  lines.push("## Top findings");
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    for (const finding of report.findings.slice(0, 20)) {
      lines.push(`- [${finding.severity}] ${finding.message} (${finding.evidence.map((item) => `${item.file}:${item.lineStart}`).join(", ")})`);
    }
  }
  lines.push("");
  lines.push("## Author questions");
  lines.push("");
  if (report.authorQuestions.length === 0) {
    lines.push("No author-only questions were identified.");
  } else {
    for (const question of report.authorQuestions) {
      lines.push(`- ${question.question}`);
    }
  }
  lines.push("");
  lines.push("## OPERATE.md");
  lines.push("");
  lines.push(report.operateMd);
  lines.push("");
  return lines.join("\n");
}
