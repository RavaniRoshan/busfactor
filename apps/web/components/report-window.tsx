import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { Toolbar, ToolbarLink } from "@/components/ui/toolbar";
import { BusFactorMark } from "@/components/logo";
import type { Report, ReportViewId } from "@/lib/report-view";
import { OperateView } from "@/components/report/operate-view";
import { QuestionsView } from "@/components/report/questions-view";
import { RiskMapView } from "@/components/report/risk-map-view";
import { VerdictView } from "@/components/report/verdict-view";
import { CircleHelp, FileText, Gauge, Map as MapIcon } from "lucide-react";
import type { ReactNode } from "react";

type ViewDef = { id: ReportViewId; label: string; icon: typeof Gauge };

const views: ViewDef[] = [
  { id: "verdict", label: "Verdict", icon: Gauge },
  { id: "risks", label: "Risk map", icon: MapIcon },
  { id: "operate", label: "OPERATE.md", icon: FileText },
  { id: "questions", label: "Author questions", icon: CircleHelp },
];

const content: Record<ReportViewId, (props: { report: Report }) => ReactNode> = {
  verdict: VerdictView,
  risks: RiskMapView,
  operate: OperateView,
  questions: QuestionsView,
};

function hrefFor(slug: string, id: ReportViewId) {
  return `/r/${slug}?view=${id}`;
}

export function ReportWindow({ report, slug, view }: { report: Report; slug: string; view: ReportViewId }) {
  const View = content[view];

  return (
    <section className="report-window" aria-label="BusFactor report">
      <header className="rw-header">
        <div className="flex min-w-0 items-center gap-md">
          <BusFactorMark className="size-6 shrink-0" />
          <span className="truncate font-mono text-label-sm">{slug}</span>
          <Badge variant="secondary" size="sm">Report</Badge>
        </div>
        <span className="shrink-0 text-label-sm text-text-secondary">
          Score <span className="font-mono tabular-nums">{report.score}/100</span>
        </span>
      </header>

      <div className="rw-body">
        <Tabs defaultValue={view} orientation="vertical" className="rw-nav">
          <TabsList className="rw-nav">
            {views.map(({ id, label, icon: Icon }) => (
              <TabsTab
                key={id}
                value={id}
                className={`rw-nav-link ${view === id ? "rw-nav-active" : ""}`}
                aria-current={view === id ? "page" : undefined}
                render={<a href={hrefFor(slug, id)} />}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                {label}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative min-w-0">
          <div className="rw-content">
            <View report={report} />
          </div>
          <div className="absolute inset-x-0 bottom-xl flex justify-center">
            <Toolbar className="rw-toolbar" aria-label="Report sections">
              {views.map(({ id, label, icon: Icon }) => (
                <ToolbarLink
                  key={id}
                  href={hrefFor(slug, id)}
                  aria-label={`Show ${label}`}
                  aria-pressed={view === id}
                  className={`rw-toolbar-link ${view === id ? "rw-toolbar-active" : ""}`}
                >
                  <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                </ToolbarLink>
              ))}
            </Toolbar>
          </div>
        </div>
      </div>
    </section>
  );
}
