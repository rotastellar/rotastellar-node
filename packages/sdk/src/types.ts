/**
 * RotaStellar SDK - Common Types
 *
 * Core data types used throughout the SDK.
 *
 * subhadipmitra@: These types are shared across all RotaStellar packages.
 * Design decisions:
 * - Use degrees (not radians) for human-readable I/O
 * - Use km as standard distance unit (aerospace convention)
 * - Validate on construction to fail fast
 * - Provide both interface (PositionData) and class (Position) forms
 */

import { ValidationError } from "./errors";

// Earth constants
// NOTE(subhadipmitra): Using WGS84 equatorial radius. Polar radius is 6356.752 km.
export const EARTH_RADIUS_KM = 6378.137;
// Standard gravitational parameter (GM) for Earth
export const EARTH_MU = 398600.4418; // km^3/s^2

/**
 * Geographic position with altitude.
 */
export interface PositionData {
  latitude: number;
  longitude: number;
  altitude_km?: number;
}

export class Position {
  public readonly latitude: number;
  public readonly longitude: number;
  public readonly altitudeKm: number;

  /**
   * Create a Position.
   *
   * @param latitude - Latitude in degrees (-90 to 90)
   * @param longitude - Longitude in degrees (-180 to 180)
   * @param altitudeKm - Altitude above sea level in kilometers (default: 0)
   *
   * @example
   * const pos = new Position(28.5729, -80.6490, 408.0);
   * console.log(`ISS at ${pos.latitude}, ${pos.longitude}`);
   */
  constructor(latitude: number, longitude: number, altitudeKm: number = 0) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.altitudeKm = altitudeKm;
    this.validate();
  }

  private validate(): void {
    if (this.latitude < -90 || this.latitude > 90) {
      throw new ValidationError(
        "latitude",
        "Must be between -90 and 90 degrees"
      );
    }
    if (this.longitude < -180 || this.longitude > 180) {
      throw new ValidationError(
        "longitude",
        "Must be between -180 and 180 degrees"
      );
    }
    if (this.altitudeKm < 0) {
      throw new ValidationError("altitudeKm", "Must be non-negative");
    }
  }

  toDict(): PositionData {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      altitude_km: this.altitudeKm,
    };
  }

  static fromDict(data: PositionData): Position {
    return new Position(
      data.latitude,
      data.longitude,
      data.altitude_km ?? 0
    );
  }
}

/**
 * Keplerian orbital elements.
 */
export interface OrbitData {
  semi_major_axis_km: number;
  eccentricity: number;
  inclination_deg: number;
  raan_deg: number;
  arg_periapsis_deg: number;
  true_anomaly_deg: number;
}

export class Orbit {
  public readonly semiMajorAxisKm: number;
  public readonly eccentricity: number;
  public readonly inclinationDeg: number;
  public readonly raanDeg: number;
  public readonly argPeriapsisDeg: number;
  public readonly trueAnomalyDeg: number;

  /**
   * Create an Orbit from Keplerian elements.
   *
   * @param semiMajorAxisKm - Semi-major axis in kilometers
   * @param eccentricity - Orbital eccentricity (0 = circular, 0-1 = elliptical)
   * @param inclinationDeg - Inclination in degrees (0-180)
   * @param raanDeg - Right ascension of ascending node in degrees (0-360)
   * @param argPeriapsisDeg - Argument of periapsis in degrees (0-360)
   * @param trueAnomalyDeg - True anomaly in degrees (0-360)
   *
   * @example
   * const orbit = new Orbit(6778.0, 0.0001, 51.6, 100.0, 90.0, 0.0);
   * console.log(`Period: ${orbit.orbitalPeriodMinutes.toFixed(1)} minutes`);
   */
  constructor(
    semiMajorAxisKm: number,
    eccentricity: number,
    inclinationDeg: number,
    raanDeg: number,
    argPeriapsisDeg: number,
    trueAnomalyDeg: number
  ) {
    this.semiMajorAxisKm = semiMajorAxisKm;
    this.eccentricity = eccentricity;
    this.inclinationDeg = inclinationDeg;
    this.raanDeg = raanDeg;
    this.argPeriapsisDeg = argPeriapsisDeg;
    this.trueAnomalyDeg = trueAnomalyDeg;
    this.validate();
  }

  private validate(): void {
    if (this.semiMajorAxisKm <= EARTH_RADIUS_KM) {
      throw new ValidationError(
        "semiMajorAxisKm",
        `Must be greater than Earth radius (${EARTH_RADIUS_KM} km)`
      );
    }
    if (this.eccentricity < 0 || this.eccentricity >= 1) {
      throw new ValidationError(
        "eccentricity",
        "Must be between 0 (inclusive) and 1 (exclusive)"
      );
    }
    if (this.inclinationDeg < 0 || this.inclinationDeg > 180) {
      throw new ValidationError(
        "inclinationDeg",
        "Must be between 0 and 180 degrees"
      );
    }
  }

  /** Apogee altitude above Earth surface in kilometers. */
  get apogeeKm(): number {
    return this.semiMajorAxisKm * (1 + this.eccentricity) - EARTH_RADIUS_KM;
  }

  /** Perigee altitude above Earth surface in kilometers. */
  get perigeeKm(): number {
    return this.semiMajorAxisKm * (1 - this.eccentricity) - EARTH_RADIUS_KM;
  }

  /** Orbital period in seconds. */
  get orbitalPeriodSeconds(): number {
    return 2 * Math.PI * Math.sqrt(this.semiMajorAxisKm ** 3 / EARTH_MU);
  }

  /** Orbital period in minutes. */
  get orbitalPeriodMinutes(): number {
    return this.orbitalPeriodSeconds / 60;
  }

