#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("busfactor")
  .description("Could someone who didn't write this safely run it?")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan a local path or public GitHub URL")
  .argument("<target>", "local path or github.com URL")
  .option("--out <dir>", "output directory", "busfactor-report")
  .option("--format <formats>", "comma-separated formats: md,json", "md,json")
  .option("--fail-under <score>", "exit 2 if the score is below this threshold")
  .action(() => {
    console.error("The scan engine is not wired yet.");
    process.exitCode = 1;
  });

program.parse();
