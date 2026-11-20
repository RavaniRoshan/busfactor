"use client";

import * as React from "react";
import { CircleHelp, FileText, Gauge, Map as MapIcon } from "lucide-react";
import { BusFactorMark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

type ViewId = "verdict" | "risks" | "operate" | "questions";

const views: { id: ViewId; label: string; icon: typeof Gauge }[] = [
  { id: "verdict", label: "Verdict", icon: Gauge },
  { id: "risks", label: "Risk map", icon: MapIcon },
  { id: "operate", label: "OPERATE.md", icon: FileText },
  { id: "questions", label: "Author questions", icon: CircleHelp },
];

function Cite({ children }: { children: React.ReactNode }) {
  return (
    <code className="inline-flex rounded-corner-sm bg-bg-faint px-sm py-xs font-mono text-xs text-text-secondary">
      {children}
    </code>
  );
}

function ViewHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-xs tracking-widest text-text-secondary uppercase">{eyebrow}</p>
      <h3 className="type-display">{title}</h3>
      <p className="mt-xs text-label-sm text-text-secondary">{text}</p>
    </div>
  );
}

const verdictFindings = [
  { label: "Can start the service", status: "Yes", variant: "success", cite: "README.md:23" },
  { label: "Can deploy safely", status: "Yes", variant: "success", cite: "scripts/deploy.sh:42" },
  {
    label: "Can recover from a bad deploy",
    status: "Partly",
    variant: "warning",
    cite: "db/migrations/README.md:8",
  },
  { label: "Can rotate secrets", status: "No", variant: "danger", cite: "config/secrets.ts:18" },
] as const;

