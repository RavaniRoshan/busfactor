import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { scanSnapshot } from "./scan.js";
import { createSnapshot } from "./snapshot.js";
import type { LLMProvider, LLMRequest } from "./llm/provider.js";
import { PROMPT_VERSION } from "./version.js";

const dirs: string[] = [];

afterEach(() => {
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
