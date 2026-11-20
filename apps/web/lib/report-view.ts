export type Report = {
  score: number;
  verdict: string;
  dimensions: Array<{ label: string; score: number; findingCount: number }>;
  findings: Array<{
    severity: string;
    message: string;
    evidence?: Array<{ file: string; lineStart: number }>;
  }>;
  authorQuestions: Array<{
    question: string;
    evidence: Array<{ file: string; lineStart: number }>;
  }>;
  operateMd: string;
  meta: { sha: string; engineVersion: string; rubricVersion: string };
};

export type ReportViewId = "verdict" | "risks" | "operate" | "questions";

export type OperateSection = { heading: string; lines: string[] };

export type SeverityTone = "error" | "warning" | "success" | "info";

const VIEW_IDS: ReportViewId[] = ["verdict", "risks", "operate", "questions"];

export function bandForScore(score: number): string {
  if (score >= 85) return "Handoff-ready";
  if (score >= 70) return "Operable with a briefing";
  if (score >= 50) return "Risky";
  return "Only the author can run this";
}

export function severityTone(severity: string): SeverityTone {
  const value = severity.toLowerCase();
  if (value.includes("critical") || value.includes("high") || value.includes("error")) return "error";
  if (value.includes("medium") || value.includes("warn")) return "warning";
  if (value.includes("low") || value.includes("success")) return "success";
  return "info";
}

export function parseOperateMd(markdown: string): OperateSection[] {
  const sections: OperateSection[] = [];
  let current: OperateSection | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      current = { heading: line.slice(3).trim(), lines: [] };
      sections.push(current);
      continue;
    }
    if (line.startsWith("# ") || line.trim() === "") continue;
    if (current === null) {
      current = { heading: "OPERATE.md", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }

  return sections.length > 0 ? sections : [{ heading: "OPERATE.md", lines: [] }];
}

export function parseReportView(value: unknown): ReportViewId {
  return typeof value === "string" && VIEW_IDS.includes(value as ReportViewId)
    ? (value as ReportViewId)
    : "verdict";
}
