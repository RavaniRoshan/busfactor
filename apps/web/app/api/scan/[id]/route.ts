import { safeErrorMessage, scanJobs } from "@/lib/scan-jobs";
import { store } from "@/lib/store";

function reportMeta(report: unknown): {
  stack?: string;
  fileCount?: number;
  rubricVersion?: string;
  promptVersion?: string;
  durationMs?: number;
  model?: string | null;
  usage?: { model?: string };
} {
  return ((report as { meta?: Record<string, unknown> } | undefined)?.meta ?? {}) as ReturnType<typeof reportMeta>;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = await scanJobs.get(id);
  if (!job) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  if (job.status === "complete" && job.reportSlug) {
    const stored = await store.reports.get(job.reportSlug);
    const meta = reportMeta(stored?.report);
    return Response.json({
      ...job,
      slug: job.reportSlug,
      report: stored?.report,
      cacheHit: job.cacheHit,
      durationMs: typeof meta.durationMs === "number" ? meta.durationMs : job.durationMs ?? 0,
      model: job.model ?? (typeof meta.model === "string" ? meta.model : meta.usage?.model ?? null),
      rubricVersion: job.rubricVersion ?? meta.rubricVersion ?? null,
      promptVersion: job.promptVersion ?? meta.promptVersion ?? null,
      stack: typeof meta.stack === "string" ? meta.stack : null,
      fileCount: typeof meta.fileCount === "number" ? meta.fileCount : null,
    });
  }
  if (job.status === "failed") {
    return Response.json({
      ...job,
      category: job.errorCategory,
      error: job.errorCategory ? safeErrorMessage(job.errorCategory) : "Scan failed.",
    });
  }
  return Response.json(job);
}
