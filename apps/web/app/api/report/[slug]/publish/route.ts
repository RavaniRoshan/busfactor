import { reports } from "@/lib/store";

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const stored = reports.get(slug);
  if (!stored) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  stored.public = true;
  reports.set(slug, stored);
  return Response.json({ slug, public: true });
}
