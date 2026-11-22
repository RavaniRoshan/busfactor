import { AnthropicProvider } from "./anthropic.js";
import { GroqProvider } from "./groq.js";
import type { LLMProvider, LLMRequest, LLMUsage } from "./provider.js";
import { emptyUsage } from "./provider.js";

export class MockProvider implements LLMProvider {
  readonly name = "mock";
  readonly model = "mock";
  private readonly usage: LLMUsage = emptyUsage(this.name, this.model);

  constructor(private readonly responder?: (request: LLMRequest) => string) {}

  async complete(request: LLMRequest): Promise<string> {
    this.usage.requests += 1;
    if (this.responder !== undefined) return this.responder(request);
    return "{}";
  }

  getUsage(): LLMUsage {
    return { ...this.usage };
  }
}

export class HeuristicProvider implements LLMProvider {
  readonly name = "heuristic";
  readonly model = "heuristic";
  private readonly usage: LLMUsage = emptyUsage(this.name, this.model);

  async complete(request: LLMRequest): Promise<string> {
    this.usage.requests += 1;
    const text = `${request.system}\n${request.user}`.toLowerCase();
    if (text.includes("repository map")) {
      return JSON.stringify({
        purpose: "Unknown from automated heuristics.",
        modules: [],
        entryPoints: [],
        dataStores: [],
        externalServices: [],
      });
    }
    if (text.includes("purpose and key flows")) {
      return JSON.stringify({ purpose: "Unknown from automated heuristics.", keyFlows: [] });
    }
    if (text.includes("questions")) {
      return JSON.stringify({ questions: [] });
    }
    if (text.includes("risk")) {
      return JSON.stringify({ risks: [] });
    }
    return "{}";
  }

  getUsage(): LLMUsage {
    return { ...this.usage };
  }
}

export function createDefaultProvider(): LLMProvider {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey !== undefined && groqKey !== "") {
    return new GroqProvider({ apiKey: groqKey });
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey !== undefined && anthropicKey !== "") {
    return new AnthropicProvider({ apiKey: anthropicKey });
  }
  return new HeuristicProvider();
}
