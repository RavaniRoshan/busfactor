import type { LLMProvider, LLMRequest, LLMUsage } from "./provider.js";
import { emptyUsage } from "./provider.js";

export interface GroqProviderOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_MODEL = "openai/gpt-oss-20b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  readonly model: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly usage: LLMUsage;

  constructor(options: GroqProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? process.env.BUSFACTOR_GROQ_MODEL ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.usage = emptyUsage(this.name, this.model);
  }

  getUsage(): LLMUsage {
    return { ...this.usage };
  }

  async complete(request: LLMRequest): Promise<string> {
    const response = await this.fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_completion_tokens: request.maxTokens ?? 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      }),
    });

    if (!response.ok) {
      // Never echo the body: it can contain request text from untrusted repos.
      throw new Error(`Groq request failed: ${response.status}`);
    }
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    this.usage.requests += 1;
    this.usage.inputTokens += json.usage?.prompt_tokens ?? 0;
    this.usage.outputTokens += json.usage?.completion_tokens ?? 0;
    return json.choices?.[0]?.message?.content ?? "";
  }
}
