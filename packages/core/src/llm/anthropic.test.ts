import { describe, expect, it, vi } from "vitest";

import { AnthropicProvider } from "./anthropic.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("AnthropicProvider", () => {
  it("accumulates input_tokens, output_tokens, and cache_read_input_tokens across calls", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        content: [{ type: "text", text: "{}" }],
        usage: { input_tokens: 100, output_tokens: 40, cache_read_input_tokens: 25 },
      })
    );
    const provider = new AnthropicProvider({ apiKey: "k", model: "claude-sonnet-4-5", fetchImpl });

    await provider.complete({ system: "s", user: "u" });
    await provider.complete({ system: "s", user: "u" });

    expect(provider.getUsage()).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      inputTokens: 200,
      outputTokens: 80,
      cachedTokens: 50,
      requests: 2,
    });
  });

  it("increments requests and reports zero tokens when usage is missing", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ content: [{ type: "text", text: "{}" }] }));
    const provider = new AnthropicProvider({ apiKey: "k", fetchImpl });

    await provider.complete({ system: "s", user: "u" });

    expect(provider.getUsage()).toMatchObject({
      provider: "anthropic",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: 1,
    });
  });
});
