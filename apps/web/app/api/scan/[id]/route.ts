import { safeErrorMessage, scanJobs } from "@/lib/scan-jobs";
import { store } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = await scanJobs.get(id);
  if (!job) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  if (job.status === "complete" && job.reportSlug) {
    const stored = await store.reports.get(job.reportSlug);
    return Response.json({ ...job, slug: job.reportSlug, report: stored?.report });
  }
  if (job.status === "failed") {
    return Response.json({
      ...job,
      error: job.errorCategory ? safeErrorMessage(job.errorCategory) : "Scan failed.",
    });
  }
  return Response.json(job);
}
