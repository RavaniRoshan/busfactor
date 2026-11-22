import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { scanSnapshot, scanTarget } from "./scan.js";
import * as snapshotMod from "./snapshot.js";
import { createSnapshot } from "./snapshot.js";
import type { LLMProvider, LLMRequest } from "./llm/provider.js";
import { PROMPT_VERSION } from "./version.js";

vi.mock("./llm/passes.js", async () => {
  const actual = await vi.importActual<typeof import("./llm/passes.js")>("./llm/passes.js");
  return {
    ...actual,
    runLlmPasses: vi.fn(actual.runLlmPasses),
  };
});

import { runLlmPasses } from "./llm/passes.js";

const dirs: string[] = [];

afterEach(() => {
  vi.mocked(runLlmPasses).mockReset();
  vi.restoreAllMocks();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

class ZeroUsageProvider implements LLMProvider {
  readonly name = "zero";
  readonly model = "zero-model";
  private requests = 0;

  async complete(_request: LLMRequest): Promise<string> {
    this.requests += 1;
    return "{}";
  }

  getUsage() {
    return {
      provider: this.name,
      model: this.model,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: this.requests,
    };
  }
}

describe("scanSnapshot", () => {
  it("disposes snapshot even when scan throws", async () => {
    const dispose = vi.fn(async () => undefined);
    const snapshot = {
      root: "/tmp/fake",
      sha: "0".repeat(40),
      source: "local" as const,
      files: [],
      stack: "ts" as const,
      limitedAnalysis: false,
      stats: { fileCount: 0, totalBytes: 0, languageCounts: {} },
      readFile: async () => "",
      dispose,
    };

    vi.spyOn(snapshotMod, "createSnapshot").mockResolvedValue(snapshot as any);
    vi.mocked(runLlmPasses).mockRejectedValueOnce(new Error("boom"));

    await expect(scanTarget("/tmp/fake", {})).rejects.toThrow("boom");
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("includes promptVersion and usage in meta, with costUsd 0 when no rate configured", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "busfactor-scan-"));
    dirs.push(dir);
    writeFileSync(path.join(dir, "README.md"), "# hello\n");
    const snapshot = await createSnapshot(dir);

    const previous = process.env.BUSFACTOR_LLM_RATES_JSON;
    delete process.env.BUSFACTOR_LLM_RATES_JSON;
    try {
      const provider = new ZeroUsageProvider();
      const report = await scanSnapshot(snapshot, { provider });
      expect(report.meta.promptVersion).toBe(PROMPT_VERSION);
      expect(report.meta.costUsd).toBe(0);
      expect(report.meta.usage).toEqual({
        provider: "zero",
        model: "zero-model",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        requests: provider.getUsage().requests,
      });
      expect(report.meta.usage.requests).toBeGreaterThan(0);
    } finally {
      if (previous === undefined) delete process.env.BUSFACTOR_LLM_RATES_JSON;
      else process.env.BUSFACTOR_LLM_RATES_JSON = previous;
    }
  });
});
