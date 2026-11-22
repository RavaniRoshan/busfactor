import { CopyButton } from "@/components/copy-button";
import { PageFrame, PageIntro } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Documentation — BusFactor",
  description: "Quickstart, CLI reference, scoring rubric, limits and privacy notes for BusFactor.",
};

const sections = [
  {
    id: "quickstart",
    title: "Quickstart",
    body: "Scan a public GitHub repository in the hosted scanner, or scan a local folder with the CLI. No account, no signup.",
    command: "npx busfactor scan ./my-repo",
  },
  {
    id: "cli",
    title: "CLI",
    body: "Export Markdown or JSON, and fail CI when operability drops below a threshold. When published, the CLI will be available as `npx busfactor`; until then, run it from the repository.",
    command: "busfactor scan <path|url> --out <dir> --format md,json --fail-under <score>",
  },
];

const dimensions = [
  "Runnability",
  "Secrets and config",
  "Failure handling and observability",
  "Tests and CI",
  "Critical paths",
  "Dependencies",
  "Knowledge capture",
];

export default function DocsPage() {
  return (
    <PageFrame>
      <PageIntro eyebrow="Reference" title="BusFactor documentation" text="Everything you need to run a scan and read the result." />
      <div className="mt-xl flex justify-center">
        <a href="/scan" className={buttonVariants({ variant: "default" })}>
          Scan a repository
        </a>
      </div>
      <div className="mx-auto mt-3xl grid max-w-article gap-xl">
        {sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
            <h2 id={`${section.id}-title`} className="text-label font-medium text-text-primary">
              {section.title}
            </h2>
            <p className="mt-sm text-label-sm text-text-secondary">{section.body}</p>
            <div className="mt-lg flex flex-wrap items-center justify-between gap-md rounded-corner-md bg-bg-faint p-lg">
              <code className="break-words font-mono text-label-sm text-text-primary">{section.command}</code>
              <CopyButton text={section.command} variant="outline" size="sm">
                Copy
              </CopyButton>
            </div>
          </section>
        ))}
        <section id="scoring" aria-labelledby="scoring-title" className="scroll-mt-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
          <h2 id="scoring-title" className="text-label font-medium text-text-primary">
            Scoring
          </h2>
          <p className="mt-sm text-label-sm text-text-secondary">Seven dimensions, 100 points. Code computes the score; the LLM explains and drafts. The rubric is versioned and public.</p>
          <ul className="mt-lg flex flex-wrap gap-sm">
            {dimensions.map((dimension) => (
              <li key={dimension}>
                <Badge variant="secondary">{dimension}</Badge>
              </li>
            ))}
          </ul>
        </section>
        <section id="limits" aria-labelledby="limits-title" className="scroll-mt-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
          <h2 id="limits-title" className="text-label font-medium text-text-primary">Limits</h2>
          <p className="mt-sm text-label-sm text-text-secondary">5,000 files or 25 MB per scan. The hosted scanner accepts public GitHub URLs only; local paths are for <code className="font-mono">npx busfactor scan ./my-repo</code>. No repository code is executed.</p>
        </section>
        <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
          <h2 id="privacy-title" className="text-label font-medium text-text-primary">Privacy</h2>
          <p className="mt-sm text-label-sm text-text-secondary">Source snapshots are deleted after 7 days. Secrets are redacted everywhere, including logs.</p>
        </section>
      </div>
    </PageFrame>
  );
}
