import { describe, expect, it, vi } from "vitest";

import { GroqProvider } from "./groq.js";
import { createDefaultProvider } from "./mock.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GroqProvider", () => {
  it("posts an OpenAI-compatible chat request with a bearer key", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: '{"answer":42}' } }] })
    );
    const provider = new GroqProvider({ apiKey: "test-key", fetchImpl });

    const text = await provider.complete({ system: "sys", user: "user", maxTokens: 500 });

    expect(text).toBe('{"answer":42}');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.max_completion_tokens).toBe(500);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "user" },
    ]);
  });

  it("uses the configured model instead of the default", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: "ok" } }] }));
    const provider = new GroqProvider({ apiKey: "k", model: "openai/gpt-oss-20b", fetchImpl });
    await provider.complete({ system: "s", user: "u" });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((JSON.parse(init.body as string) as { model: string }).model).toBe("openai/gpt-oss-20b");
  });

  it("throws on a non-OK response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "rate limit" }, 429));
    const provider = new GroqProvider({ apiKey: "k", fetchImpl });
    await expect(provider.complete({ system: "s", user: "u" })).rejects.toThrow(/Groq request failed: 429/);
  });

  it("selects Groq when GROQ_API_KEY is set", () => {
    const previous = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "test-key";
    expect(createDefaultProvider().name).toBe("groq");
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  });

  it("accumulates provider-reported token usage across calls", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: "{}" } }],
        usage: { prompt_tokens: 120, completion_tokens: 30 },
      })
    );
    const provider = new GroqProvider({ apiKey: "k", fetchImpl });
    await provider.complete({ system: "s", user: "u" });
    await provider.complete({ system: "s", user: "u" });
    expect(provider.getUsage()).toEqual({
      provider: "groq",
      model: "openai/gpt-oss-20b",
      inputTokens: 240,
      outputTokens: 60,
      cachedTokens: 0,
      requests: 2,
    });
  });

  it("increments requests and reports zero tokens when usage is missing", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: "{}" } }] }));
    const provider = new GroqProvider({ apiKey: "k", fetchImpl });
    await provider.complete({ system: "s", user: "u" });
    expect(provider.getUsage()).toMatchObject({
      provider: "groq",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: 1,
    });
  });
});
