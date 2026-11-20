import { execFileSync } from "node:child_process";
import fs from "node:fs";

const reportPath = process.argv[2] ?? "busfactor-report/report.json";
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const prNumber = process.env.PR_NUMBER;

const lines = [];
lines.push("## BusFactor report");
lines.push("");
lines.push(`Score: **${report.score}/100** (${report.verdict})`);
lines.push("");
lines.push("### Top findings");
if (report.findings.length === 0) {
  lines.push("No findings.");
} else {
  for (const finding of report.findings.slice(0, 10)) {
    const location = finding.evidence?.[0] ? ` (${finding.evidence[0].file}:${finding.evidence[0].lineStart})` : "";
    lines.push(`- [${finding.severity}] ${finding.message}${location}`);
  }
}
lines.push("");
lines.push("_Score is computed by deterministic code; the LLM explains and drafts._");

const body = lines.join("\n");
if (prNumber) {
  execFileSync("gh", ["pr", "comment", prNumber, "--body", body], { stdio: "inherit" });
} else {
  console.log(body);
}
