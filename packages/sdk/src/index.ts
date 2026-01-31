/**
 * RotaStellar SDK - Space Computing Infrastructure
 *
 * Node.js SDK for orbital compute planning, simulation, and space intelligence.
 *
 * Documentation: https://rotastellar.com/docs
 * GitHub: https://github.com/rotastellar/rotastellar-node
 *
 * @example
 * import { RotaStellarClient, Position } from '@rotastellar/sdk';
 *
 * const client = new RotaStellarClient({ apiKey: "rs_live_xxx" });
 *
 * // List satellites
 * const satellites = await client.listSatellites({ constellation: "starlink" });
 * for (const sat of satellites) {
 *   console.log(`${sat.name}: ${sat.noradId}`);
 * }
 *
 * // Analyze orbital compute feasibility
 * const result = await client.analyzeFeasibility({
 *   workloadType: "inference",
 *   computeTflops: 10,
 *   dataGb: 1.5
 * });
 * console.log(`Feasible: ${result.feasible}`);
 */

export const VERSION = "0.1.0";

// Main client
export { RotaStellarClient, ClientOptions } from "./client";

// Types
export {
  Position,
  PositionData,
  Orbit,
  OrbitData,
  Satellite,
  SatelliteData,
  TimeRange,
  TimeRangeData,
  PaginatedResponse,
  EARTH_RADIUS_KM,
  EARTH_MU,
} from "./types";

// Configuration
export {
  Config,
  ConfigOptions,
  getDefaultConfig,
  setDefaultConfig,
} from "./config";

// Errors
export {
  RotaStellarError,
  AuthenticationError,
  MissingAPIKeyError,
  InvalidAPIKeyError,
  APIError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  NetworkError,
  TimeoutError,
} from "./errors";

// Auth utilities
export { validateApiKey, maskApiKey, getAuthHeader } from "./auth";

// HTTP Client (for advanced usage)
export { HTTPClient } from "./http";
