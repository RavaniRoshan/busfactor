import Image from "next/image";
import {
  Archive,
  Bot,
  CircleHelp,
  FileCode2,
  FileText,
  Gauge,
  Globe,
  Link as LinkIcon,
  Lock,
  Map as MapIcon,
  Plug,
  Terminal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { QuickstartTabs } from "@/components/quickstart-tabs";
import { ReportWindow } from "@/components/report-window";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { WaitlistForm } from "@/components/waitlist-form";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

const LOCAL_COMMAND = "npx busfactor scan ./my-repo";
const GITHUB_COMMAND = "npx busfactor scan https://github.com/owner/repo";
const CLI_COMMAND = "busfactor scan <path|url> --out <dir> --format md,json --fail-under <score>";
const MCP_COMMAND = "node packages/mcp/dist/index.js";
const SKILL_PATH = "skills/handoff/SKILL.md";

function Section({
  id,
  labelledBy,
  className,
  children,
}: {
  id?: string;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("mx-auto w-full max-w-page scroll-mt-xl px-xl py-4xl md:px-2xl md:py-section", className)}
    >
      {children}
    </section>
  );
}

function SectionHeader({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <div className="mx-auto flex max-w-copy flex-col items-center gap-md text-center">
      <h2 id={id} className="type-display">
        {title}
      </h2>
      <p className="text-label text-text-secondary">{text}</p>
    </div>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto flex w-full max-w-page flex-col items-center px-xl pt-3xl pb-4xl text-center md:px-2xl md:pt-4xl md:pb-section">
      <p className="text-label-sm text-text-secondary">CLI · MCP server · Claude Code skill</p>
      <h1 id="hero-title" className="type-hero mt-lg max-w-article">
        Could someone who didn&apos;t write this safely run it?
      </h1>
      <p className="mt-xl max-w-copy text-label text-text-secondary">
        BusFactor scans a repository and returns an operability verdict, a risk map, an OPERATE.md, and questions only the
        original author can answer. Every claim cites a file and line.
      </p>
      <div className="mt-2xl flex flex-col items-center gap-md">
        <CopyButton text={LOCAL_COMMAND}>{LOCAL_COMMAND}</CopyButton>
        <p className="text-xs text-text-secondary">Local paths or public GitHub URLs. No repository code is executed.</p>
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section aria-label="Example BusFactor report" className="relative isolate overflow-hidden px-md py-3xl md:px-2xl md:py-section">
      <Image src="/dusk-road.webp" alt="" fill sizes="100vw" className="-z-10 object-cover" />
      <ReportWindow />
    </section>
  );
}

const features: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Gauge, title: "An operability verdict", text: "A plain answer to whether someone new can run it, with the score behind it." },
  { icon: MapIcon, title: "A risk map", text: "Where a handoff breaks first, from setup and deploys to recovery and ownership." },
  { icon: FileText, title: "A drafted OPERATE.md", text: "A runbook assembled from what the repository already says about itself." },
  { icon: CircleHelp, title: "Questions for the author", text: "The gaps no scan can close, written down before the author moves on." },
  { icon: LinkIcon, title: "Every claim is cited", text: "Each finding points to a file and line, so you can check it in seconds." },
  { icon: FileCode2, title: "Markdown and JSON", text: "Reports for people and for pipelines. Export one format or both." },
];

