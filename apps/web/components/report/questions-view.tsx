import { Card, CardPanel } from "../ui/card";
import type { Report } from "../../lib/report-view";
import { CiteChip } from "./cite-chip";

export function QuestionsView({ report }: { report: Report }) {
  return (
    <section aria-labelledby="rw-questions-title">
      <p className="rw-eyebrow">AUTHOR QUESTIONS</p>
      <h2 id="rw-questions-title" className="type-display mt-sm">
        Only the original author can answer
      </h2>
      <p className="mt-md text-text-secondary">
        The scan stops where the evidence does, and writes down what is missing.
      </p>

      {report.authorQuestions.length === 0 ? (
        <p className="mt-xl text-text-secondary">No author questions were recorded.</p>
      ) : (
        <ul className="mt-xl flex flex-col gap-md">
          {report.authorQuestions.map((item, index) => (
            <li key={`${item.question}-${index}`}>
              <Card className="rw-card p-lg">
                <CardPanel className="flex flex-col items-start gap-sm">
                  <p className="text-label-sm font-medium">{item.question}</p>
                  {item.evidence[0] && (
                    <CiteChip file={item.evidence[0].file} line={item.evidence[0].lineStart} />
                  )}
                </CardPanel>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
