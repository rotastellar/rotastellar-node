/**
 * RotaStellar SDK - Main Client
 *
 * The main entry point for the RotaStellar SDK.
 *
 * subhadipmitra@: This is the primary interface users interact with. We optimized for:
 * - Simple: one import, one class, sensible defaults
 * - Safe: automatic retry, rate limiting, API key validation
 * - TypeScript-first: full type safety with generics where appropriate
 *
 * The client is stateless (no caching) to avoid stale data. For high-frequency
 * access, users should implement their own cache layer.
 */

// TODO(subhadipmitra): Add request/response interceptors for debugging
// TODO: Consider adding a streaming API for real-time satellite positions

import { validateApiKey } from "./auth";
import { Config, ConfigOptions } from "./config";
import { HTTPClient } from "./http";
import {
  Position,
  PositionData,
  Satellite,
  SatelliteData,
  TimeRange,
} from "./types";

/**
 * Satellite descriptor for constellation operations.
 */
export interface FleetMember {
  satellite_id: string;
  [key: string]: unknown;
}

/**
 * Fault injection parameters.
 */
export interface FaultParams {
  satellite_id: string;
  fault_type: string;
  severity?: number;
}

/**
 * Client options for RotaStellarClient.
 */
export interface ClientOptions extends ConfigOptions {}

/**
 * Main client for the RotaStellar API.
 *
 * This is the primary entry point for interacting with RotaStellar services.
 *
 * @example
 * import { RotaStellarClient } from '@rotastellar/sdk';
 *
 * const client = new RotaStellarClient({ apiKey: "rs_live_xxx" });
 *
 * // List satellites
 * const satellites = await client.listSatellites({ constellation: "starlink" });
 * for (const sat of satellites) {
 *   console.log(`${sat.name}: ${sat.noradId}`);
 * }
 *
 * // Get specific satellite
 * const iss = await client.getSatellite("iss");
 * console.log(`ISS at ${iss.position?.latitude}, ${iss.position?.longitude}`);
 */
export class RotaStellarClient {
  public readonly config: Config;
  public readonly http: HTTPClient;
  private readonly simHttp: HTTPClient;

  /**
   * Initialize the RotaStellar client.
   *
   * @param options - Client configuration options
   * @throws MissingAPIKeyError if no API key is provided or found
   * @throws InvalidAPIKeyError if API key format is invalid
   */
  constructor(options: ClientOptions = {}) {
    this.config = new Config(options);
    validateApiKey(this.config.apiKey);
    this.http = new HTTPClient(this.config);

    // Sim HTTP client (sim.rotastellar.com)
    const simConfig = new Config({
      ...options,
      baseUrl: "https://sim.rotastellar.com/v1",
    });
    this.simHttp = new HTTPClient(simConfig);
  }

  /** Get the API key environment (test or live). */
  get environment(): string | undefined {
    return this.config.environment;
  }

  // =========================================================================
  // Satellite Operations
  // =========================================================================

