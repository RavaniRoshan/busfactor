import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "waitlist.json");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "valid email required" }, { status: 400 });
  }

  await mkdir(dataDir, { recursive: true });
  let emails: string[] = [];
  try {
    emails = JSON.parse(await readFile(dataFile, "utf8")) as string[];
  } catch {
    emails = [];
  }
  if (!emails.includes(email)) emails.push(email);
  await writeFile(dataFile, JSON.stringify(emails, null, 2), "utf8");
  return Response.json({ ok: true });
}
