"use strict";
/**
 * RotaStellar Intel - Orbital Intelligence & Space Situational Awareness
 *
 * Tools for tracking, analyzing, and monitoring orbital activity.
 *
 * Documentation: https://rotastellar.com/docs/intel
 * GitHub: https://github.com/rotastellar/rotastellar-node
 *
 * @example
 * import { Tracker, ConjunctionAnalyzer } from '@rotastellar/intel';
 *
 * // Track a satellite
 * const tracker = new Tracker({ apiKey: "rs_live_xxx" });
 * const iss = tracker.track("ISS");
 * const pos = await iss.position();
 * console.log(`ISS at ${pos.latitude.toFixed(2)}, ${pos.longitude.toFixed(2)}`);
 *
 * // Analyze conjunctions
 * const analyzer = new ConjunctionAnalyzer({ apiKey: "rs_live_xxx" });
 * const conjunctions = await analyzer.getHighRiskConjunctions();
 * for (const c of conjunctions) {
 *   console.log(`${c.primaryName} - ${c.missDistanceKm.toFixed(2)} km`);
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceLevel = exports.PatternType = exports.DetectedPattern = exports.PatternDetector = exports.RiskLevel = exports.Conjunction = exports.ConjunctionAnalyzer = exports.parseTle = exports.TLE = exports.SatellitePass = exports.GroundStation = exports.TrackedSatellite = exports.Tracker = exports.VERSION = void 0;
exports.VERSION = "0.1.0";
// Tracker
var tracker_1 = require("./tracker");
Object.defineProperty(exports, "Tracker", { enumerable: true, get: function () { return tracker_1.Tracker; } });
Object.defineProperty(exports, "TrackedSatellite", { enumerable: true, get: function () { return tracker_1.TrackedSatellite; } });
Object.defineProperty(exports, "GroundStation", { enumerable: true, get: function () { return tracker_1.GroundStation; } });
Object.defineProperty(exports, "SatellitePass", { enumerable: true, get: function () { return tracker_1.SatellitePass; } });
// TLE
var tle_1 = require("./tle");
Object.defineProperty(exports, "TLE", { enumerable: true, get: function () { return tle_1.TLE; } });
Object.defineProperty(exports, "parseTle", { enumerable: true, get: function () { return tle_1.parseTle; } });
// Conjunctions
var conjunctions_1 = require("./conjunctions");
Object.defineProperty(exports, "ConjunctionAnalyzer", { enumerable: true, get: function () { return conjunctions_1.ConjunctionAnalyzer; } });
Object.defineProperty(exports, "Conjunction", { enumerable: true, get: function () { return conjunctions_1.Conjunction; } });
Object.defineProperty(exports, "RiskLevel", { enumerable: true, get: function () { return conjunctions_1.RiskLevel; } });
// Patterns
var patterns_1 = require("./patterns");
Object.defineProperty(exports, "PatternDetector", { enumerable: true, get: function () { return patterns_1.PatternDetector; } });
Object.defineProperty(exports, "DetectedPattern", { enumerable: true, get: function () { return patterns_1.DetectedPattern; } });
Object.defineProperty(exports, "PatternType", { enumerable: true, get: function () { return patterns_1.PatternType; } });
Object.defineProperty(exports, "ConfidenceLevel", { enumerable: true, get: function () { return patterns_1.ConfidenceLevel; } });
//# sourceMappingURL=index.js.map