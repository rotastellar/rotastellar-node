/**
 * RotaStellar Intel - Satellite Tracker
 *
 * Real-time satellite tracking and position calculations.
 *
 * subhadipmitra@: TypeScript port of the Python tracker. Two modes:
 * 1. API mode: fetches pre-computed positions (fast, limited history)
 * 2. Local mode: propagates TLEs with SGP4 (slower, unlimited predictions)
 *
 * For most use cases, API mode is sufficient. Use local mode for:
 * - Predictions >7 days into the future
 * - High-frequency updates (>1 Hz)
 * - Offline operation
 */

// TODO(subhadipmitra): Add real-time WebSocket subscription for position updates
// TODO: Integrate with satellite.js for local SGP4 propagation

import {
  RotaStellarClient,
  Position,
  Satellite,
  TimeRange,
  ClientOptions,
} from "@rotastellar/sdk";
import { TLE } from "./tle";

/**
 * Ground station for satellite pass calculations.
 */
export class GroundStation {
  /** Station name/identifier */
  public readonly name: string;
  /** Geographic position of the station */
  public readonly position: Position;
  /** Minimum elevation angle for visibility (default: 10°) */
  public readonly minElevationDeg: number;

  constructor(name: string, position: Position, minElevationDeg: number = 10.0) {
    this.name = name;
    this.position = position;
    this.minElevationDeg = minElevationDeg;
  }
}

/**
 * A satellite pass over a ground station.
 */
export interface SatellitePassData {
  satelliteId: string;
  groundStation: string;
  aos: Date;
  los: Date;
  tca: Date;
  maxElevationDeg: number;
  aosAzimuthDeg: number;
  losAzimuthDeg: number;
}

export class SatellitePass {
  /** Satellite identifier */
  public readonly satelliteId: string;
  /** Ground station name */
  public readonly groundStation: string;
  /** Acquisition of Signal (rise time) */
  public readonly aos: Date;
  /** Loss of Signal (set time) */
  public readonly los: Date;
  /** Time of Closest Approach (max elevation) */
  public readonly tca: Date;
  /** Maximum elevation angle */
  public readonly maxElevationDeg: number;
  /** Azimuth at AOS */
  public readonly aosAzimuthDeg: number;
  /** Azimuth at LOS */
  public readonly losAzimuthDeg: number;

  constructor(data: SatellitePassData) {
    this.satelliteId = data.satelliteId;
    this.groundStation = data.groundStation;
    this.aos = data.aos;
    this.los = data.los;
    this.tca = data.tca;
    this.maxElevationDeg = data.maxElevationDeg;
    this.aosAzimuthDeg = data.aosAzimuthDeg;
    this.losAzimuthDeg = data.losAzimuthDeg;
  }

  /** Duration of the pass in seconds. */
  get durationSeconds(): number {
    return (this.los.getTime() - this.aos.getTime()) / 1000;
  }

  /** Duration of the pass in minutes. */
  get durationMinutes(): number {
    return this.durationSeconds / 60;
  }
}

/**
 * Real-time satellite tracker.
 *
 * Track satellites, calculate positions, and predict passes over ground stations.
 *
 * @example
 * import { Tracker, GroundStation } from "@rotastellar/intel";
 * import { Position } from "@rotastellar/sdk";
 *
 * const tracker = new Tracker({ apiKey: "rs_live_xxx" });
 *
 * // Track the ISS
 * const iss = tracker.track("ISS");
 * const pos = await iss.position();
 * console.log(`ISS at ${pos.latitude.toFixed(2)}, ${pos.longitude.toFixed(2)}`);
 *
 * // Get upcoming passes
 * const station = new GroundStation("home", new Position(40.7128, -74.0060, 0));
 * const passes = await tracker.passes("ISS", station, 24);
 */
export class Tracker {
  private _client: RotaStellarClient;
  private _cache: Map<string, Satellite> = new Map();
  private _tleCache: Map<string, TLE> = new Map();

  /**
   * Initialize the tracker.
   *
   * @param options - Client configuration options (apiKey, etc.)
   * @param client - Existing RotaStellarClient (alternative to options)
   */
  constructor(options?: ClientOptions, client?: RotaStellarClient) {
    if (client) {
      this._client = client;
    } else {
      this._client = new RotaStellarClient(options);
    }
  }

  /** Get the underlying API client. */
  get client(): RotaStellarClient {
    return this._client;
  }

  /**
   * Track a satellite by ID.
   *
   * @param satelliteId - Satellite ID, NORAD number, or name
   * @returns TrackedSatellite object for querying position
   *
   * @example
   * const iss = tracker.track("ISS");
   * const pos = await iss.position();
   */
  track(satelliteId: string): TrackedSatellite {
    return new TrackedSatellite(this, satelliteId);
  }

