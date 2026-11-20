import { describe, expect, it } from "vitest";

import { repoMapSchema } from "./llm/schemas.js";

describe("repoMapSchema", () => {
  it("drops non-object evidence instead of failing the whole map pass", () => {
    const parsed = repoMapSchema.safeParse({
      purpose: "A service",
      modules: [{ name: "api", path: "src/api.ts", purpose: "Handles requests", evidence: ["README.md", 3] }],
      entryPoints: [],
      dataStores: [],
      externalServices: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.modules[0]?.evidence).toEqual([]);
  });
});
