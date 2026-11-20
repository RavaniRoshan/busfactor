#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Command } from "commander";

import { renderMarkdownReport, scanTarget } from "@ravaniroshan/busfactor-core";

const program = new Command();

program
  .name("busfactor")
  .description("Could someone who didn't write this safely run it?")
  .version("0.1.6");

program
  .command("scan")
  .description("Scan a local path or public GitHub URL")
  .argument("<target>", "local path or github.com URL")
  .option("--out <dir>", "output directory", "busfactor-report")
  .option("--format <formats>", "comma-separated formats: md,json", "md,json")
  .option("--fail-under <score>", "exit 2 if the score is below this threshold", (value) => Number(value))
  .action(async (target: string, options: { out: string; format: string; failUnder?: number }) => {
    const formats = options.format
      .split(",")
      .map((format) => format.trim())
      .filter(Boolean);
    const outDir = path.resolve(options.out);

    process.stderr.write(`Scanning ${target}...\n`);
    try {
      const { report } = await scanTarget(target, {});
      await mkdir(outDir, { recursive: true });

      if (formats.includes("md")) {
        await writeFile(path.join(outDir, "report.md"), renderMarkdownReport(report), "utf8");
      }
      if (formats.includes("json")) {
        await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
      }
      await writeFile(path.join(outDir, "OPERATE.md"), report.operateMd, "utf8");
      await writeFile(
        path.join(outDir, "author-questions.md"),
        report.authorQuestions.map((question) => `- ${question.question}`).join("\n") + "\n",
        "utf8",
      );

      process.stderr.write(`Score: ${report.score}/100 (${report.verdict})\n`);
      process.stderr.write(`Report written to ${outDir}\n`);

      if (options.failUnder !== undefined && report.score < options.failUnder) {
        process.exitCode = 2;
      }
    } catch (error) {
      process.stderr.write(`Scan failed: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

program.parse();
