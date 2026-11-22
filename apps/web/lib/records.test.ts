import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeFeedback, records } from "./records";

describe("durable records", () => {
  it("normalizes and rejects email input", () => {
    expect(normalizeEmail("  User@Example.com ")).toBe("user@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("a".repeat(250) + "@example.com")).toBeNull();
  });

  it("normalizes feedback and requires a boolean", () => {
    expect(normalizeFeedback({ slug: "abc123", helpful: true })).toEqual({
      reportSlug: "abc123",
      helpful: true,
      note: "",
    });
    expect(normalizeFeedback({ slug: "abc123", helpful: "yes" })).toBeNull();
    expect(normalizeFeedback({ slug: "", helpful: true })).toBeNull();
  });

  it("does not create duplicate waitlist entries", async () => {
    const email = `dup-${Date.now()}@example.com`;
    expect((await records.addWaitlist({ email })).created).toBe(true);
    expect((await records.addWaitlist({ email: email.toUpperCase() })).created).toBe(false);
    expect(await records.countWaitlist()).toBeGreaterThan(0);
  });

  it("matches unique-index behavior across delete/re-add", async () => {
    const email = `deleted-${Date.now()}@example.com`;
    expect((await records.addWaitlist({ email })).created).toBe(true);
    expect(await records.deleteWaitlist(email)).toBe(1);
    expect((await records.addWaitlist({ email })).created).toBe(true);
    expect((await records.addWaitlist({ email: email.toUpperCase() })).created).toBe(false);
  });

  it("summarizes explicit feedback answers", async () => {
    await records.addFeedback({ reportSlug: `r-${Date.now()}`, helpful: true });
    await records.addFeedback({ reportSlug: `r-${Date.now()}`, helpful: false });
    const summary = await records.feedbackSummary();
    expect(summary.answered).toBe(summary.yes + summary.no);
  });
});
