import { describe, expect, it } from "vitest";

import { ENGINE_VERSION, RUBRIC_VERSION } from "./index.js";

describe("engine version", () => {
  it("exports the current engine and rubric versions", () => {
    expect(ENGINE_VERSION).toBe("0.1.0");
    expect(RUBRIC_VERSION).toBe("0.1.0");
  });
});
