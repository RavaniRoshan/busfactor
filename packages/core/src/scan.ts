import { createSnapshot } from "./snapshot.js";
import { createDefaultScanners } from "./scanners/index.js";
import { scoreFindings } from "./scoring.js";
import { generateOperateMd } from "./operate.js";
import { runLlmPasses } from "./llm/passes.js";
import { createDefaultProvider } from "./llm/mock.js";
import { ENGINE_VERSION, PROMPT_VERSION, RUBRIC_VERSION } from "./version.js";
import { estimateCostUsd, rateFor } from "./llm/cost.js";
import { emptyUsage } from "./llm/provider.js";
import type { LLMProvider } from "./llm/provider.js";
import type { Report, Snapshot } from "./types.js";
import { reportSchema } from "./types.js";

export interface ScanOptions {
  provider?: LLMProvider;
  now?: Date;
  fileCap?: number;
  sizeCapBytes?: number;
}

export async function scanSnapshot(snapshot: Snapshot, options: ScanOptions = {}): Promise<Report> {
  const startedAt = Date.now();
  const provider = options.provider ?? createDefaultProvider();
  const scanners = createDefaultScanners();

  const deterministicFindings = [];
  for (const scanner of scanners) {
    deterministicFindings.push(...(await scanner.scan(snapshot)));
  }

  const llmResult = await runLlmPasses(snapshot, deterministicFindings, provider);
  const findings = [...deterministicFindings, ...llmResult.llmFindings];
  const scored = scoreFindings(findings);

  const authorQuestions = llmResult.authorQuestions.map((question, index) => ({
    id: `q${index + 1}`,
    question: question.question,
    why: question.why,
    evidence: question.evidence,
  }));

  const operateMd = await generateOperateMd(
    snapshot,
    findings,
    authorQuestions,
    llmResult.intent?.purpose,
  );

  const limitations = [...llmResult.limitations];
  if (snapshot.limitedAnalysis) {
    limitations.push("Limited analysis: unsupported or partially supported stack.");
  }

  const usage = provider.getUsage?.() ?? emptyUsage(provider.name);
  const costUsd = estimateCostUsd(usage, rateFor(usage));

  const report = {
    score: scored.score,
    verdict: scored.verdict,
    dimensions: scored.dimensions,
    findings,
    authorQuestions,
    operateMd,
    meta: {
      engineVersion: ENGINE_VERSION,
      rubricVersion: RUBRIC_VERSION,
      promptVersion: PROMPT_VERSION,
      sha: snapshot.sha,
      scannedAt: (options.now ?? new Date()).toISOString(),
      durationMs: Date.now() - startedAt,
      costUsd,
      usage,
      stack: snapshot.stack,
      fileCount: snapshot.stats.fileCount,
      totalBytes: snapshot.stats.totalBytes,
      limitedAnalysis: snapshot.limitedAnalysis,
      source: snapshot.source,
      limitations,
    },
  };

  return reportSchema.parse(report);
}

export async function scanTarget(target: string, options: ScanOptions = {}): Promise<{ snapshot: Snapshot; report: Report }> {
  const snapshot = await createSnapshot(target, options);
  try {
    const report = await scanSnapshot(snapshot, options);
    return { snapshot, report };
  } finally {
    await snapshot.dispose?.();
  }
}
