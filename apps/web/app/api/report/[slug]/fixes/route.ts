import { store } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const stored = await store.reports.get(slug);
  if (!stored) {
    return new Response("not found", { status: 404 });
  }
  const report = stored.report as { findings?: Array<{ message: string; evidence?: Array<{ file: string; lineStart: number }> }> };
  const lines = ["# Fix list", ""];
  for (const finding of report.findings ?? []) {
    const location = finding.evidence?.[0] ? ` (${finding.evidence[0].file}:${finding.evidence[0].lineStart})` : "";
    lines.push(`- [ ] ${finding.message}${location}`);
  }
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="busfactor-${slug}-fixes.md"`,
    },
  });
}
