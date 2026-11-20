import type { Scanner } from "../types.js";
import { configScanner } from "./config.js";
import { dependenciesScanner } from "./dependencies.js";
import { runnabilityScanner } from "./runnability.js";
import { secretsScanner } from "./secrets.js";
import { testsScanner } from "./tests.js";

export function createDefaultScanners(): Scanner[] {
  return [secretsScanner, dependenciesScanner, testsScanner, runnabilityScanner, configScanner];
}

export { configScanner, dependenciesScanner, runnabilityScanner, secretsScanner, testsScanner };
