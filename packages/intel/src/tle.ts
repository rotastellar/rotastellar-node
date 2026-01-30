/**
 * RotaStellar Intel - TLE Parsing and Propagation
 *
 * Two-Line Element set parsing and orbit propagation using SGP4/SDP4.
 *
 * subhadipmitra@: TLEs are the de facto standard for satellite orbit data,
 * published by Space-Track. Updated ~daily for most objects.
 *
 * Caveats:
 * - TLEs degrade (~1km error after a few days for LEO)
 * - They're mean elements, not osculating - direct Keplerian conversion is wrong
 * - Must use SGP4/SDP4 for propagation, not simple two-body mechanics
 *
 * For precision work (rendezvous, formation flying), use ephemeris data instead.
 */

// TODO(subhadipmitra): Add support for 3LE format (includes satellite name)
// TODO: Implement SDP4 for deep space objects (period > 225 min)

import { Position, Orbit, ValidationError, EARTH_RADIUS_KM, EARTH_MU } from "@rotastellar/sdk";

// Earth constants for TLE calculations
const MINUTES_PER_DAY = 1440.0;
const SECONDS_PER_DAY = 86400.0;

/**
 * Two-Line Element set for satellite orbit determination.
 *
 * A TLE contains orbital elements that describe a satellite's orbit at a
 * specific epoch time. These can be propagated forward or backward in time
 * using SGP4/SDP4 algorithms.
 *
 * @example
 * const tleLines = [
 *   "ISS (ZARYA)",
 *   "1 25544U 98067A   21275.52243902  .00001082  00000-0  27450-4 0  9999",
 *   "2 25544  51.6443 208.5943 0003631 355.3422 144.3824 15.48919755304818"
 * ];
 * const tle = TLE.parse(tleLines);
 * console.log(`ISS inclination: ${tle.inclination}°`);
 */
export class TLE {
  /** Satellite name (line 0) */
  public readonly name: string;
  /** NORAD catalog number */
  public readonly noradId: number;
  /** Classification (U=unclassified, C=classified, S=secret) */
  public readonly classification: string;
  /** International designator (launch year, number, piece) */
  public readonly intlDesignator: string;
  /** Epoch year (2-digit) */
  public readonly epochYear: number;
  /** Epoch day of year (fractional) */
  public readonly epochDay: number;
  /** First derivative of mean motion (rev/day^2) */
  public readonly meanMotionDot: number;
  /** Second derivative of mean motion (rev/day^3) */
  public readonly meanMotionDdot: number;
  /** BSTAR drag term */
  public readonly bstar: number;
  /** Element set type */
  public readonly elementSetType: number;
  /** Element set number */
  public readonly elementNumber: number;
  /** Inclination in degrees */
  public readonly inclination: number;
  /** Right ascension of ascending node in degrees */
  public readonly raan: number;
  /** Eccentricity (decimal point assumed) */
  public readonly eccentricity: number;
  /** Argument of perigee in degrees */
  public readonly argPerigee: number;
  /** Mean anomaly in degrees */
  public readonly meanAnomaly: number;
  /** Mean motion in revolutions per day */
  public readonly meanMotion: number;
  /** Revolution number at epoch */
  public readonly revNumber: number;

  constructor(data: {
    name: string;
    noradId: number;
    classification: string;
    intlDesignator: string;
    epochYear: number;
    epochDay: number;
    meanMotionDot: number;
    meanMotionDdot: number;
    bstar: number;
    elementSetType: number;
    elementNumber: number;
    inclination: number;
    raan: number;
    eccentricity: number;
    argPerigee: number;
    meanAnomaly: number;
    meanMotion: number;
    revNumber: number;
  }) {
    this.name = data.name;
    this.noradId = data.noradId;
    this.classification = data.classification;
    this.intlDesignator = data.intlDesignator;
    this.epochYear = data.epochYear;
    this.epochDay = data.epochDay;
    this.meanMotionDot = data.meanMotionDot;
    this.meanMotionDdot = data.meanMotionDdot;
    this.bstar = data.bstar;
    this.elementSetType = data.elementSetType;
    this.elementNumber = data.elementNumber;
    this.inclination = data.inclination;
    this.raan = data.raan;
    this.eccentricity = data.eccentricity;
    this.argPerigee = data.argPerigee;
    this.meanAnomaly = data.meanAnomaly;
    this.meanMotion = data.meanMotion;
    this.revNumber = data.revNumber;
  }

