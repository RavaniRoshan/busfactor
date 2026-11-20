import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { scanTarget } = await import(path.join(root, "packages/core/dist/index.js"));
const labels = JSON.parse(fs.readFileSync(path.join(root, "docs/eval/labels.json"), "utf8"));

const bands = ["author-only", "risky", "operable-with-briefing", "handoff-ready"];
function bandIndex(verdict) {
  return bands.indexOf(verdict);
}

const results = [];
for (const repo of labels.repos) {
  const repoPath = path.resolve(root, repo.path);
  const { report } = await scanTarget(repoPath, {});
  const secretFindings = report.findings.filter((finding) => finding.ruleId.startsWith("secret."));
  const predictedSecret = secretFindings.length > 0;
  results.push({
    id: repo.id,
    score: report.score,
    verdict: report.verdict,
    expectedVerdict: repo.verdict,
    verdictAgreement: Math.abs(bandIndex(report.verdict) - bandIndex(repo.verdict)) <= 1,
    secretPrecision: predictedSecret === repo.hasSecret ? 1 : 0,
    secretRecall: predictedSecret === repo.hasSecret ? 1 : 0,
    knownIssuesFound: repo.knownIssues.filter((ruleId) => report.findings.some((finding) => finding.ruleId === ruleId)).length,
    knownIssuesTotal: repo.knownIssues.length,
  });
}

console.table(results.map((result) => ({
  repo: result.id,
  score: result.score,
  verdict: result.verdict,
  expected: result.expectedVerdict,
  agree: result.verdictAgreement,
  issues: `${result.knownIssuesFound}/${result.knownIssuesTotal}`,
})));

const agreement = results.filter((result) => result.verdictAgreement).length / results.length;
const issueRecall = results.reduce((total, result) => total + result.knownIssuesFound, 0) / Math.max(1, results.reduce((total, result) => total + result.knownIssuesTotal, 0));
console.log(`Verdict agreement: ${(agreement * 100).toFixed(1)}%`);
console.log(`Known-issue recall: ${(issueRecall * 100).toFixed(1)}%`);
console.log(`Gold set size: ${results.length} (PDR target is 20)`);

fs.writeFileSync(path.join(root, "docs/eval/last.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
if (results.length < 15) {
  console.log("gold_set_small: provide more labeled repositories before V1 calibration.");
}
if (agreement < 0.8) {
  console.log("verdict agreement below 80%; review disagreements before proceeding.");
}
