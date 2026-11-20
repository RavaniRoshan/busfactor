import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { jsonSchemas, reportSchema } from "./types.js";

const fixtureDir = fileURLToPath(new URL("../../../fixtures/sample-reports", import.meta.url));

describe("report contract", () => {
  it("matches the exported JSON schema snapshot", () => {
    expect(jsonSchemas.report).toMatchSnapshot();
  });

  it("validates the hand-written sample reports", () => {
    for (const name of ["good.json", "mid.json", "bad.json"]) {
      const raw = JSON.parse(readFileSync(path.join(fixtureDir, name), "utf8"));
      expect(reportSchema.safeParse(raw).success).toBe(true);
    }
  });
});
