import { randomUUID } from "node:crypto";
import { ensureSchema, getPool, hasDatabase } from "./db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]{3,64}$/;

export interface WaitlistInput {
  email: string;
  source?: string;
  campaign?: string;
}

export interface FeedbackInput {
  reportSlug: string;
  helpful: boolean;
  note?: string;
}

export interface FeedbackSummary {
  yes: number;
  no: number;
  answered: number;
}

export interface Records {
  addWaitlist(input: WaitlistInput): Promise<{ created: boolean }>;
  addFeedback(input: FeedbackInput): Promise<{ id: string }>;
  countWaitlist(): Promise<number>;
  feedbackSummary(): Promise<FeedbackSummary>;
  deleteWaitlist(email: string): Promise<number>;
  deleteFeedback(id: string): Promise<boolean>;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > 254) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

function normalizeText(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().slice(0, max);
  return value.length > 0 ? value : undefined;
}

export function normalizeFeedback(
  raw: unknown
): { reportSlug: string; helpful: boolean; note: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const slugRaw = typeof body.reportSlug === "string" ? body.reportSlug : body.slug;
  const reportSlug = typeof slugRaw === "string" ? slugRaw.trim() : "";
  if (!SLUG_RE.test(reportSlug)) return null;
  if (typeof body.helpful !== "boolean") return null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  return { reportSlug, helpful: body.helpful, note };
}

type MemoryWaitlist = {
  id: string;
  email: string;
  createdAt: string;
  source?: string;
  campaign?: string;
  status: "active" | "unsubscribed" | "deleted";
};

type MemoryFeedback = {
  id: string;
  reportSlug: string;
  helpful: boolean;
  note: string;
  createdAt: string;
};

type MemoryState = {
  waitlist: MemoryWaitlist[];
  feedback: MemoryFeedback[];
};

type GlobalRecords = typeof globalThis & { __busfactorRecords?: MemoryState };

function memoryState(): MemoryState {
  const g = globalThis as GlobalRecords;
  if (!g.__busfactorRecords) {
    g.__busfactorRecords = { waitlist: [], feedback: [] };
  }
  return g.__busfactorRecords;
}

function createMemoryRecords(): Records {
  const state = memoryState();
  return {
    async addWaitlist(input) {
      const email = normalizeEmail(input.email);
      if (!email) return { created: false };
      const exists = state.waitlist.some((entry) => entry.email === email);
      if (exists) return { created: false };
      state.waitlist.push({
        id: randomUUID(),
        email,
        createdAt: new Date().toISOString(),
        source: normalizeText(input.source, 64),
        campaign: normalizeText(input.campaign, 64),
        status: "active",
      });
      return { created: true };
    },
    async addFeedback(input) {
      const id = randomUUID();
      state.feedback.push({
        id,
        reportSlug: input.reportSlug,
        helpful: input.helpful,
        note: typeof input.note === "string" ? input.note.trim().slice(0, 1000) : "",
        createdAt: new Date().toISOString(),
      });
      return { id };
    },
    async countWaitlist() {
      return state.waitlist.filter((entry) => entry.status === "active").length;
    },
    async feedbackSummary() {
      const yes = state.feedback.filter((entry) => entry.helpful === true).length;
      const no = state.feedback.filter((entry) => entry.helpful === false).length;
      return { yes, no, answered: yes + no };
    },
    async deleteWaitlist(email) {
      const normalized = normalizeEmail(email);
      if (!normalized) return 0;
      const before = state.waitlist.length;
      state.waitlist = state.waitlist.filter((entry) => entry.email !== normalized);
      return before - state.waitlist.length;
    },
    async deleteFeedback(id) {
      const index = state.feedback.findIndex((entry) => entry.id === id);
      if (index < 0) return false;
      state.feedback.splice(index, 1);
      return true;
    },
  };
}

function createPostgresRecords(): Records {
  return {
    async addWaitlist(input) {
      const email = normalizeEmail(input.email);
      if (!email) return { created: false };
      await ensureSchema();
      const source = normalizeText(input.source, 64) ?? null;
      const campaign = normalizeText(input.campaign, 64) ?? null;
      const result = await getPool().query(
        `INSERT INTO waitlist_entries (email, source, campaign)
         VALUES ($1, $2, $3)
         ON CONFLICT (lower(email)) DO NOTHING`,
        [email, source, campaign]
      );
      return { created: (result.rowCount ?? 0) === 1 };
    },
    async addFeedback(input) {
      await ensureSchema();
      const note = typeof input.note === "string" ? input.note.trim().slice(0, 1000) : "";
      const result = await getPool().query(
        `INSERT INTO report_feedback (report_slug, helpful, note)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [input.reportSlug, input.helpful, note]
      );
      return { id: String(result.rows[0]?.id ?? "") };
    },
    async countWaitlist() {
      await ensureSchema();
      const result = await getPool().query(
        `SELECT count(*)::int AS count FROM waitlist_entries WHERE status = 'active'`
      );
      return Number(result.rows[0]?.count ?? 0);
    },
    async feedbackSummary() {
      await ensureSchema();
      const result = await getPool().query(
        `SELECT
           count(*) FILTER (WHERE helpful = true)::int AS yes,
           count(*) FILTER (WHERE helpful = false)::int AS no
         FROM report_feedback`
      );
      const yes = Number(result.rows[0]?.yes ?? 0);
      const no = Number(result.rows[0]?.no ?? 0);
      return { yes, no, answered: yes + no };
    },
    async deleteWaitlist(email) {
      const normalized = normalizeEmail(email);
      if (!normalized) return 0;
      await ensureSchema();
      const result = await getPool().query(
        `UPDATE waitlist_entries SET status = 'deleted'
         WHERE lower(email) = lower($1) AND status = 'active'`,
        [normalized]
      );
      return result.rowCount ?? 0;
    },
    async deleteFeedback(id) {
      await ensureSchema();
      const result = await getPool().query(`DELETE FROM report_feedback WHERE id = $1`, [id]);
      return (result.rowCount ?? 0) > 0;
    },
  };
}

export const records: Records = hasDatabase() ? createPostgresRecords() : createMemoryRecords();
