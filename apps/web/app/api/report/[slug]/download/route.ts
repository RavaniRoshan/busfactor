import { reports } from "@/lib/store";


export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const stored = reports.get(slug);
  if (!stored) {
    return new Response("not found", { status: 404 });
  }
  const core = await import("../../../../../../../packages/core/dist/index.js" /*turbopackIgnore: true*/);
  const markdown = core.renderMarkdownReport(stored.report as never);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="busfactor-${slug}.md"`,
    },
  });
}