  /**
   * Get satellite information.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @returns Satellite object with current data
   */
  async getSatellite(satelliteId: string): Promise<Satellite> {
    // Check cache first
    const cached = this._cache.get(satelliteId);
    if (cached) {
      return cached;
    }

    const satellite = await this._client.getSatellite(satelliteId);
    this._cache.set(satelliteId, satellite);
    return satellite;
  }

  /**
   * Get satellite position at a specific time.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @param atTime - Target time (default: now)
   * @returns Position at the specified time
   */
  async getPosition(satelliteId: string, atTime?: Date): Promise<Position> {
    const timeStr = atTime?.toISOString();
    return this._client.getSatellitePosition(satelliteId, timeStr);
  }

  /**
   * Get satellite positions over a time range.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @param timeRange - Time range to query
   * @param stepSeconds - Time step between positions (default: 60)
   * @returns List of position records with timestamps
   */
  async getPositions(
    satelliteId: string,
    timeRange: TimeRange,
    stepSeconds: number = 60
  ): Promise<Array<{ time: string; position: ReturnType<Position["toDict"]> }>> {
    const positions: Array<{ time: string; position: ReturnType<Position["toDict"]> }> = [];
    let current = new Date(timeRange.start);

    while (current <= timeRange.end) {
      try {
        const pos = await this.getPosition(satelliteId, current);
        positions.push({
          time: current.toISOString(),
          position: pos.toDict(),
        });
      } catch {
        // Skip failed positions
      }
      current = new Date(current.getTime() + stepSeconds * 1000);
    }

    return positions;
  }

  /**
   * Predict satellite passes over a ground station.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @param groundStation - Ground station for pass calculations
   * @param hours - Time window in hours (default: 24)
   * @param minElevationDeg - Minimum elevation (overrides station default)
   * @returns List of predicted passes
   */
  async passes(
    _satelliteId: string,
    _groundStation: GroundStation,
    _hours: number = 24,
    _minElevationDeg?: number
  ): Promise<SatellitePass[]> {
    // This would typically call the API for pass predictions
    // For now, return empty list as placeholder
    // Real implementation would use SGP4 propagation
    return [];
  }

  /**
   * Get the latest TLE for a satellite.
   *
   * @param satelliteId - Satellite ID or NORAD number
   * @returns TLE object
   */
  async getTle(satelliteId: string): Promise<TLE> {
    // Check cache first
    const cached = this._tleCache.get(satelliteId);
    if (cached) {
      return cached;
    }

    // This would fetch TLE from API
    throw new Error(
      "TLE fetching requires API integration. Use TLE.parse() with known TLE data instead."
    );
  }

  /**
   * List satellites with optional filtering.
   *
   * @param options - Filtering options
   * @returns List of satellites
   */
  async listSatellites(options: {
    constellation?: string;
    operator?: string;
    limit?: number;
  } = {}): Promise<Satellite[]> {
    return this._client.listSatellites({
      constellation: options.constellation,
      operator: options.operator,
      limit: options.limit ?? 100,
    });
  }
}

/**
 * A tracked satellite with convenient position methods.
 *
 * This class provides a fluent interface for querying satellite positions.
 */
export class TrackedSatellite {
  private _tracker: Tracker;
  private _satelliteId: string;
  private _satellite: Satellite | null = null;

  constructor(tracker: Tracker, satelliteId: string) {
    this._tracker = tracker;
    this._satelliteId = satelliteId;
  }

  /** Get the satellite ID. */
  get id(): string {
    return this._satelliteId;
  }

  /** Get the satellite info (cached). */
  async satellite(): Promise<Satellite> {
    if (this._satellite === null) {
      this._satellite = await this._tracker.getSatellite(this._satelliteId);
    }
    return this._satellite;
  }

  /** Get the satellite name. */
  async name(): Promise<string> {
    const sat = await this.satellite();
    return sat.name;
  }

  /** Get the NORAD catalog number. */
  async noradId(): Promise<number> {
    const sat = await this.satellite();
    return sat.noradId;
  }

  /**
   * Get the satellite position.
   *
   * @param atTime - Target time (default: now)
   * @returns Current or historical position
   */
  async position(atTime?: Date): Promise<Position> {
    return this._tracker.getPosition(this._satelliteId, atTime);
  }

  /**
   * Get positions over a time range.
   *
   * @param timeRange - Time range to query
   * @param stepSeconds - Time step between positions
   * @returns List of position records
   */
  async positions(
    timeRange: TimeRange,
    stepSeconds: number = 60
  ): Promise<Array<{ time: string; position: ReturnType<Position["toDict"]> }>> {
    return this._tracker.getPositions(this._satelliteId, timeRange, stepSeconds);
  }

  /**
   * Get upcoming passes over a ground station.
   *
   * @param groundStation - Ground station
   * @param hours - Time window
   * @returns List of predicted passes
   */
  async passes(groundStation: GroundStation, hours: number = 24): Promise<SatellitePass[]> {
    return this._tracker.passes(this._satelliteId, groundStation, hours);
  }

  toString(): string {
    return `TrackedSatellite(${this._satelliteId})`;
  }
}
