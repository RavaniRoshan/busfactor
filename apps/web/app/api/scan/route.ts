import { randomUUID } from "node:crypto";

import { scanTarget } from "../../../../../packages/core/dist/index.js";
import { jobs, makeSlug, reports } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { target?: unknown };
  const rawTarget = typeof body.target === "string" ? body.target.trim() : "";
  if (rawTarget === "") {
    return Response.json({ error: "target is required" }, { status: 400 });
  }
  const nodePath = await import("node:path");
  const target = /^https?:\/\//i.test(rawTarget)
    ? rawTarget
    : nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), "..", "..", rawTarget);

  const id = randomUUID();
  jobs.set(id, { id, status: "running", public: false });

  void (async () => {
    try {
      const { report } = await scanTarget(target, {});
      const slug = makeSlug();
      reports.set(slug, { slug, report, public: false });
      jobs.set(id, { id, status: "complete", slug, report, public: false });
    } catch (error) {
      console.error("SCAN ERROR", error);
      jobs.set(id, {
        id,
        status: "failed",
        public: false,
        error: error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error),
      });
    }
  })();

  return Response.json({ id }, { status: 202 });
}
