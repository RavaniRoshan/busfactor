import { reports } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const stored = reports.get(slug);
  if (!stored) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(stored.report);
}
