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

export const VERSION = "0.1.0";

// Feasibility
export {
  FeasibilityCalculator,
  FeasibilityResult,
  FeasibilityRating,
  WorkloadProfile,
  WorkloadType,
} from "./feasibility";

// Thermal
export {
  ThermalSimulator,
  ThermalResult,
  ThermalConfig,
  ThermalEnvironment,
  OrbitType,
} from "./thermal";

// Latency
export {
  LatencySimulator,
  LatencyResult,
  LatencyComponent,
  LinkType,
} from "./latency";

// Power
export {
  PowerAnalyzer,
  PowerBudget,
  PowerProfile,
  SolarConfig,
  BatteryConfig,
  SolarCellType,
  BatteryChemistry,
} from "./power";