  /**
   * Parse a TLE from its text representation.
   *
   * @param lines - List of 2 or 3 strings (name optional, then line 1, line 2)
   * @returns Parsed TLE object
   * @throws ValidationError if TLE format is invalid
   */
  static parse(lines: string[]): TLE {
    let name: string;
    let line1: string;
    let line2: string;

    if (lines.length === 2) {
      name = "UNKNOWN";
      [line1, line2] = lines;
    } else if (lines.length === 3) {
      name = lines[0].trim();
      [, line1, line2] = lines;
    } else {
      throw new ValidationError("lines", "TLE must have 2 or 3 lines");
    }

    // Validate line numbers
    if (!line1.startsWith("1 ")) {
      throw new ValidationError("line1", "Line 1 must start with '1 '");
    }
    if (!line2.startsWith("2 ")) {
      throw new ValidationError("line2", "Line 2 must start with '2 '");
    }

    try {
      // Parse line 1
      const noradId = parseInt(line1.substring(2, 7), 10);
      const classification = line1.charAt(7);
      const intlDesignator = line1.substring(9, 17).trim();
      const epochYear = parseInt(line1.substring(18, 20), 10);
      const epochDay = parseFloat(line1.substring(20, 32));
      const meanMotionDot = parseFloat(line1.substring(33, 43));

      // Parse mean_motion_ddot (scientific notation without 'E')
      let meanMotionDdot = 0.0;
      const mmddotStr = line1.substring(44, 52).trim();
      if (mmddotStr) {
        meanMotionDdot = parseScientificNotation(mmddotStr);
      }

      // Parse BSTAR (scientific notation without 'E')
      let bstar = 0.0;
      const bstarStr = line1.substring(53, 61).trim();
      if (bstarStr) {
        bstar = parseScientificNotation(bstarStr);
      }

      const elementSetType = line1.charAt(62).trim() ? parseInt(line1.charAt(62), 10) : 0;
      const elementNumber = parseInt(line1.substring(64, 68), 10);

      // Parse line 2
      const inclination = parseFloat(line2.substring(8, 16));
      const raan = parseFloat(line2.substring(17, 25));
      const eccentricity = parseFloat(`0.${line2.substring(26, 33)}`);
      const argPerigee = parseFloat(line2.substring(34, 42));
      const meanAnomaly = parseFloat(line2.substring(43, 51));
      const meanMotion = parseFloat(line2.substring(52, 63));
      const revNumber = parseInt(line2.substring(63, 68), 10);

      return new TLE({
        name,
        noradId,
        classification,
        intlDesignator,
        epochYear,
        epochDay,
        meanMotionDot,
        meanMotionDdot,
        bstar,
        elementSetType,
        elementNumber,
        inclination,
        raan,
        eccentricity,
        argPerigee,
        meanAnomaly,
        meanMotion,
        revNumber,
      });
    } catch (e) {
      throw new ValidationError("tle", `Failed to parse TLE: ${e}`);
    }
  }

  /** Get the epoch as a Date object. */
  get epoch(): Date {
    // Convert 2-digit year to 4-digit
    const year = this.epochYear < 57 ? 2000 + this.epochYear : 1900 + this.epochYear;

    // Convert day of year to date
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const epochMs = jan1.getTime() + (this.epochDay - 1) * 24 * 60 * 60 * 1000;
    return new Date(epochMs);
  }

  /** Calculate semi-major axis from mean motion. */
  get semiMajorAxisKm(): number {
    // n = sqrt(mu / a^3), so a = (mu / n^2)^(1/3)
    const nRadPerSec = (this.meanMotion * 2 * Math.PI) / SECONDS_PER_DAY;
    return Math.pow(EARTH_MU / (nRadPerSec ** 2), 1 / 3);
  }

