export interface LLMRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface LLMUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  requests: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<string>;
  getUsage?(): LLMUsage;
}

export function emptyUsage(provider: string, model = ""): LLMUsage {
  return {
    provider,
    model,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    requests: 0,
  };
}

export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1] !== undefined) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}
