import type { DimensionId, Finding, Verdict } from "./types.js";
import { DIMENSION_WEIGHTS, DIMENSION_LABELS } from "./types.js";

export interface ScoredDimensions {
  dimension: DimensionId;
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
  findingCount: number;
}

export interface ScoreResult {
  score: number;
  verdict: Verdict;
  dimensions: ScoredDimensions[];
}

export interface TopReason {
  dimension: DimensionId;
  ruleId: string;
  severity: Finding["severity"];
  message: string;
  fix: string;
  effort: "S" | "M" | "L";
}

const SEVERITY_DEDUCTION: Record<Finding["severity"], number> = {
  critical: 50,
  high: 25,
  medium: 10,
  low: 4,
  info: 0,
};

const RUN_BLOCKERS = new Set(["run.readme.missing", "run.steps.missing"]);

function verdictFor(score: number): Verdict {
  if (score >= 85) return "handoff-ready";
  if (score >= 70) return "operable-with-briefing";
  if (score >= 50) return "risky";
  return "author-only";
}

function fixFor(ruleId: string): string {
  if (ruleId.startsWith("secret.")) return "Remove the secret, rotate it, and load it from the environment.";
  if (ruleId.startsWith("deps.")) return "Pin and update dependencies and commit a lockfile.";
  if (ruleId.startsWith("tests.") || ruleId.startsWith("ci.")) return "Add tests and make CI run them.";
  if (ruleId.startsWith("run.")) return "Document and verify a runnable path.";
  if (ruleId.startsWith("config.")) return "Document every environment variable in .env.example.";
  return "Review and fix the reported issue.";
}

function effortFor(severity: Finding["severity"]): "S" | "M" | "L" {
  if (severity === "critical" || severity === "high") return "L";
  if (severity === "medium") return "M";
  return "S";
}

export function scoreFindings(findings: Finding[]): ScoreResult {
  const byDimension = new Map<DimensionId, Finding[]>();
  for (const dimension of Object.keys(DIMENSION_WEIGHTS) as DimensionId[]) {
    byDimension.set(dimension, []);
  }
  for (const finding of findings) {
    byDimension.get(finding.dimension)?.push(finding);
  }

  const dimensions: ScoredDimensions[] = [];
  for (const dimension of Object.keys(DIMENSION_WEIGHTS) as DimensionId[]) {
    const dimensionFindings = byDimension.get(dimension) ?? [];
    let score = 100 - dimensionFindings.reduce((total, finding) => total + SEVERITY_DEDUCTION[finding.severity], 0);
    score = Math.max(0, Math.min(100, score));

    if (dimension === "runnability" && dimensionFindings.some((finding) => RUN_BLOCKERS.has(finding.ruleId))) {
      score = Math.min(score, 5);
    }

    dimensions.push({
      dimension,
      label: DIMENSION_LABELS[dimension],
      score,
      weight: DIMENSION_WEIGHTS[dimension],
      weightedScore: Number(((score * DIMENSION_WEIGHTS[dimension]) / 100).toFixed(2)),
      findingCount: dimensionFindings.length,
    });
  }

  let total = dimensions.reduce((sum, dimension) => sum + (dimension.score * dimension.weight) / 100, 0);
  if (findings.some((finding) => finding.severity === "critical" && finding.ruleId.startsWith("secret."))) {
    total = Math.min(total, 49);
  }
  const score = Math.max(0, Math.min(100, Math.round(total)));

  return { score, verdict: verdictFor(score), dimensions };
}

export function topReasons(findings: Finding[], limit = 5): TopReason[] {
  const severityRank: Record<Finding["severity"], number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };

  return [...findings]
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.dimension.localeCompare(b.dimension))
    .slice(0, limit)
    .map((finding) => ({
      dimension: finding.dimension,
      ruleId: finding.ruleId,
      severity: finding.severity,
      message: finding.message,
      fix: fixFor(finding.ruleId),
      effort: effortFor(finding.severity),
    }));
}
