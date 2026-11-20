import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "feedback.json");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    slug?: unknown;
    helpful?: unknown;
    note?: unknown;
  };
  const slug = typeof body.slug === "string" ? body.slug : "";
  const helpful = typeof body.helpful === "boolean" ? body.helpful : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 1000) : "";

  await mkdir(dataDir, { recursive: true });
  let feedback: Array<{ slug: string; helpful: boolean | null; note: string; createdAt: string }> = [];
  try {
    feedback = JSON.parse(await readFile(dataFile, "utf8")) as typeof feedback;
  } catch {
    feedback = [];
  }
  feedback.push({ slug, helpful, note, createdAt: new Date().toISOString() });
  await writeFile(dataFile, JSON.stringify(feedback, null, 2), "utf8");

  return Response.json({ ok: true });
}
