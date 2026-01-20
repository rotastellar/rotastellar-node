/**
 * RotaStellar Compute - Orbital Compute Planning & Simulation
 * Coming Q1 2026.
 */

export const VERSION = "0.0.1";

const comingSoon = (name: string): never => {
  throw new Error(
    `${name} is not yet available. Launching Q1 2026. Visit https://rotastellar.com`
  );
};

export class FeasibilityCalculator {
  constructor() { comingSoon("FeasibilityCalculator"); }
}

export class ThermalSimulator {
  constructor() { comingSoon("ThermalSimulator"); }
}

export class LatencySimulator {
  constructor() { comingSoon("LatencySimulator"); }
}

export class PowerAnalyzer {
  constructor() { comingSoon("PowerAnalyzer"); }
}
