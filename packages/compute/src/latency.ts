/**
 * RotaStellar Compute - Latency Simulation
 *
 * End-to-end latency modeling for orbital compute systems.
 *
 * subhadipmitra@: Latency components for orbital compute:
 * 1. Propagation: ~2ms for 550km LEO (speed of light)
 * 2. Ground station queuing: variable
 * 3. ISL hops: ~0.01ms per 1000km (negligible vs ground!)
 * 4. Processing: workload-dependent
 *
 * Counterintuitive: LEO ISL mesh can be FASTER than terrestrial fiber because
 * light in vacuum > light in glass (0.67c). SF→NYC: ~21ms via fiber, ~15ms via LEO ISL.
 */

// TODO(subhadipmitra): Add jitter modeling for ground station handoffs
// TODO: Integrate with real-time constellation state for accurate ISL routing

import { RotaStellarClient, Position, ClientOptions } from "@rotastellar/sdk";

// Physical constants
const SPEED_OF_LIGHT_KM_S = 299792.458;
const EARTH_RADIUS_KM = 6371.0;

/**
 * Types of communication links.
 */
export enum LinkType {
  GROUND_TO_SATELLITE = "ground_to_satellite",
  SATELLITE_TO_GROUND = "satellite_to_ground",
  INTER_SATELLITE = "inter_satellite",
  OPTICAL = "optical",
  RF = "rf",
}

/**
 * A component of end-to-end latency.
 */
export interface LatencyComponent {
  name: string;
  latencyMs: number;
  description: string;
}

/**
 * Result of latency simulation.
 */
export interface LatencyResult {
  totalLatencyMs: number;
  propagationLatencyMs: number;
  processingLatencyMs: number;
  queuingLatencyMs: number;
  components: LatencyComponent[];
  path: string;
  achievable: boolean;
}

/**
 * Simulate network latency through orbital infrastructure.
 *
 * @example
 * import { LatencySimulator } from "@rotastellar/compute";
 * import { Position } from "@rotastellar/sdk";
 *
 * const simulator = new LatencySimulator({ apiKey: "rs_live_xxx" });
 * const source = new Position(37.7749, -122.4194, 0); // San Francisco
 * const dest = new Position(51.5074, -0.1278, 0); // London
 * const result = simulator.simulate(source, dest);
 * console.log(`Total latency: ${result.totalLatencyMs.toFixed(1)} ms`);
 */
export class LatencySimulator {
  private _client: RotaStellarClient;
  private _orbitAltitudeKm: number;

  static readonly DEFAULT_PROCESSING_LATENCY = 2.0;
  static readonly DEFAULT_GROUND_STATION_LATENCY = 1.0;
  static readonly DEFAULT_QUEUING_LATENCY = 0.5;

  constructor(options?: ClientOptions, orbitAltitudeKm: number = 550) {
    this._client = new RotaStellarClient(options);
    this._orbitAltitudeKm = orbitAltitudeKm;
  }

  get client(): RotaStellarClient {
    return this._client;
  }

  /**
   * Simulate end-to-end latency.
   */
  simulate(
    source: Position,
    destination: Position,
    options?: {
      orbitAltitudeKm?: number;
      relayCount?: number;
      includeCompute?: boolean;
      computeTimeMs?: number;
    }
  ): LatencyResult {
    const altitude = options?.orbitAltitudeKm ?? this._orbitAltitudeKm;
    const relayCount = options?.relayCount ?? 0;
    const includeCompute = options?.includeCompute ?? false;
    const computeTimeMs = options?.computeTimeMs ?? 0;

    const components: LatencyComponent[] = [];

    // Uplink
    const uplinkDistance = this.slantRange(source, altitude);
    const uplinkLatency = this.propagationDelay(uplinkDistance);
    components.push({
      name: "uplink",
      latencyMs: uplinkLatency,
      description: `Ground to satellite (${Math.round(uplinkDistance)} km)`,
    });

    // Ground station TX
    components.push({
      name: "ground_station_tx",
      latencyMs: LatencySimulator.DEFAULT_GROUND_STATION_LATENCY,
      description: "Ground station transmit processing",
    });

    // Inter-satellite links
    let islLatency = 0;
    if (relayCount > 0) {
      const groundDistance = this.groundDistance(source, destination);
      const islDistance = this.estimateIslDistance(groundDistance, relayCount, altitude);
      islLatency = this.propagationDelay(islDistance);
      components.push({
        name: "inter_satellite",
        latencyMs: islLatency,
        description: `${relayCount} ISL hop(s), ${Math.round(islDistance)} km total`,
      });

      const relayProcessing = relayCount * 0.5;
      components.push({
        name: "relay_processing",
        latencyMs: relayProcessing,
        description: `Processing at ${relayCount} relay satellite(s)`,
      });
    }

    // Satellite processing
    components.push({
      name: "satellite_processing",
      latencyMs: LatencySimulator.DEFAULT_PROCESSING_LATENCY,
      description: "Satellite onboard processing",
    });

    // Compute time
    if (includeCompute && computeTimeMs > 0) {
      components.push({
        name: "compute",
        latencyMs: computeTimeMs,
        description: "Orbital compute processing",
      });
    }

    // Downlink
    const downlinkDistance = this.slantRange(destination, altitude);
    const downlinkLatency = this.propagationDelay(downlinkDistance);
    components.push({
      name: "downlink",
      latencyMs: downlinkLatency,
      description: `Satellite to ground (${Math.round(downlinkDistance)} km)`,
    });

    // Ground station RX
    components.push({
      name: "ground_station_rx",
      latencyMs: LatencySimulator.DEFAULT_GROUND_STATION_LATENCY,
      description: "Ground station receive processing",
    });

    // Queuing
    components.push({
      name: "queuing",
      latencyMs: LatencySimulator.DEFAULT_QUEUING_LATENCY,
      description: "Network queuing delay",
    });

    // Calculate totals
    const totalLatency = components.reduce((sum, c) => sum + c.latencyMs, 0);
    const propagation = uplinkLatency + islLatency + downlinkLatency;
    const processing = components
      .filter((c) =>
        ["satellite_processing", "ground_station_tx", "ground_station_rx", "relay_processing"].includes(
          c.name
        )
      )
      .reduce((sum, c) => sum + c.latencyMs, 0);
    const queuing = LatencySimulator.DEFAULT_QUEUING_LATENCY;

    // Build path
    const path =
      relayCount > 0
        ? `Source -> Ground Station -> Satellite -> ${relayCount}x ISL -> Satellite -> Ground Station -> Destination`
        : "Source -> Ground Station -> Satellite -> Ground Station -> Destination";

    return {
      totalLatencyMs: Math.round(totalLatency * 100) / 100,
      propagationLatencyMs: Math.round(propagation * 100) / 100,
      processingLatencyMs: Math.round(processing * 100) / 100,
      queuingLatencyMs: Math.round(queuing * 100) / 100,
      components,
      path,
      achievable: true,
    };
  }

