import { Card, CardPanel } from "../ui/card";
import { parseOperateMd, type Report } from "../../lib/report-view";

export function OperateView({ report }: { report: Report }) {
  const sections = parseOperateMd(report.operateMd);

  return (
    <section aria-labelledby="rw-operate-title">
      <p className="rw-eyebrow">OPERATE.md</p>
      <h2 id="rw-operate-title" className="type-display mt-sm">
        Operating notes
      </h2>
      <p className="mt-md text-text-secondary">
        Drafted from repository evidence. Anything the code cannot confirm is marked unknown.
      </p>

      <div className="mt-xl flex flex-col gap-lg">
        {sections.map((section, index) => (
          <Card key={`${section.heading}-${index}`} className="rw-card p-lg">
            <CardPanel className="flex flex-col gap-sm">
              <h3 className="text-label font-medium">{section.heading}</h3>
              {section.lines.length === 0 ? (
                <p className="text-label-sm text-text-secondary">No details were recorded.</p>
              ) : (
                <ol className="flex flex-col gap-sm">
                  {section.lines.map((line, lineIndex) => (
                    <li key={`${line}-${lineIndex}`} className="flex gap-md text-label-sm text-text-secondary">
                      <span className="font-mono text-text-tertiary">{String(lineIndex + 1).padStart(2, "0")}</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardPanel>
          </Card>
        ))}
      </div>
    </section>
  );
}
