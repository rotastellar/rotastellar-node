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
export declare const VERSION = "0.1.0";
export { Tracker, TrackedSatellite, GroundStation, SatellitePass, SatellitePassData, } from "./tracker";
export { TLE, parseTle } from "./tle";
export { ConjunctionAnalyzer, Conjunction, ConjunctionData, RiskLevel, ManeuverRecommendation, } from "./conjunctions";
export { PatternDetector, DetectedPattern, DetectedPatternData, PatternType, ConfidenceLevel, } from "./patterns";
//# sourceMappingURL=index.d.ts.map