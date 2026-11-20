import { createHash } from "node:crypto";

const DEFAULT_SALT = "busfactor-rate-limit-v1";

/** IR-style: hash the address before using it as a persistent store key. */
export function hashIp(raw: string, salt = process.env.BUSFACTOR_IP_SALT ?? DEFAULT_SALT): string {
  return createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 24);
}
