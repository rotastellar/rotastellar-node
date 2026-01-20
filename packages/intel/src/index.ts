/**
 * RotaStellar Intel - Orbital Intelligence & Space Situational Awareness
 * Coming Q1 2026.
 */

export const VERSION = "0.0.1";

const comingSoon = (name: string): never => {
  throw new Error(
    `${name} is not yet available. Launching Q1 2026. Visit https://rotastellar.com`
  );
};

export class Tracker {
  constructor() { comingSoon("Tracker"); }
}

export class ConjunctionAnalyzer {
  constructor() { comingSoon("ConjunctionAnalyzer"); }
}

export class PatternDetector {
  constructor() { comingSoon("PatternDetector"); }
}