function Features() {
  return (
    <Section labelledBy="features-title">
      <h2 id="features-title" className="sr-only">
        What a scan returns
      </h2>
      <ul className="grid gap-x-2xl gap-y-3xl sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: FeatureIcon, title, text }) => (
          <li key={title} className="mx-auto flex max-w-copy flex-col items-center text-center">
            <FeatureIcon size={24} strokeWidth={1.5} className="text-text-primary" aria-hidden="true" />
            <p className="mt-lg text-label font-medium text-text-primary">{title}</p>
            <p className="mt-sm text-label-sm text-text-secondary">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ScoreVisual() {
  const widths = ["w-11/12", "w-3/4", "w-5/6", "w-1/2", "w-1/3", "w-1/4", "w-2/3"];
  return (
    <div className="flex w-full max-w-copy items-end gap-xl" aria-hidden="true">
      <div className="flex flex-1 flex-col gap-sm">
        {widths.map((width, index) => (
          <div key={index} className="h-xs w-full rounded-corner-full bg-bg-subtle">
            <div className={cn("h-full rounded-corner-full bg-brand-primary", width, (index === 4 || index === 5) && "bg-warning")} />
          </div>
        ))}
      </div>
      <div className="flex flex-col items-end">
        <span className="type-display tabular-nums">100</span>
        <span className="text-xs text-text-secondary">points</span>
      </div>
    </div>
  );
}

function IntegrationVisual() {
  return (
    <div className="flex items-center -space-x-md" aria-hidden="true">
      {[Terminal, Plug, Bot].map((TileIcon, index) => (
        <div
          key={index}
          className={cn(
            "flex size-4xl items-center justify-center rounded-corner-lg border border-border-primary bg-surface-bg text-text-primary",
            index === 0 && "-rotate-6 translate-y-sm",
            index === 1 && "z-10 -translate-y-sm",
            index === 2 && "rotate-6 translate-y-sm"
          )}
        >
          <TileIcon size={32} strokeWidth={1.5} />
        </div>
      ))}
    </div>
  );
}

function HighlightCard({ visual, title, text }: { visual: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-corner-lg border border-border-secondary bg-surface-secondary-bg px-xl pt-2xl pb-2xl text-center md:px-2xl">
      <div className="flex h-visual w-full items-center justify-center" aria-hidden="true">
        {visual}
      </div>
      <h3 className="mt-xl text-label font-medium">{title}</h3>
      <p className="mt-sm max-w-copy text-label-sm text-text-secondary">{text}</p>
    </div>
  );
}

function Highlights() {
  return (
    <Section labelledBy="highlights-title" className="pt-0 md:pt-0">
      <h2 id="highlights-title" className="sr-only">
        How BusFactor works
      </h2>
      <div className="grid gap-xl lg:grid-cols-2">
        <HighlightCard
          visual={<ScoreVisual />}
          title="Code scores. The model explains."
          text="Seven dimensions, 100 points. Code computes the score; the LLM explains and drafts. The rubric is public and versioned."
        />
        <HighlightCard
          visual={<IntegrationVisual />}
          title="Works where your agents work"
          text="Run it from the terminal, expose it through the MCP server, or hand it to Claude Code as a skill."
        />
      </div>
    </Section>
  );
}

function Quickstart() {
  return (
    <Section id="quickstart" labelledBy="quickstart-title">
      <SectionHeader id="quickstart-title" title="Start with one command" text="Point it at a folder on your machine, or at any public GitHub repository." />
      <QuickstartTabs local={LOCAL_COMMAND} github={GITHUB_COMMAND} />
    </Section>
  );
}

const integrations = [
  { badge: "npx", title: "Command line", text: "Scan, export Markdown or JSON, and gate CI with a minimum score.", snippet: LOCAL_COMMAND, copyLabel: "Copy command" },
  { badge: "3 tools", title: "MCP server", text: "Exposes scan_repo, get_report, and generate_operate_md to any MCP client.", snippet: MCP_COMMAND, copyLabel: "Copy command" },
  { badge: "Skill", title: "Claude Code skill", text: "A ready-made handoff skill for Claude Code, checked into the repository.", snippet: SKILL_PATH, copyLabel: "Copy path" },
];

function Integrations() {
  return (
    <Section id="integrations" labelledBy="integrations-title">
      <SectionHeader id="integrations-title" title="Use it where you work" text="The same scan behind a CLI, an MCP server, and a Claude Code skill." />
      <ul className="mt-3xl grid gap-xl md:grid-cols-3">
        {integrations.map((item) => (
          <li key={item.title} className="flex flex-col items-center rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-2xl text-center">
            <Badge variant="secondary">{item.badge}</Badge>
            <h3 className="mt-lg text-label font-medium">{item.title}</h3>
            <p className="mt-sm text-label-sm text-text-secondary">{item.text}</p>
            <code className="mt-xl w-full truncate rounded-corner-md bg-bg-faint px-lg py-md font-mono text-xs text-text-primary">
              {item.snippet}
            </code>
            <CopyButton text={item.snippet} variant="ghost" className="mt-md text-text-primary hover:text-text-secondary">
              {item.copyLabel}
            </CopyButton>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const flags = [
  { flag: "--out <dir>", text: "Directory the report is written to." },
  { flag: "--format md,json", text: "Markdown, JSON, or both." },
  { flag: "--fail-under <score>", text: "Exit with code 2 when the score falls below this bar." },
];

const exitCodes = [
  { code: "0", text: "Success", variant: "success" },
  { code: "2", text: "--fail-under missed", variant: "warning" },
  { code: "1", text: "Error", variant: "danger" },
] as const;

function CliReference() {
  return (
    <Section id="cli" labelledBy="cli-title">
      <SectionHeader id="cli-title" title="Built for CI" text="Fail the build when operability drops below your bar. The full CLI fits on one screen." />
      <div className="mx-auto mt-3xl w-full max-w-article overflow-hidden rounded-corner-lg border border-border-secondary bg-surface-secondary-bg">
        <div className="flex items-center justify-between gap-lg border-b border-border-secondary px-xl py-lg">
          <span className="flex items-center gap-sm font-mono text-label-sm text-text-primary">
            <Terminal size={16} aria-hidden="true" />
            busfactor scan
          </span>
          <CopyButton text={CLI_COMMAND} variant="ghost" className="text-text-primary hover:text-text-secondary">
            Copy usage
          </CopyButton>
        </div>
        <div className="flex flex-col gap-md p-lg">
          <div className="flex flex-col gap-sm rounded-corner-md bg-bg-faint p-lg">
            <span className="text-xs text-text-secondary">Usage</span>
            <code className="break-words font-mono text-label-sm text-text-primary">{CLI_COMMAND}</code>
          </div>
          {flags.map((item) => (
            <div key={item.flag} className="flex flex-col gap-xs rounded-corner-md bg-bg-faint p-lg sm:flex-row sm:items-center sm:justify-between sm:gap-xl">
              <code className="shrink-0 font-mono text-label-sm text-text-primary">{item.flag}</code>
              <span className="text-label-sm text-text-secondary sm:text-right">{item.text}</span>
            </div>
          ))}
          <div className="flex flex-col gap-md rounded-corner-md bg-bg-faint p-lg">
            <span className="text-xs text-text-secondary">Exit codes</span>
            <ul className="flex flex-wrap gap-x-xl gap-y-md">
              {exitCodes.map((item) => (
                <li key={item.code} className="flex items-center gap-sm">
                  <Badge variant={item.variant}>{item.code}</Badge>
                  <span className="text-label-sm text-text-primary">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

const limits: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Archive, title: "5,000 files or 25 MB", text: "per scan" },
  { icon: Globe, title: "Public GitHub or local", text: "the two supported sources" },
  { icon: Lock, title: "Nothing is executed", text: "repository code never runs" },
  { icon: Trash2, title: "Deleted after 7 days", text: "source snapshots are removed" },
];

function Limits() {
  return (
    <Section id="limits" labelledBy="limits-title">
      <SectionHeader id="limits-title" title="Limits, stated plainly" text="What a scan can read, and what happens to your code afterwards." />
      <ul className="mt-3xl grid gap-x-2xl gap-y-3xl sm:grid-cols-2 lg:grid-cols-4">
        {limits.map(({ icon: LimitIcon, title, text }) => (
          <li key={title} className="flex flex-col items-center text-center">
            <LimitIcon size={24} strokeWidth={1.5} className="text-text-primary" aria-hidden="true" />
            <p className="mt-lg text-label font-medium text-text-primary">{title}</p>
            <p className="mt-xs text-label-sm text-text-secondary">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const faq = [
  { question: "Does it store private code?", answer: "No by default. The private path is the local CLI with your own key." },
  { question: "Can I publish a score?", answer: "Only opt-in. Third-party reports are noindex by default." },
  { question: "What if it cannot analyze something?", answer: "It says so in the report. Unknown beats a guess." },
];

function Faq() {
  return (
    <Section labelledBy="faq-title">
      <SectionHeader id="faq-title" title="Questions we get asked" text="What BusFactor does, and what it deliberately does not do." />
      <dl className="mx-auto mt-3xl grid max-w-article gap-xl md:grid-cols-3">
        {faq.map((item) => (
          <div key={item.question} className="rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
            <dt className="text-label font-medium text-text-primary">{item.question}</dt>
            <dd className="mt-sm text-label-sm text-text-secondary">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function Waitlist() {
  return (
    <Section labelledBy="waitlist-title">
      <SectionHeader id="waitlist-title" title="Pro waitlist" text="Email only. No account, no tracking, no noise." />
      <div className="mt-2xl flex justify-center">
        <WaitlistForm />
      </div>
    </Section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-tertiary font-sans text-text-primary">
      <a
        href="#main"
        className="sr-only rounded-corner-md bg-brand-primary px-lg py-sm text-on-brand focus:not-sr-only focus:absolute focus:top-sm focus:left-sm focus:z-50"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Showcase />
        <Features />
        <Highlights />
        <Quickstart />
        <Integrations />
        <CliReference />
        <Limits />
        <Faq />
        <Waitlist />
      </main>
      <SiteFooter />
    </div>
  );
}