  /** Mean motion in revolutions per day. */
  get meanMotion(): number {
    return 86400 / this.orbitalPeriodSeconds;
  }

  toDict(): OrbitData {
    return {
      semi_major_axis_km: this.semiMajorAxisKm,
      eccentricity: this.eccentricity,
      inclination_deg: this.inclinationDeg,
      raan_deg: this.raanDeg,
      arg_periapsis_deg: this.argPeriapsisDeg,
      true_anomaly_deg: this.trueAnomalyDeg,
    };
  }

  static fromDict(data: OrbitData): Orbit {
    return new Orbit(
      data.semi_major_axis_km,
      data.eccentricity,
      data.inclination_deg,
      data.raan_deg,
      data.arg_periapsis_deg,
      data.true_anomaly_deg
    );
  }
}

/**
 * Time range for queries.
 */
export interface TimeRangeData {
  start: string;
  end: string;
}

export class TimeRange {
  public readonly start: Date;
  public readonly end: Date;

  /**
   * Create a TimeRange.
   *
   * @param start - Start time
   * @param end - End time
   *
   * @example
   * const tr = TimeRange.nextHours(24);
   * console.log(`Duration: ${tr.durationHours} hours`);
   */
  constructor(start: Date, end: Date) {
    this.start = start;
    this.end = end;
    this.validate();
  }

  private validate(): void {
    if (this.end <= this.start) {
      throw new ValidationError("end", "End time must be after start time");
    }
  }

  /** Duration in seconds. */
  get durationSeconds(): number {
    return (this.end.getTime() - this.start.getTime()) / 1000;
  }

  /** Duration in hours. */
  get durationHours(): number {
    return this.durationSeconds / 3600;
  }

  toDict(): TimeRangeData {
    return {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
    };
  }

  static fromDict(data: TimeRangeData): TimeRange {
    return new TimeRange(new Date(data.start), new Date(data.end));
  }

  /**
   * Create a time range starting now for the specified hours.
   */
  static nextHours(hours: number): TimeRange {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 3600 * 1000);
    return new TimeRange(now, end);
  }
}

/**
 * Satellite information.
 */
export interface SatelliteData {
  id: string;
  norad_id: number;
  name: string;
  operator?: string;
  constellation?: string;
  orbit?: OrbitData;
  position?: PositionData;
}

export class Satellite {
  public readonly id: string;
  public readonly noradId: number;
  public readonly name: string;
  public readonly operator?: string;
  public readonly constellation?: string;
  public readonly orbit?: Orbit;
  public readonly position?: Position;

  constructor(
    id: string,
    noradId: number,
    name: string,
    operator?: string,
    constellation?: string,
    orbit?: Orbit,
    position?: Position
  ) {
    this.id = id;
    this.noradId = noradId;
    this.name = name;
    this.operator = operator;
    this.constellation = constellation;
    this.orbit = orbit;
    this.position = position;
  }

  toDict(): SatelliteData {
    const result: SatelliteData = {
      id: this.id,
      norad_id: this.noradId,
      name: this.name,
    };
    if (this.operator) result.operator = this.operator;
    if (this.constellation) result.constellation = this.constellation;
    if (this.orbit) result.orbit = this.orbit.toDict();
    if (this.position) result.position = this.position.toDict();
    return result;
  }

  static fromDict(data: SatelliteData): Satellite {
    return new Satellite(
      data.id,
      data.norad_id,
      data.name,
      data.operator,
      data.constellation,
      data.orbit ? Orbit.fromDict(data.orbit) : undefined,
      data.position ? Position.fromDict(data.position) : undefined
    );
  }
}

/**
 * Paginated response for list endpoints.
 *
 * Supports iteration and manual pagination.
 *
 * @example
 * // Manual pagination
 * let page = await client.listSatellites({ constellation: "starlink", limit: 100 });
 * for (const sat of page.items) {
 *   console.log(sat.name);
 * }
 * if (page.hasMore) {
 *   page = await page.nextPage();
 * }
 *
 * @example
 * // Async iteration (auto-pagination)
 * for await (const sat of client.listSatellites({ constellation: "starlink" })) {
 *   console.log(sat.name);
 * }
 */
export class PaginatedResponse<T> {
  public readonly items: T[];
  public readonly hasMore: boolean;
  public readonly total: number | undefined;
  public readonly limit: number;
  public readonly offset: number;
  private readonly _fetchNext?: () => Promise<PaginatedResponse<T>>;

  constructor(
    items: T[],
    hasMore: boolean,
    total: number | undefined,
    limit: number,
    offset: number,
    fetchNext?: () => Promise<PaginatedResponse<T>>
  ) {
    this.items = items;
    this.hasMore = hasMore;
    this.total = total;
    this.limit = limit;
    this.offset = offset;
    this._fetchNext = fetchNext;
  }

  /** Number of items in current page. */
  get length(): number {
    return this.items.length;
  }

  /**
   * Fetch the next page of results.
   *
   * @returns Promise resolving to the next page
   * @throws Error if no more pages available
   */
  async nextPage(): Promise<PaginatedResponse<T>> {
    if (!this.hasMore) {
      throw new Error("No more pages available");
    }
    if (!this._fetchNext) {
      throw new Error("No fetch function available for pagination");
    }
    return this._fetchNext();
  }

  /**
   * Async iterator for auto-pagination.
   *
   * Automatically fetches next pages when current page is exhausted.
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    let page: PaginatedResponse<T> | null = this;
    while (page !== null) {
      for (const item of page.items) {
        yield item;
      }
      if (page.hasMore && page._fetchNext) {
        page = await page._fetchNext();
      } else {
        page = null;
      }
    }
  }

  toString(): string {
    return `PaginatedResponse(items=${this.items.length}, hasMore=${this.hasMore}, total=${this.total})`;
  }
}
