/**
 * RotaStellar SDK - Space Computing Infrastructure
 *
 * Node.js SDK for orbital compute planning, simulation, and space intelligence.
 *
 * Documentation: https://rotastellar.com/docs
 * GitHub: https://github.com/rotastellar/rotastellar-node
 *
 * Coming Q1 2026.
 */

export const VERSION = "0.0.1";

const comingSoon = (name: string): never => {
  throw new Error(
    `${name} is not yet available. ` +
      `The RotaStellar SDK is launching Q1 2026. ` +
      `Visit https://rotastellar.com for updates.`
  );
};

export class OrbitalCompute {
  constructor(_options?: { apiKey?: string }) {
    comingSoon("OrbitalCompute");
  }
}

export class OrbitalIntel {
  constructor(_options?: { apiKey?: string }) {
    comingSoon("OrbitalIntel");
  }
}

export class Simulator {
  constructor(_options?: { apiKey?: string }) {
    comingSoon("Simulator");
  }
}

export class Tracker {
  constructor(_options?: { apiKey?: string }) {
    comingSoon("Tracker");
  }
}
