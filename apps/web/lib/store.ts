type JobStatus = "running" | "complete" | "failed";

export interface ScanJob {
  id: string;
  status: JobStatus;
  slug?: string;
  report?: unknown;
  error?: string;
  public: boolean;
}

export interface StoredReport {
  slug: string;
  report: unknown;
  public: boolean;
}

const globalStore = globalThis as typeof globalThis & {
  __busfactorJobs?: Map<string, ScanJob>;
  __busfactorReports?: Map<string, StoredReport>;
};
if (!globalStore.__busfactorJobs) globalStore.__busfactorJobs = new Map();
if (!globalStore.__busfactorReports) globalStore.__busfactorReports = new Map();
export const jobs: Map<string, ScanJob> = globalStore.__busfactorJobs;
export const reports: Map<string, StoredReport> = globalStore.__busfactorReports;

export function makeSlug() {
  return Math.random().toString(36).slice(2, 10);
}
