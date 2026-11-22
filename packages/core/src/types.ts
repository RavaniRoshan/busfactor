import { z } from "zod";
import type { LLMUsage } from "./llm/provider.js";

export const DIMENSION_DEFINITIONS = [
  { id: "runnability", label: "Runnability", weight: 20 },
  { id: "secrets_config", label: "Secrets and config", weight: 15 },
  { id: "failure_observability", label: "Failure handling and observability", weight: 15 },
  { id: "tests_ci", label: "Tests and CI", weight: 15 },
  { id: "critical_paths", label: "Critical paths", weight: 15 },
  { id: "dependencies", label: "Dependencies", weight: 10 },
  { id: "knowledge_capture", label: "Knowledge capture", weight: 10 },
] as const;

export type DimensionId = (typeof DIMENSION_DEFINITIONS)[number]["id"];

export const DIMENSION_IDS = DIMENSION_DEFINITIONS.map((dimension) => dimension.id) as [
  DimensionId,
  ...DimensionId[],
];

export const DIMENSION_WEIGHTS: Record<DimensionId, number> = Object.fromEntries(
  DIMENSION_DEFINITIONS.map((dimension) => [dimension.id, dimension.weight]),
) as Record<DimensionId, number>;

export const DIMENSION_LABELS: Record<DimensionId, string> = Object.fromEntries(
  DIMENSION_DEFINITIONS.map((dimension) => [dimension.id, dimension.label]),
) as Record<DimensionId, string>;

export const dimensionIdSchema = z.enum(DIMENSION_IDS);

export const severitySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export type Severity = z.infer<typeof severitySchema>;

export const findingSourceSchema = z.enum(["deterministic", "llm"]);
export type FindingSource = z.infer<typeof findingSourceSchema>;

export const evidenceSchema = z
  .object({
    file: z.string().min(1),
    lineStart: z.number().int().positive(),
    lineEnd: z.number().int().positive(),
    quote: z.string().min(1).max(200),
  })
  .strict()
  .refine((evidence) => evidence.lineEnd >= evidence.lineStart, {
    message: "lineEnd must be greater than or equal to lineStart",
    path: ["lineEnd"],
  });
export type Evidence = z.infer<typeof evidenceSchema>;

export const findingSchema = z
  .object({
    id: z.string().min(1),
    dimension: dimensionIdSchema,
    ruleId: z.string().min(1),
    severity: severitySchema,
    message: z.string().min(1),
    evidence: z.array(evidenceSchema).default([]),
    source: findingSourceSchema,
    validated: z.boolean().default(false),
  })
  .strict();
export type Finding = z.infer<typeof findingSchema>;

export const authorQuestionSchema = z
  .object({
    id: z.string().min(1),
    question: z.string().min(1),
    why: z.string().min(1),
    evidence: z.array(evidenceSchema).min(1),
  })
  .strict();
export type AuthorQuestion = z.infer<typeof authorQuestionSchema>;

export const snapshotFileSchema = z
  .object({
    path: z.string().min(1),
    size: z.number().int().nonnegative(),
    language: z.string().min(1),
    binary: z.boolean(),
    ignoredReason: z.string().optional(),
  })
  .strict();
export type SnapshotFile = z.infer<typeof snapshotFileSchema>;

export const stackSchema = z.enum(["js", "ts", "python", "mixed", "unsupported"]);
export type Stack = z.infer<typeof stackSchema>;

export const gitAuthorSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    commits: z.number().int().nonnegative(),
  })
  .strict();

export const snapshotStatsSchema = z
  .object({
    fileCount: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
    languageCounts: z.record(z.string(), z.number().int().nonnegative()),
    gitAuthors: z.array(gitAuthorSchema).optional(),
  })
  .strict();

export const snapshotSchema = z
  .object({
    root: z.string().min(1),
    sha: z.string().min(1),
    source: z.enum(["local", "github"]),
    files: z.array(snapshotFileSchema),
    stack: stackSchema,
    limitedAnalysis: z.boolean(),
    stats: snapshotStatsSchema,
  })
  .strict();
export type SnapshotData = z.infer<typeof snapshotSchema>;

export interface Snapshot extends SnapshotData {
  readFile(path: string): Promise<string>;
  dispose?(): Promise<void>;
}

export interface SnapshotOptions {
  fileCap?: number;
  sizeCapBytes?: number;
  fetchImpl?: typeof fetch;
}

export const verdictSchema = z.enum([
  "handoff-ready",
  "operable-with-briefing",
  "risky",
  "author-only",
]);
export type Verdict = z.infer<typeof verdictSchema>;

export const dimensionScoreSchema = z
  .object({
    dimension: dimensionIdSchema,
    label: z.string().min(1),
    score: z.number().min(0).max(100),
    weight: z.number().positive(),
    weightedScore: z.number().min(0),
    findingCount: z.number().int().nonnegative(),
  })
  .strict();
export type DimensionScore = z.infer<typeof dimensionScoreSchema>;

export const llmUsageSchema: z.ZodType<LLMUsage> = z
  .object({
    provider: z.string().min(1),
    model: z.string(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cachedTokens: z.number().int().nonnegative(),
    requests: z.number().int().nonnegative(),
  })
  .strict();

export const reportMetaSchema = z
  .object({
    engineVersion: z.string().min(1),
    rubricVersion: z.string().min(1),
    promptVersion: z.string().min(1),
    sha: z.string().min(1),
    scannedAt: z.string().datetime(),
    durationMs: z.number().int().nonnegative(),
    costUsd: z.number().nonnegative(),
    usage: llmUsageSchema,
    stack: stackSchema,
    fileCount: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
    limitedAnalysis: z.boolean(),
    source: z.enum(["local", "github"]),
    limitations: z.array(z.string()).default([]),
  })
  .strict();

export const reportSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    verdict: verdictSchema,
    dimensions: z.array(dimensionScoreSchema).length(DIMENSION_DEFINITIONS.length),
    findings: z.array(findingSchema),
    authorQuestions: z.array(authorQuestionSchema),
    operateMd: z.string().min(1),
    meta: reportMetaSchema,
  })
  .strict();
export type Report = z.infer<typeof reportSchema>;

export interface Scanner {
  id: string;
  dimension: DimensionId;
  description: string;
  scan(snapshot: Snapshot): Promise<Finding[]> | Finding[];
}

export const jsonSchemas = {
  evidence: z.toJSONSchema(evidenceSchema),
  finding: z.toJSONSchema(findingSchema),
  authorQuestion: z.toJSONSchema(authorQuestionSchema),
  snapshot: z.toJSONSchema(snapshotSchema),
  report: z.toJSONSchema(reportSchema),
} as const;
