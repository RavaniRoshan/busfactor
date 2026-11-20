import path from "node:path";

import type { Evidence, Snapshot } from "../types.js";
import { extractJson } from "./provider.js";

export interface CitationValidationResult<T> {
  validItems: T[];
  droppedItems: T[];
  dropRate: number;
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function evidenceIsValid(evidence: Evidence, snapshot: Snapshot): Promise<boolean> {
  const file = snapshot.files.find((entry) => entry.path === evidence.file);
  if (file === undefined || file.binary) return false;
  let content: string;
  try {
    content = await snapshot.readFile(evidence.file);
  } catch {
    return false;
  }
  const lines = content.split(/\r?\n/);
  if (evidence.lineStart > lines.length || evidence.lineEnd > lines.length) return false;
  const selected = lines.slice(evidence.lineStart - 1, evidence.lineEnd).join("\n");
  const normalizedQuote = normalizeText(evidence.quote);
  const normalizedSelected = normalizeText(selected);
  if (normalizedQuote.length === 0 || normalizedQuote.length > 200) return false;
  return normalizedSelected.includes(normalizedQuote);
}

export async function validateCitedItems<T extends { evidence: Evidence[] }>(
  items: T[],
  snapshot: Snapshot,
): Promise<CitationValidationResult<T>> {
  const validItems: T[] = [];
  const droppedItems: T[] = [];

  for (const item of items) {
    const evidenceResults = await Promise.all(item.evidence.map((entry) => evidenceIsValid(entry, snapshot)));
    if (item.evidence.length > 0 && evidenceResults.every(Boolean)) {
      validItems.push(item);
    } else if (item.evidence.length === 0) {
      validItems.push(item);
    } else {
      droppedItems.push(item);
    }
  }

  const total = items.length;
  const dropRate = total === 0 ? 0 : droppedItems.length / total;
  return { validItems, droppedItems, dropRate };
}

export function parseAndValidateJson<T>(text: string, schema: { parse: (value: unknown) => T }): T {
  return schema.parse(JSON.parse(extractJson(text)));
}