  /** Calculate orbital period in minutes. */
  get orbitalPeriodMinutes(): number {
    return MINUTES_PER_DAY / this.meanMotion;
  }

  /** Calculate apogee altitude in km. */
  get apogeeKm(): number {
    const a = this.semiMajorAxisKm;
    return a * (1 + this.eccentricity) - EARTH_RADIUS_KM;
  }

  /** Calculate perigee altitude in km. */
  get perigeeKm(): number {
    const a = this.semiMajorAxisKm;
    return a * (1 - this.eccentricity) - EARTH_RADIUS_KM;
  }

  /** Convert TLE to Orbit object. */
  toOrbit(): Orbit {
    return new Orbit(
      this.semiMajorAxisKm,
      this.eccentricity,
      this.inclination,
      this.raan,
      this.argPerigee,
      this.meanAnomaly // Approximation
    );
  }

  /**
   * Propagate the orbit to a given time.
   *
   * This is a simplified propagation. For accurate results,
   * install a proper SGP4 library.
   *
   * @param dt - Target datetime (UTC)
   * @returns Estimated position at the given time
   */
  propagate(dt: Date): Position {
    // Simplified propagation - just use mean motion
    const minutesSinceEpoch = (dt.getTime() - this.epoch.getTime()) / 60000;
    const revolutions = minutesSinceEpoch / this.orbitalPeriodMinutes;

    // Simple circular orbit approximation
    const meanAnomalyRad = (this.meanAnomaly * Math.PI) / 180;
    const newAnomaly = meanAnomalyRad + revolutions * 2 * Math.PI;

    // Convert to lat/lon (very simplified)
    const lat = (180 / Math.PI) * Math.asin(
      Math.sin((this.inclination * Math.PI) / 180) * Math.sin(newAnomaly)
    );
    let lon = (newAnomaly * 180) / Math.PI - 180;
    while (lon < -180) lon += 360;
    while (lon > 180) lon -= 360;

    const alt = (this.apogeeKm + this.perigeeKm) / 2;

    return new Position(lat, lon, alt);
  }
}

/**
 * Parse multiple TLEs from text.
 *
 * @param text - Text containing one or more TLEs
 * @returns List of parsed TLE objects
 */
export function parseTle(text: string): TLE[] {
  const lines = text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const tles: TLE[] = [];
  let i = 0;

  while (i < lines.length) {
    // Check if this is a name line or line 1
    if (lines[i].startsWith("1 ")) {
      // No name, just lines 1 and 2
      if (i + 1 < lines.length && lines[i + 1].startsWith("2 ")) {
        tles.push(TLE.parse([lines[i], lines[i + 1]]));
        i += 2;
      } else {
        i += 1;
      }
    } else if (i + 2 < lines.length && lines[i + 1].startsWith("1 ")) {
      // Name + line 1 + line 2
      tles.push(TLE.parse([lines[i], lines[i + 1], lines[i + 2]]));
      i += 3;
    } else {
      i += 1;
    }
  }

  return tles;
}

/**
 * Parse TLE scientific notation (without 'E').
 * e.g., " 12345-6" means 0.12345 * 10^-6
 */
function parseScientificNotation(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0.0;

  // Handle sign at the beginning
  let sign = 1;
  let s = trimmed;
  if (s.startsWith("-") || s.startsWith("+")) {
    sign = s.startsWith("-") ? -1 : 1;
    s = s.substring(1);
  }

  // Extract mantissa and exponent
  // Format: "NNNNN-E" or "NNNNN+E" where last char is exponent sign and digit
  const expSign = s.charAt(s.length - 2) === "-" ? -1 : 1;
  const exponent = parseInt(s.charAt(s.length - 1), 10) * expSign;
  const mantissaStr = s.substring(0, s.length - 2).replace(/[+-]/g, "");
  const mantissa = parseFloat(`0.${mantissaStr}`);

  return sign * mantissa * Math.pow(10, exponent);
}
