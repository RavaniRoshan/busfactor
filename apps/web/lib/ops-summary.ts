import type { ScanJob } from "./store";

export type JobSummary = {
  total: number;
  complete: number;
  failed: number;
  running: number;
  failRate: number;
};

export type FeedbackSummary = {
  yes: number;
  no: number;
  answered: number;
};

export function summarizeJobs(jobs: ScanJob[]): JobSummary {
  const complete = jobs.filter((job) => job.status === "complete").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const running = jobs.filter((job) => job.status === "running").length;
  return {
    total: jobs.length,
    complete,
    failed,
    running,
    failRate: jobs.length === 0 ? 0 : Math.round((failed / jobs.length) * 100),
  };
}

export function summarizeFeedback(
  feedback: Array<{ helpful?: unknown }>,
): FeedbackSummary {
  const yes = feedback.filter((item) => item.helpful === true).length;
  const no = feedback.filter((item) => item.helpful === false).length;
  return { yes, no, answered: yes + no };
}