  /**
   * List satellites with optional filtering.
   *
   * @param options - Filtering options
   * @returns List of Satellite objects
   *
   * @example
   * const satellites = await client.listSatellites({
   *   constellation: "starlink",
   *   limit: 10
   * });
   * console.log(`Found ${satellites.length} Starlink satellites`);
   */
  async listSatellites(options: {
    constellation?: string;
    operator?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Satellite[]> {
    const params = {
      constellation: options.constellation,
      operator: options.operator,
      type: options.type,
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
    };

    const response = await this.http.get("/satellites", params);
    const satellites = (response.data as SatelliteData[]) ?? [];
    return satellites.map((sat) => Satellite.fromDict(sat));
  }

  /**
   * Get a specific satellite by ID.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @returns Satellite object with current position and orbital elements
   *
   * @example
   * const iss = await client.getSatellite("25544"); // NORAD ID for ISS
   * console.log(`ISS altitude: ${iss.position?.altitudeKm?.toFixed(1)} km`);
   */
  async getSatellite(satelliteId: string): Promise<Satellite> {
    const response = await this.http.get(`/satellites/${satelliteId}`);
    return Satellite.fromDict(response as unknown as SatelliteData);
  }

  /**
   * Get satellite position at a specific time.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @param atTime - ISO 8601 timestamp (default: now)
   * @returns Position object with lat, lon, altitude
   *
   * @example
   * const pos = await client.getSatellitePosition("25544");
   * console.log(`ISS: ${pos.latitude.toFixed(2)}, ${pos.longitude.toFixed(2)}`);
   */
  async getSatellitePosition(
    satelliteId: string,
    atTime?: string
  ): Promise<Position> {
    const params = atTime ? { at: atTime } : undefined;
    const response = await this.http.get(
      `/satellites/${satelliteId}/position`,
      params
    );
    return Position.fromDict(response as unknown as PositionData);
  }

  /**
   * Get predicted trajectory for a satellite.
   *
   * @param options - Trajectory parameters
   * @returns List of trajectory points
   *
   * @example
   * const trajectory = await client.getTrajectory({
   *   satelliteId: "25544",
   *   start: new Date(),
   *   end: new Date(Date.now() + 2 * 60 * 60 * 1000),
   *   intervalSec: 60
   * });
   */
  async getTrajectory(options: {
    satelliteId: string;
    start?: Date;
    end?: Date;
    intervalSec?: number;
  }): Promise<Record<string, unknown>[]> {
    const params: Record<string, unknown> = {
      interval_sec: options.intervalSec ?? 60,
    };
    if (options.start) {
      params.start = options.start.toISOString();
    }
    if (options.end) {
      params.end = options.end.toISOString();
    }

    const response = await this.http.get(
      `/satellites/${options.satelliteId}/trajectory`,
      params
    );
    return (response.points as Record<string, unknown>[]) ?? [];
  }

  // =========================================================================
  // Conjunction Analysis
  // =========================================================================

  /**
   * List close approaches (conjunctions) between space objects.
   *
   * @param options - Filtering options
   * @returns List of conjunction events with probability and miss distance
   *
   * @example
   * const conjunctions = await client.listConjunctions({
   *   satelliteId: "starlink-1234",
   *   thresholdKm: 5.0,
   *   timeRange: TimeRange.nextHours(72)
   * });
   * for (const c of conjunctions) {
   *   console.log(`${c.miss_distance_km.toFixed(2)} km at ${c.tca}`);
   * }
   */
  async listConjunctions(options: {
    satelliteId?: string;
    thresholdKm?: number;
    timeRange?: TimeRange;
    limit?: number;
  } = {}): Promise<Record<string, unknown>[]> {
    const params: Record<string, unknown> = {
      satellite_id: options.satelliteId,
      threshold_km: options.thresholdKm ?? 1.0,
      limit: options.limit ?? 100,
    };
    if (options.timeRange) {
      params.start = options.timeRange.start.toISOString();
      params.end = options.timeRange.end.toISOString();
    }

    const response = await this.http.get("/conjunctions", params);
    return (response.data as Record<string, unknown>[]) ?? [];
  }

  // =========================================================================
  // Pattern Detection
  // =========================================================================

  /**
   * Detect anomalies and maneuvers in satellite behavior.
   *
   * @param options - Pattern detection options
   * @returns List of detected patterns
   *
   * @example
   * const patterns = await client.listPatterns({
   *   satelliteId: "44832",
   *   lookbackDays: 30,
   *   minConfidence: 0.8
   * });
   */
  async listPatterns(options: {
    satelliteId: string;
    lookbackDays?: number;
    patternType?: string;
    minConfidence?: number;
  }): Promise<Record<string, unknown>[]> {
    const params: Record<string, unknown> = {
      satellite: options.satelliteId,
      lookback_days: options.lookbackDays ?? 30,
      min_confidence: options.minConfidence ?? 0.7,
    };
    if (options.patternType) {
      params.type = options.patternType;
    }

    const response = await this.http.get("/patterns", params);
    return (response.patterns as Record<string, unknown>[]) ?? [];
  }

  // =========================================================================
  // Planning Operations
  // =========================================================================

  /**
   * Analyze feasibility of orbital compute for a workload.
   *
   * @param options - Workload parameters
   * @returns Feasibility analysis with recommendations
   *
   * @example
   * const result = await client.analyzeFeasibility({
   *   workloadType: "inference",
   *   computeTflops: 10,
   *   dataGb: 1.5,
   *   latencyRequirementMs: 100
   * });
   * console.log(`Feasible: ${result.feasible}`);
   */
  async analyzeFeasibility(options: {
    workloadType: string;
    computeTflops: number;
    dataGb: number;
    latencyRequirementMs?: number;
    orbitAltitudeKm?: number;
  }): Promise<Record<string, unknown>> {
    const data = {
      workload_type: options.workloadType,
      compute_tflops: options.computeTflops,
      data_gb: options.dataGb,
      latency_requirement_ms: options.latencyRequirementMs,
      orbit_altitude_km: options.orbitAltitudeKm ?? 550,
    };
    return this.http.post("/planning/analyze", data);
  }

  /**
   * Simulate thermal conditions for orbital compute.
   *
   * @param options - Thermal simulation parameters
   * @returns Thermal simulation results with temperature profiles
   *
   * @example
   * const result = await client.simulateThermal({
   *   powerWatts: 500,
   *   radiatorAreaM2: 2.0,
   *   durationHours: 24
   * });
   * console.log(`Max temp: ${result.max_temperature_c}C`);
   */
  async simulateThermal(options: {
    powerWatts: number;
    orbitAltitudeKm?: number;
    radiatorAreaM2?: number;
    durationHours?: number;
  }): Promise<Record<string, unknown>> {
    const data = {
      power_watts: options.powerWatts,
      orbit_altitude_km: options.orbitAltitudeKm ?? 550,
      radiator_area_m2: options.radiatorAreaM2 ?? 1.0,
      duration_hours: options.durationHours ?? 24,
    };
    return this.http.post("/planning/thermal", data);
  }

  /**
   * Simulate network latency through orbital infrastructure.
   *
   * @param options - Latency simulation parameters
   * @returns Latency simulation with breakdown by segment
   *
   * @example
   * const source = new Position(37.7749, -122.4194); // SF
   * const dest = new Position(51.5074, -0.1278); // London
   * const result = await client.simulateLatency({ source, destination: dest });
   * console.log(`Total latency: ${result.total_latency_ms?.toFixed(1)} ms`);
   */
  async simulateLatency(options: {
    source: Position;
    destination: Position;
    orbitAltitudeKm?: number;
    relayCount?: number;
  }): Promise<Record<string, unknown>> {
    const data = {
      source: options.source.toDict(),
      destination: options.destination.toDict(),
      orbit_altitude_km: options.orbitAltitudeKm ?? 550,
      relay_count: options.relayCount ?? 0,
    };
    return this.http.post("/planning/latency", data);
  }

  // =========================================================================
  // Constellation Operations
  // =========================================================================

  /**
   * Plan compute across a constellation of satellites.
   *
   * @param fleet - List of satellite descriptors
   * @param presetId - Preset ID to apply to the fleet
   * @param options - Additional planning parameters
   * @returns Constellation plan with per-satellite assignments
   *
   * @example
   * const plan = await client.planConstellation(
   *   [{ satellite_id: "25544" }, { satellite_id: "44832" }],
   *   "preset_edge_inference"
   * );
   * console.log(`Planned ${plan.assignments.length} assignments`);
   */
  async planConstellation(
    fleet: FleetMember[],
    presetId: string,
    options: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const data = {
      fleet,
      preset_id: presetId,
      ...options,
    };
    return this.http.post("/constellation/plan", data);
  }

  /**
   * Generate Pareto-optimal plans for a constellation.
   *
   * @param fleet - List of satellite descriptors
   * @param presetId - Preset ID to apply to the fleet
   * @param options - Additional planning parameters
   * @returns Set of Pareto-optimal plans trading off cost, latency, and coverage
   *
   * @example
   * const result = await client.paretoConstellation(
   *   [{ satellite_id: "25544" }],
   *   "preset_edge_inference"
   * );
   * for (const front of result.pareto_front) {
   *   console.log(`Cost: ${front.cost}, Latency: ${front.latency_ms}`);
   * }
   */
  async paretoConstellation(
    fleet: FleetMember[],
    presetId: string,
    options: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const data = {
      fleet,
      preset_id: presetId,
      ...options,
    };
    return this.http.post("/constellation/pareto", data);
  }

  // =========================================================================
  // Pareto Planning
  // =========================================================================

  /**
   * Create a Pareto-optimal compute plan for a single satellite.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @param presetId - Preset ID to use for planning
   * @param options - Additional planning parameters
   * @returns Pareto-optimal plan with trade-off frontiers
   *
   * @example
   * const plan = await client.createParetoPlan("25544", "preset_edge_inference");
   * console.log(`Optimal plans: ${plan.pareto_front.length}`);
   */
  async createParetoPlan(
    satelliteId: string,
    presetId: string,
    options: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const data = {
      satellite_id: satelliteId,
      preset_id: presetId,
      pareto: true,
      ...options,
    };
    return this.http.post("/plan", data);
  }

  // =========================================================================
  // Hazard Prediction
  // =========================================================================

  /**
   * Predict orbital hazards for a satellite.
   *
   * Analyzes conjunction risk, radiation exposure, eclipse transitions,
   * and debris proximity over the prediction window.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @param predictionHours - Prediction window in hours (default: 24)
   * @returns Hazard predictions with risk scores and timelines
   *
   * @example
   * const hazards = await client.predictHazards("25544", 48);
   * for (const h of hazards.hazards) {
   *   console.log(`${h.type}: risk=${h.risk_score.toFixed(2)}`);
   * }
   */
  async predictHazards(
    satelliteId: string,
    predictionHours: number = 24
  ): Promise<Record<string, unknown>> {
    const data = {
      satellite_id: satelliteId,
      prediction_hours: predictionHours,
    };
    return this.http.post("/hazards", data);
  }

  // =========================================================================
  // OCU (Orbital Compute Unit) Operations
  // =========================================================================

  /**
   * Negotiate an Orbital Compute Unit allocation for a satellite.
   *
   * Determines available compute capacity based on current power budget,
   * thermal state, and contact window schedule.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @param workloadPowerW - Requested workload power in watts (default: 50)
   * @returns OCU allocation with compute capacity, duration, and constraints
   *
   * @example
   * const ocu = await client.negotiateOcu("25544", 75);
   * console.log(`Allocated: ${ocu.ocu_count} OCUs for ${ocu.duration_s}s`);
   */
  async negotiateOcu(
    satelliteId: string,
    workloadPowerW: number = 50
  ): Promise<Record<string, unknown>> {
    const data = {
      satellite_id: satelliteId,
      workload_power_w: workloadPowerW,
    };
    return this.http.post("/ocu/negotiate", data);
  }

  /**
   * Get OCU capacity summary for a satellite bus class.
   *
   * @param busClass - Satellite bus class (e.g., "espa", "smallsat", "medium")
   * @returns OCU summary with typical capacity, power budget, and thermal limits
   *
   * @example
   * const summary = await client.getOcuSummary("smallsat");
   * console.log(`Typical OCUs: ${summary.typical_ocu_count}`);
   */
  async getOcuSummary(
    busClass: string
  ): Promise<Record<string, unknown>> {
    return this.http.get(`/ocu/summary/${busClass}`);
  }

  // =========================================================================
  // Sim Sessions
  // =========================================================================

  /**
   * Create a new simulation session.
   *
   * @param satellites - List of satellite configurations for the simulation
   * @returns Session object with session_id and initial state
   *
   * @example
   * const session = await client.createSession([
   *   { satellite_id: "25544", preset_id: "preset_edge_inference" }
   * ]);
   * console.log(`Session: ${session.session_id}`);
   */
  async createSession(
    satellites: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    const data = { satellites };
    return this.simHttp.post("/sessions", data);
  }

  /**
   * Get the current state of a simulation session.
   *
   * @param sessionId - Session ID returned from createSession
   * @returns Session state with satellite positions, power levels, and events
   *
   * @example
   * const state = await client.getSession("sess_abc123");
   * console.log(`Sim time: ${state.sim_time}`);
   */
  async getSession(
    sessionId: string
  ): Promise<Record<string, unknown>> {
    return this.simHttp.get(`/sessions/${sessionId}`);
  }

  /**
   * Advance a simulation session by a time step.
   *
   * @param sessionId - Session ID
   * @param durationS - Time step duration in seconds (default: 60)
   * @returns Updated session state after the tick
   *
   * @example
   * const result = await client.tickSession("sess_abc123", 120);
   * console.log(`New sim time: ${result.sim_time}`);
   */
  async tickSession(
    sessionId: string,
    durationS: number = 60
  ): Promise<Record<string, unknown>> {
    const data = { duration_s: durationS };
    return this.simHttp.post(`/sessions/${sessionId}/tick`, data);
  }

  /**
   * Inject a fault into a simulated satellite.
   *
   * @param sessionId - Session ID
   * @param params - Fault injection parameters
   * @returns Fault injection result with affected subsystems
   *
   * @example
   * const result = await client.injectFault("sess_abc123", {
   *   satellite_id: "25544",
   *   fault_type: "power_loss",
   *   severity: 0.8
   * });
   * console.log(`Affected: ${result.affected_subsystems}`);
   */
  async injectFault(
    sessionId: string,
    params: FaultParams
  ): Promise<Record<string, unknown>> {
    const data = {
      satellite_id: params.satellite_id,
      fault_type: params.fault_type,
      severity: params.severity ?? 0.5,
    };
    return this.simHttp.post(`/sessions/${sessionId}/fault`, data);
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get platform metrics and usage statistics.
   *
   * @returns Metrics including API usage, compute hours, active sessions, etc.
   *
   * @example
   * const metrics = await client.getMetrics();
   * console.log(`Compute hours: ${metrics.compute_hours}`);
   */
  async getMetrics(): Promise<Record<string, unknown>> {
    return this.http.get("/metrics");
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Check API connectivity and authentication.
   *
   * @returns API status information
   *
   * @example
   * const status = await client.ping();
   * console.log(`API version: ${status.version}`);
   */
  async ping(): Promise<Record<string, unknown>> {
    return this.http.get("/ping");
  }

  toString(): string {
    const env = this.environment ?? "unknown";
    return `RotaStellarClient(environment=${env})`;
  }
}
