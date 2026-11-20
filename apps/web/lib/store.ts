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
  __busfactorCache?: Map<string, unknown>;
  __busfactorRateLimits?: Map<string, { day: string; count: number }>;
  __busfactorSpend?: { usd: number };
};
if (!globalStore.__busfactorJobs) globalStore.__busfactorJobs = new Map();
if (!globalStore.__busfactorReports) globalStore.__busfactorReports = new Map();
if (!globalStore.__busfactorCache) globalStore.__busfactorCache = new Map();
if (!globalStore.__busfactorRateLimits) globalStore.__busfactorRateLimits = new Map();
if (!globalStore.__busfactorSpend) globalStore.__busfactorSpend = { usd: 0 };
export const jobs: Map<string, ScanJob> = globalStore.__busfactorJobs;
export const reports: Map<string, StoredReport> = globalStore.__busfactorReports;
export const reportCache: Map<string, unknown> = globalStore.__busfactorCache;
export const rateLimits: Map<string, { day: string; count: number }> = globalStore.__busfactorRateLimits;
export const spend: { usd: number } = globalStore.__busfactorSpend;

export function makeSlug() {
  return Math.random().toString(36).slice(2, 10);
}
