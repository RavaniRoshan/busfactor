import { store } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = await store.jobs.get(id);
  if (!job) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(job);
}
