import { parseGitHubUrl, SnapshotError } from "../../../packages/core/dist/index.js" /*turbopackIgnore: true*/;

export type HostedTarget =
  | { kind: "github"; url: string }
  | { kind: "local"; path: string };

export function validateHostedTarget(raw: string, allowLocal: boolean): HostedTarget {
  if (allowLocal && !/^https?:\/\//i.test(raw)) {
    return { kind: "local", path: raw };
  }
  if (!/^https:\/\//i.test(raw)) {
    throw new SnapshotError("invalid_url", "Only public GitHub URLs are supported");
  }
  parseGitHubUrl(raw);
  return { kind: "github", url: raw };
}
