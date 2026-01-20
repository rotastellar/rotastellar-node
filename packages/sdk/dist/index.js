"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracker = exports.Simulator = exports.OrbitalIntel = exports.OrbitalCompute = exports.VERSION = void 0;
exports.VERSION = "0.0.1";
const comingSoon = (name) => {
    throw new Error(`${name} is not yet available. ` +
        `The RotaStellar SDK is launching Q1 2026. ` +
        `Visit https://rotastellar.com for updates.`);
};
class OrbitalCompute {
    constructor(_options) {
        comingSoon("OrbitalCompute");
    }
}
exports.OrbitalCompute = OrbitalCompute;
class OrbitalIntel {
    constructor(_options) {
        comingSoon("OrbitalIntel");
    }
}
exports.OrbitalIntel = OrbitalIntel;
class Simulator {
    constructor(_options) {
        comingSoon("Simulator");
    }
}
exports.Simulator = Simulator;
class Tracker {
    constructor(_options) {
        comingSoon("Tracker");
    }
}
exports.Tracker = Tracker;
