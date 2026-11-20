import { AnthropicProvider } from "./anthropic.js";
import { GroqProvider } from "./groq.js";
import type { LLMProvider, LLMRequest } from "./provider.js";

export class MockProvider implements LLMProvider {
  readonly name = "mock";

  constructor(private readonly responder?: (request: LLMRequest) => string) {}

  async complete(request: LLMRequest): Promise<string> {
    if (this.responder !== undefined) return this.responder(request);
    return "{}";
  }
}

export class HeuristicProvider implements LLMProvider {
  readonly name = "heuristic";

  async complete(request: LLMRequest): Promise<string> {
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
