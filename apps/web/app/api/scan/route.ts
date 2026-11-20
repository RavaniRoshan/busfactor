import { randomUUID } from "node:crypto";

import { scanTarget } from "../../../../../packages/core/dist/index.js";
import { jobs } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { target?: unknown };
  const rawTarget = typeof body.target === "string" ? body.target.trim() : "";
  if (rawTarget === "") {
    return Response.json({ error: "target is required" }, { status: 400 });
  }
  const target = /^https?:\/\//i.test(rawTarget) ? rawTarget : (await import("node:path")).resolve(process.cwd(), "..", "..", rawTarget);

  const id = randomUUID();
  jobs.set(id, { id, status: "running" });

  void (async () => {
    try {
      const { report } = await scanTarget(target, {});
      jobs.set(id, { id, status: "complete", report });
    } catch (error) {
      console.error("SCAN ERROR", error);
      jobs.set(id, {
        id,
        status: "failed",
        error: error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error),
      });
    }
  })();

  return Response.json({ id }, { status: 202 });
}
