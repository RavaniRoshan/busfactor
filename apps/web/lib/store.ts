type JobStatus = "running" | "complete" | "failed";

export interface ScanJob {
  id: string;
  status: JobStatus;
  report?: unknown;
  error?: string;
}

const globalStore = globalThis as typeof globalThis & { __busfactorJobs?: Map<string, ScanJob> };
if (!globalStore.__busfactorJobs) globalStore.__busfactorJobs = new Map();
export const jobs: Map<string, ScanJob> = globalStore.__busfactorJobs;
