import type { LLMProvider, LLMRequest } from "./provider.js";

export interface AnthropicProviderOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AnthropicProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? process.env.BUSFACTOR_MODEL ?? "claude-sonnet-4-5";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async complete(request: LLMRequest): Promise<string> {
    const response = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 1200,
        system: request.system,
        messages: [{ role: "user", content: request.user }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed: ${response.status}`);
    }
    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return json.content?.find((block) => block.type === "text")?.text ?? "";
  }
}