function VerdictView() {
  return (
    <div className="flex flex-col gap-xl">
      <ViewHeader
        eyebrow="Operability verdict"
        title="Operable, with gaps"
        text="A newcomer can run and deploy this service, but cannot safely recover or rotate secrets without the original author."
      />
      <p className="flex items-baseline gap-sm">
        <span className="type-display tabular-nums">64</span>
        <span className="text-label text-text-secondary">/ 100 · Risky</span>
      </p>
      <ul className="flex flex-col divide-y divide-border-secondary">
        {verdictFindings.map((finding) => (
          <li key={finding.label} className="flex flex-wrap items-center justify-between gap-md py-lg">
            <span className="flex flex-col items-start gap-xs">
              <span className="text-label-sm text-text-primary">{finding.label}</span>
              <Cite>{finding.cite}</Cite>
            </span>
            <Badge variant={finding.variant}>{finding.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

const dimensions = [
  { name: "Runnability", value: 80 },
  { name: "Secrets and config", value: 35 },
  { name: "Failure handling and observability", value: 45 },
  { name: "Tests and CI", value: 60 },
  { name: "Critical paths", value: 40 },
  { name: "Dependencies", value: 75 },
  { name: "Knowledge capture", value: 70 },
];

function RisksView() {
  return (
    <div className="flex flex-col gap-xl">
      <ViewHeader
        eyebrow="Risk map"
        title="Where a handoff breaks first"
        text="Seven dimensions, scored by code. Lower bars mark where a new operator is most likely to get stuck."
      />
      <ul className="flex flex-col gap-lg">
        {dimensions.map((dimension) => (
          <li key={dimension.name} className="grid grid-cols-3 items-center gap-lg">
            <span className="text-label-sm text-text-secondary">{dimension.name}</span>
            <span
              className="col-span-2 h-xs overflow-hidden rounded-corner-full bg-bg-subtle"
              role="img"
              aria-label={`${dimension.name}: ${dimension.value} out of 100`}
            >
              <span
                className={cn("block h-full rounded-corner-full", dimension.value < 50 ? "bg-warning" : "bg-brand-primary")}
                style={{ width: `${dimension.value}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const operateSteps = [
  {
    title: "Start it locally",
    body: "Install dependencies, copy .env.example to .env, then run the dev server. It listens on port 4000.",
    cite: "README.md:23",
  },
  {
    title: "Deploy",
    body: "Deploys run from main through one script that builds the image, runs migrations, and swaps containers.",
    cite: "scripts/deploy.sh:42",
  },
  {
    title: "Roll back",
    body: "Redeploy the previous image tag. Migrations are forward-only, so schema changes cannot be undone.",
    cite: "db/migrations/README.md:8",
  },
];

function OperateView() {
  return (
    <div className="flex flex-col gap-xl">
      <ViewHeader
        eyebrow="OPERATE.md"
        title="Operating acme/payments-api"
        text="Drafted from repository evidence. Anything the code cannot confirm is marked unknown."
      />
      <ol className="flex flex-col gap-xl">
        {operateSteps.map((step, index) => (
          <li key={step.title} className="flex gap-lg">
            <span className="font-mono text-label-sm text-text-tertiary">0{index + 1}</span>
            <span className="flex flex-col items-start gap-sm">
              <span className="text-label font-medium text-text-primary">{step.title}</span>
              <span className="text-label-sm text-text-secondary">{step.body}</span>
              <Cite>{step.cite}</Cite>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-start gap-sm rounded-corner-md bg-bg-faint p-lg">
        <Badge variant="warning">Unknown</Badge>
        <p className="text-label-sm text-text-primary">Who rotates STRIPE_WEBHOOK_SECRET, and how often?</p>
        <Cite>config/secrets.ts:18</Cite>
      </div>
    </div>
  );
}

const authorQuestions = [
  {
    question: "Who rotates STRIPE_WEBHOOK_SECRET, and how often?",
    why: "The secret is read at boot, but nothing in the repo sets or rotates it.",
    cite: "config/secrets.ts:18",
  },
  {
    question: "Is the nightly reconciliation job safe to re-run after a failure?",
    why: "The job writes to the ledger without an idempotency key.",
    cite: "jobs/reconcile.ts:61",
  },
  {
    question: "Which alerts page a human, and who receives them?",
    why: "Alert rules exist, but no routing or on-call config is checked in.",
    cite: "ops/alerts.yml:4",
  },
];

function QuestionsView() {
  return (
    <div className="flex flex-col gap-xl">
      <ViewHeader
        eyebrow="Author questions"
        title="Only the original author can answer"
        text="The scan stops where the evidence does, and writes down what is missing."
      />
      <ul className="flex flex-col gap-md">
        {authorQuestions.map((item) => (
          <li key={item.question} className="flex flex-col items-start gap-sm rounded-corner-md bg-bg-faint p-lg">
            <p className="text-label-sm font-medium text-text-primary">{item.question}</p>
            <p className="text-xs text-text-secondary">{item.why}</p>
            <Cite>{item.cite}</Cite>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportWindow() {
  const [view, setView] = React.useState<ViewId>("operate");

  return (
    <div className="mx-auto w-full max-w-window overflow-hidden rounded-corner-lg border border-border-primary bg-surface-bg">
      <div className="flex items-center justify-between gap-lg border-b border-border-secondary px-xl py-lg">
        <div className="flex min-w-0 items-center gap-md text-text-primary">
          <BusFactorMark className="size-6 shrink-0" />
          <span className="truncate font-mono text-label-sm">acme/payments-api</span>
          <Badge variant="secondary">Example report</Badge>
        </div>
        <span className="shrink-0 text-label-sm text-text-secondary">
          Score <span className="font-mono tabular-nums text-text-primary">64/100</span>
        </span>
      </div>

      <div className="grid min-h-report lg:grid-cols-4">
        <nav aria-label="Report sections" className="hidden flex-col gap-xs border-r border-border-secondary p-lg lg:flex">
          {views.map(({ id, label, icon: ViewIcon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex items-center gap-sm rounded-corner-md px-md py-sm text-label-sm text-text-secondary outline-none transition-colors hover:bg-bg-faint hover:text-text-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                view === id && "bg-bg-faint text-text-primary"
              )}
            >
              <ViewIcon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div className="relative lg:col-span-3">
          <div className="mx-auto w-full max-w-copy px-xl pt-2xl pb-section md:px-2xl">
            {view === "verdict" && <VerdictView />}
            {view === "risks" && <RisksView />}
            {view === "operate" && <OperateView />}
            {view === "questions" && <QuestionsView />}
          </div>
          <div className="absolute inset-x-0 bottom-xl flex justify-center">
            <div role="toolbar" aria-label="Report sections" className="inline-flex items-center gap-xs rounded-corner-lg border border-border-primary bg-surface-bg p-xs shadow-sm">
              {views.map(({ id, label, icon: ViewIcon }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`Show ${label}`}
                  aria-pressed={view === id}
                  title={label}
                  onClick={() => setView(id)}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-corner-md text-text-secondary outline-none hover:bg-bg-faint hover:text-text-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                    view === id && "bg-brand-secondary text-text-primary"
                  )}
                >
                  <ViewIcon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
