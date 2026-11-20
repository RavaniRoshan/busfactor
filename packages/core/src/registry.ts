import type { DimensionId, Finding, Scanner, Snapshot } from "./types.js";

export class ScannerRegistry {
  private readonly scanners: Scanner[] = [];

  register(scanner: Scanner): void {
    if (this.scanners.some((existing) => existing.id === scanner.id)) {
      throw new Error(`Scanner already registered: ${scanner.id}`);
    }
    this.scanners.push(scanner);
  }

  get(id: string): Scanner | undefined {
    return this.scanners.find((scanner) => scanner.id === id);
  }

  all(): Scanner[] {
    return [...this.scanners];
  }

  byDimension(dimension: DimensionId): Scanner[] {
    return this.scanners.filter((scanner) => scanner.dimension === dimension);
  }

  async run(snapshot: Snapshot): Promise<Finding[]> {
    const findings: Finding[] = [];
    for (const scanner of this.scanners) {
      const result = await scanner.scan(snapshot);
      findings.push(...result);
    }
    return findings;
  }
}