  /**
   * Compare orbital vs terrestrial latency.
   */
  compareTerrestrial(
    source: Position,
    destination: Position,
    orbitAltitudeKm?: number
  ): {
    groundDistanceKm: number;
    orbitalDirectMs: number;
    orbitalRelayMs: number;
    terrestrialFiberMs: number;
    orbitalAdvantageMs: number;
    orbitalIsFaster: boolean;
  } {
    const altitude = orbitAltitudeKm ?? this._orbitAltitudeKm;

    const orbitalDirect = this.simulate(source, destination, {
      orbitAltitudeKm: altitude,
      relayCount: 0,
    });
    const orbitalRelay = this.simulate(source, destination, {
      orbitAltitudeKm: altitude,
      relayCount: 1,
    });

    const groundDistance = this.groundDistance(source, destination);

    // Fiber latency estimate
    let fiberLatency = (groundDistance / (SPEED_OF_LIGHT_KM_S * 0.67)) * 1000;
    fiberLatency += 10 + (groundDistance / 1000) * 2;

    return {
      groundDistanceKm: Math.round(groundDistance * 10) / 10,
      orbitalDirectMs: orbitalDirect.totalLatencyMs,
      orbitalRelayMs: orbitalRelay.totalLatencyMs,
      terrestrialFiberMs: Math.round(fiberLatency * 100) / 100,
      orbitalAdvantageMs: Math.round((fiberLatency - orbitalDirect.totalLatencyMs) * 100) / 100,
      orbitalIsFaster: orbitalDirect.totalLatencyMs < fiberLatency,
    };
  }

  /**
   * Calculate minimum achievable latency for given orbit.
   */
  minimumLatency(altitudeKm: number, elevationAngleDeg: number = 25): number {
    const slant = this.slantRangeFromElevation(altitudeKm, elevationAngleDeg);
    const propagation = 2 * this.propagationDelay(slant);
    const minProcessing =
      2 * LatencySimulator.DEFAULT_GROUND_STATION_LATENCY +
      LatencySimulator.DEFAULT_PROCESSING_LATENCY;
    return Math.round((propagation + minProcessing) * 100) / 100;
  }

  private slantRange(groundPos: Position, altitudeKm: number): number {
    return altitudeKm / Math.sin(Math.PI / 4); // Assume 45° elevation
  }

  private slantRangeFromElevation(altitudeKm: number, elevationDeg: number): number {
    const elevationRad = (elevationDeg * Math.PI) / 180;
    const rEarth = EARTH_RADIUS_KM;
    const rSat = rEarth + altitudeKm;

    const sinGamma = (rEarth * Math.cos(elevationRad)) / rSat;
    const gamma = Math.asin(sinGamma);
    const alpha = Math.PI / 2 - elevationRad - gamma;

    return (rEarth * Math.sin(alpha)) / Math.sin(gamma);
  }

  private propagationDelay(distanceKm: number): number {
    return (distanceKm / SPEED_OF_LIGHT_KM_S) * 1000;
  }

  private groundDistance(pos1: Position, pos2: Position): number {
    const lat1 = (pos1.latitude * Math.PI) / 180;
    const lat2 = (pos2.latitude * Math.PI) / 180;
    const dlon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

    const a =
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);
    const c = 2 * Math.asin(Math.sqrt(a));

    return EARTH_RADIUS_KM * c;
  }

  private estimateIslDistance(groundDistance: number, relayCount: number, altitudeKm: number): number {
    const rSat = EARTH_RADIUS_KM + altitudeKm;
    const arcAngle = groundDistance / EARTH_RADIUS_KM;
    const islArc = rSat * arcAngle;
    return islArc * 1.1;
  }
}
