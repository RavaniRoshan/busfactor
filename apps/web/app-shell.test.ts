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

describe("webapp shell", () => {
  it("defines the tokens and self-hosted font variables", () => {
    const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
    expect(css).toContain("--spacing-section");
    expect(css).toContain("--container-page");
    expect(css).toContain("--radius-corner-lg");
    expect(css).toContain("--color-brand-primary");
    expect(css).toContain("var(--font-instrument-sans)");
    expect(css).toContain("var(--font-jetbrains-mono)");
  });

  it("routes the root into the app", () => {
    const page = readFileSync(path.join(root, "app/page.tsx"), "utf8");
    expect(page).toContain('redirect("/scan")');
    expect(page).not.toMatch(/landing|figma|dusk/i);
  });

  it("has no landing-page artifacts left", () => {
    for (const file of ["design.md", "components/quickstart-tabs.tsx"]) {
      expect(existsSync(path.join(root, file))).toBe(false);
    }
    expect(existsSync(path.join(root, "../BusFactor Landing Page"))).toBe(false);
  });

  it("keeps Figma and landing references out of webapp source", () => {
    const files = [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "components"))];
    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/@figma|astraui|dusk-road|landing page/i);
    }
  });

  it("keeps report pages noindex by default", () => {
    const page = readFileSync(path.join(root, "app/r/[slug]/page.tsx"), "utf8");
    expect(page).toContain("robots: { index: false, follow: false }");
  });

  it("allows eval only in the development CSP", () => {
    const config = readFileSync(path.join(root, "next.config.mjs"), "utf8");
    expect(config).toContain('process.env.NODE_ENV === "development"');
    expect(config).toContain("'unsafe-eval'");
    expect(config).toContain("isDev ?");
  });

  it("links the app routes together", () => {
    const chrome = readFileSync(path.join(root, "components/site-chrome.tsx"), "utf8");
    const scan = readFileSync(path.join(root, "app/scan/page.tsx"), "utf8");
    const docs = readFileSync(path.join(root, "app/docs/page.tsx"), "utf8");
    const report = readFileSync(path.join(root, "app/r/[slug]/page.tsx"), "utf8");

    expect(chrome).toContain('href: "/scan"');
    expect(chrome).toContain('href: "/docs"');
    expect(chrome).not.toContain('/#');
    expect(scan).toContain('href="/docs"');
    expect(docs).toContain('href="/scan"');
    expect(report).toContain('href="/scan"');
    expect(report).toContain('href="/docs"');
    expect(report).toContain('href="/"');
  });
});
