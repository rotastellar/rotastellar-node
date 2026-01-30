"use strict";
/**
 * RotaStellar Compute - Orbital Compute Planning & Simulation
 *
 * Tools for planning and simulating space-based data centers.
 *
 * Documentation: https://rotastellar.com/docs/compute
 * GitHub: https://github.com/rotastellar/rotastellar-node
 *
 * @example
 * import { FeasibilityCalculator, WorkloadType } from '@rotastellar/compute';
 *
 * const calculator = new FeasibilityCalculator({ apiKey: "rs_live_xxx" });
 * const result = calculator.analyze({
 *   workloadType: WorkloadType.INFERENCE,
 *   computeTflops: 10,
 *   memoryGb: 32
 * });
 * console.log(`Feasible: ${result.feasible}, Rating: ${result.rating}`);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatteryChemistry = exports.SolarCellType = exports.PowerAnalyzer = exports.LinkType = exports.LatencySimulator = exports.OrbitType = exports.ThermalSimulator = exports.WorkloadType = exports.FeasibilityRating = exports.FeasibilityCalculator = exports.VERSION = void 0;
exports.VERSION = "0.1.0";
// Feasibility
var feasibility_1 = require("./feasibility");
Object.defineProperty(exports, "FeasibilityCalculator", { enumerable: true, get: function () { return feasibility_1.FeasibilityCalculator; } });
Object.defineProperty(exports, "FeasibilityRating", { enumerable: true, get: function () { return feasibility_1.FeasibilityRating; } });
Object.defineProperty(exports, "WorkloadType", { enumerable: true, get: function () { return feasibility_1.WorkloadType; } });
// Thermal
var thermal_1 = require("./thermal");
Object.defineProperty(exports, "ThermalSimulator", { enumerable: true, get: function () { return thermal_1.ThermalSimulator; } });
Object.defineProperty(exports, "OrbitType", { enumerable: true, get: function () { return thermal_1.OrbitType; } });
// Latency
var latency_1 = require("./latency");
Object.defineProperty(exports, "LatencySimulator", { enumerable: true, get: function () { return latency_1.LatencySimulator; } });
Object.defineProperty(exports, "LinkType", { enumerable: true, get: function () { return latency_1.LinkType; } });
// Power
var power_1 = require("./power");
Object.defineProperty(exports, "PowerAnalyzer", { enumerable: true, get: function () { return power_1.PowerAnalyzer; } });
Object.defineProperty(exports, "SolarCellType", { enumerable: true, get: function () { return power_1.SolarCellType; } });
Object.defineProperty(exports, "BatteryChemistry", { enumerable: true, get: function () { return power_1.BatteryChemistry; } });
//# sourceMappingURL=index.js.map