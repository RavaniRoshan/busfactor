import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("report workspace surface", () => {
  it("ships the same-origin backdrop", () => {
    expect(existsSync(path.join(root, "public/dusk-road.webp"))).toBe(true);
  });

  it("ships the Space UI primitive files", () => {
    for (const file of ["badge.tsx", "card.tsx", "tabs.tsx", "toolbar.tsx"]) {
      expect(existsSync(path.join(root, `components/ui/${file}`))).toBe(true);
    }
  });

  it("defines scoped dark-surface classes without rewriting the theme", () => {
    const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
    for (const token of ["--rw-surface", "--rw-accent", "--rw-success", "--rw-warning", "--rw-danger"]) {
      expect(css).toContain(token);
    }
    for (const cls of [".report-window", ".rw-header", ".rw-nav-active", ".rw-content", ".rw-toolbar-active", ".rw-cite"]) {
      expect(css).toContain(cls);
    }
    expect(css).toContain("--color-brand-primary");
  });

  it("scopes theme-derived tokens to the dark panel", () => {
    const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
    expect(css).toContain("--text-secondary: var(--rw-muted)");
    expect(css).toContain("--muted: var(--rw-surface-raised)");
    expect(css).toContain("--success: var(--rw-success)");
    expect(css).toContain("--danger: var(--rw-danger)");
  });
});
