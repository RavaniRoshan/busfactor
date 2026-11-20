import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

describe("web design system", () => {
  it("defines the extracted design tokens and self-hosted font variables", () => {
    const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
    expect(css).toContain("--spacing-section");
    expect(css).toContain("--container-window");
    expect(css).toContain("--radius-corner-lg");
    expect(css).toContain("--color-brand-primary");
    expect(css).toContain("var(--font-instrument-sans)");
    expect(css).toContain("var(--font-jetbrains-mono)");
  });

  it("ships the showcase image locally", () => {
    expect(existsSync(path.join(root, "public/dusk-road.webp"))).toBe(true);
  });

  it("never imports Figma-proprietary components into the webapp", () => {
    const files = [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "components"))];
    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/@figma\/astraui/);
    }
  });

  it("keeps report pages noindex by default", () => {
    const page = readFileSync(path.join(root, "app/r/[slug]/page.tsx"), "utf8");
    expect(page).toContain("robots: { index: false, follow: false }");
  });
});
