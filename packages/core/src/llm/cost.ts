import type { LLMUsage } from "./provider.js";

export interface ModelRate {
  inputPerMTokUsd: number;
  outputPerMTokUsd: number;
}

function isModelRate(value: unknown): value is ModelRate {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.inputPerMTokUsd === "number" &&
    Number.isFinite(record.inputPerMTokUsd) &&
    record.inputPerMTokUsd >= 0 &&
    typeof record.outputPerMTokUsd === "number" &&
    Number.isFinite(record.outputPerMTokUsd) &&
    record.outputPerMTokUsd >= 0
  );
}

export function estimateCostUsd(usage: LLMUsage, rate?: ModelRate): number {
  if (rate === undefined) return 0;
  const inputCost = (usage.inputTokens / 1_000_000) * rate.inputPerMTokUsd;
  const outputCost = (usage.outputTokens / 1_000_000) * rate.outputPerMTokUsd;
  return inputCost + outputCost;
}

export function rateFor(
  usage: Pick<LLMUsage, "provider" | "model">,
  rawJson?: string,
): ModelRate | undefined {
  const source = rawJson ?? process.env.BUSFACTOR_LLM_RATES_JSON;
  if (source === undefined || source.trim() === "") return undefined;
  try {
    const parsed = JSON.parse(source) as unknown;
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const record = parsed as Record<string, unknown>;
    const key = `${usage.provider}/${usage.model}`;
    const value = record[key];
    return isModelRate(value) ? value : undefined;
  } catch {
    return undefined;
  }
}
