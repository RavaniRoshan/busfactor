#!/usr/bin/env node
import readline from "node:readline";
import process from "node:process";

import { scanTarget } from "@busfactor/core";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

let lastReport: unknown = null;

const tools = [
  {
    name: "scan_repo",
    description: "Scan a local path or public GitHub URL and return a BusFactor report.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Local path or github.com URL" },
      },
      required: ["target"],
      additionalProperties: false,
    },
  },
  {
    name: "get_report",
    description: "Return the most recently scanned BusFactor report from this server process.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "generate_operate_md",
    description: "Generate OPERATE.md for a local path or public GitHub URL.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Local path or github.com URL" },
      },
      required: ["target"],
      additionalProperties: false,
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  if (name === "scan_repo") {
    const target = String(args.target ?? "");
    if (target === "") return { content: [{ type: "text", text: "target is required" }], isError: true };
    const { report } = await scanTarget(target, {});
    lastReport = report;
    return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
  }
  if (name === "get_report") {
    if (lastReport === null) {
      return { content: [{ type: "text", text: "No report has been scanned yet" }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(lastReport, null, 2) }] };
  }
  if (name === "generate_operate_md") {
    const target = String(args.target ?? "");
    if (target === "") return { content: [{ type: "text", text: "target is required" }], isError: true };
    const { report } = await scanTarget(target, {});
    lastReport = report;
    return { content: [{ type: "text", text: report.operateMd }] };
  }
  return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
}

function send(response: unknown): void {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

async function handle(request: JsonRpcRequest): Promise<void> {
  const id = request.id ?? null;
  const isNotification = request.id === undefined;

  if (request.method === "initialize") {
    if (!isNotification) {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "busfactor", version: "0.1.0" },
        },
      });
    }
    return;
  }

  if (request.method === "notifications/initialized") {
    return;
  }

  if (request.method === "tools/list") {
    if (!isNotification) send({ jsonrpc: "2.0", id, result: { tools } });
    return;
  }

  if (request.method === "tools/call") {
    const params = request.params ?? {};
    const name = String(params.name ?? "");
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    try {
      const result = await callTool(name, args);
      if (!isNotification) send({ jsonrpc: "2.0", id, result });
    } catch (error) {
      if (!isNotification) {
        send({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
            isError: true,
          },
        });
      }
    }
    return;
  }

  if (!isNotification) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
  }
}

const pending: Promise<void>[] = [];
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (trimmed === "") return;
  let request: JsonRpcRequest;
  try {
    request = JSON.parse(trimmed) as JsonRpcRequest;
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  pending.push(handle(request));
});
rl.on("close", () => {
  Promise.all(pending).finally(() => process.exit(0));
});
