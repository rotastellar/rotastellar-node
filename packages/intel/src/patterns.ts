/**
 * RotaStellar Intel - Pattern Detection
 *
 * Satellite behavior analysis, anomaly detection, and pattern recognition.
 *
 * subhadipmitra@: This is where SSA gets interesting. By analyzing TLE history:
 * - Detect maneuvers (delta-v events changing orbit)
 * - Spot anomalies (unexpected behavior, possible failures)
 * - Identify operational patterns (station-keeping schedules)
 *
 * Detection thresholds:
 * - Δa > 1km → altitude maneuver
 * - Δi > 0.1° → plane change (expensive!)
 * - Sudden decay → drag event or deorbit
 *
 * Fun fact: you can often predict commercial satellite maneuvers from their
 * operational patterns (e.g., station-keeping every 2 weeks).
 */

// TODO(subhadipmitra): Add ML-based anomaly detection
// FIXME: Detection thresholds tuned for LEO; need adjustment for GEO

import { RotaStellarClient, TimeRange, ClientOptions } from "@rotastellar/sdk";

/**
 * Types of detected patterns/anomalies.
 */
export enum PatternType {
  /** Orbital maneuver detected */
  MANEUVER = "maneuver",
  /** Altitude increase */
  ORBIT_RAISE = "orbit_raise",
  /** Altitude decrease */
  ORBIT_LOWER = "orbit_lower",
  /** Inclination change */
  PLANE_CHANGE = "plane_change",
  /** Deorbit maneuver */
  DEORBIT = "deorbit",
  /** Station-keeping burn */
  STATION_KEEPING = "station_keeping",
  /** Close approach to another object */
  PROXIMITY_OPS = "proximity_ops",
  /** Docking/berthing approach */
  RENDEZVOUS = "rendezvous",
  /** Collision avoidance maneuver */
  DEBRIS_AVOIDANCE = "debris_avoidance",
  /** Unexpected behavior */
  ANOMALY = "anomaly",
  /** Loss of attitude control */
  TUMBLING = "tumbling",
  /** Breakup event */
  FRAGMENTATION = "fragmentation",
  /** Satellite deployment */
  DEPLOYMENT = "deployment",
  /** Atmospheric reentry */
  REENTRY = "reentry",
}

/**
 * Confidence level of pattern detection.
 */
export enum ConfidenceLevel {
  /** High confidence, multiple data sources */
  CONFIRMED = "confirmed",
  /** Good confidence */
  LIKELY = "likely",
  /** Moderate confidence */
  POSSIBLE = "possible",
  /** Low confidence, needs more data */
  UNCERTAIN = "uncertain",
}

/**
 * A detected pattern or anomaly in satellite behavior.
 */
export interface DetectedPatternData {
  id: string;
  satellite_id: string;
  satellite_name?: string;
  pattern_type: string;
  detected_at: string;
  start_time: string;
  end_time?: string;
  confidence?: string;
  description?: string;
  delta_v_m_s?: number;
  altitude_change_km?: number;
  inclination_change_deg?: number;
  details?: Record<string, unknown>;
}

export class DetectedPattern {
  /** Pattern ID */
  public readonly id: string;
  /** Satellite that exhibited the pattern */
  public readonly satelliteId: string;
  /** Satellite name */
  public readonly satelliteName: string;
  /** Type of pattern detected */
  public readonly patternType: PatternType;
  /** When the pattern was detected */
  public readonly detectedAt: Date;
  /** When the pattern/event started */
  public readonly startTime: Date;
  /** When the pattern/event ended (if known) */
  public readonly endTime?: Date;
  /** Detection confidence level */
  public readonly confidence: ConfidenceLevel;
  /** Human-readable description */
  public readonly description: string;
  /** Estimated delta-v if maneuver (m/s) */
  public readonly deltaVMs?: number;
  /** Change in altitude (km) */
  public readonly altitudeChangeKm?: number;
  /** Change in inclination (degrees) */
  public readonly inclinationChangeDeg?: number;
  /** Additional pattern-specific details */
  public readonly details?: Record<string, unknown>;

  constructor(data: {
    id: string;
    satelliteId: string;
    satelliteName: string;
    patternType: PatternType;
    detectedAt: Date;
    startTime: Date;
    endTime?: Date;
    confidence: ConfidenceLevel;
    description: string;
    deltaVMs?: number;
    altitudeChangeKm?: number;
    inclinationChangeDeg?: number;
    details?: Record<string, unknown>;
  }) {
    this.id = data.id;
    this.satelliteId = data.satelliteId;
    this.satelliteName = data.satelliteName;
    this.patternType = data.patternType;
    this.detectedAt = data.detectedAt;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.confidence = data.confidence;
    this.description = data.description;
    this.deltaVMs = data.deltaVMs;
    this.altitudeChangeKm = data.altitudeChangeKm;
    this.inclinationChangeDeg = data.inclinationChangeDeg;
    this.details = data.details;
  }

  /**
   * Create DetectedPattern from API response.
   */
  static fromDict(data: DetectedPatternData): DetectedPattern {
    let patternType = PatternType.ANOMALY;
    const patternStr = data.pattern_type?.toLowerCase();
    if (patternStr && Object.values(PatternType).includes(patternStr as PatternType)) {
      patternType = patternStr as PatternType;
    }

    let confidence = ConfidenceLevel.UNCERTAIN;
    const confidenceStr = data.confidence?.toLowerCase();
    if (confidenceStr && Object.values(ConfidenceLevel).includes(confidenceStr as ConfidenceLevel)) {
      confidence = confidenceStr as ConfidenceLevel;
    }

    return new DetectedPattern({
      id: data.id,
      satelliteId: data.satellite_id,
      satelliteName: data.satellite_name ?? "Unknown",
      patternType,
      detectedAt: new Date(data.detected_at),
      startTime: new Date(data.start_time),
      endTime: data.end_time ? new Date(data.end_time) : undefined,
      confidence,
      description: data.description ?? "",
      deltaVMs: data.delta_v_m_s,
      altitudeChangeKm: data.altitude_change_km,
      inclinationChangeDeg: data.inclination_change_deg,
      details: data.details,
    });
  }

  /**
   * Convert to dictionary.
   */
  toDict(): DetectedPatternData {
    const result: DetectedPatternData = {
      id: this.id,
      satellite_id: this.satelliteId,
      satellite_name: this.satelliteName,
      pattern_type: this.patternType,
      detected_at: this.detectedAt.toISOString(),
      start_time: this.startTime.toISOString(),
      confidence: this.confidence,
      description: this.description,
    };
    if (this.endTime) {
      result.end_time = this.endTime.toISOString();
    }
    if (this.deltaVMs !== undefined) {
      result.delta_v_m_s = this.deltaVMs;
    }
    if (this.altitudeChangeKm !== undefined) {
      result.altitude_change_km = this.altitudeChangeKm;
    }
    if (this.inclinationChangeDeg !== undefined) {
      result.inclination_change_deg = this.inclinationChangeDeg;
    }
    if (this.details) {
      result.details = this.details;
    }
    return result;
  }

  /** Check if this pattern is any type of maneuver. */
  get isManeuver(): boolean {
    return [
      PatternType.MANEUVER,
      PatternType.ORBIT_RAISE,
      PatternType.ORBIT_LOWER,
      PatternType.PLANE_CHANGE,
      PatternType.DEORBIT,
      PatternType.STATION_KEEPING,
      PatternType.DEBRIS_AVOIDANCE,
    ].includes(this.patternType);
  }

  /** Check if this is an anomalous pattern. */
  get isAnomaly(): boolean {
    return [
      PatternType.ANOMALY,
      PatternType.TUMBLING,
      PatternType.FRAGMENTATION,
    ].includes(this.patternType);
  }
}

// Confidence level ordering for filtering
const CONFIDENCE_ORDER = [
  ConfidenceLevel.UNCERTAIN,
  ConfidenceLevel.POSSIBLE,
  ConfidenceLevel.LIKELY,
  ConfidenceLevel.CONFIRMED,
];

/**
 * Detect patterns and anomalies in satellite behavior.
 *
 * @example
 * import { PatternDetector } from "@rotastellar/intel";
 *
 * const detector = new PatternDetector({ apiKey: "rs_live_xxx" });
 *
 * // Get recent maneuvers for a satellite
 * const maneuvers = await detector.getManeuvers("starlink-1234");
 * for (const m of maneuvers) {
 *   console.log(`${m.patternType}: ${m.description}`);
 * }
 *
 * // Get all anomalies in the last 24 hours
 * const anomalies = await detector.getAnomalies(undefined, 24);
 */
export class PatternDetector {
  private _client: RotaStellarClient;

  /**
   * Initialize the pattern detector.
   *
   * @param options - Client configuration options
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
   * Get detected patterns with filtering.
   *
   * @param options - Filtering options
   * @returns List of detected patterns
   */
  async getPatterns(options: {
    satelliteId?: string;
    patternTypes?: PatternType[];
    timeRange?: TimeRange;
    confidenceMin?: ConfidenceLevel;
    limit?: number;
  } = {}): Promise<DetectedPattern[]> {
    // Build query parameters
    const params: Record<string, unknown> = {
      limit: options.limit ?? 100,
    };

    if (options.satelliteId) {
      params.satellite_id = options.satelliteId;
    }
    if (options.patternTypes) {
      params.pattern_types = options.patternTypes;
    }
    if (options.timeRange) {
      params.start = options.timeRange.start.toISOString();
      params.end = options.timeRange.end.toISOString();
    }

    // Call API
    const response = await this._client.http.get("/patterns", params);
    const rawPatterns = (response as { data?: unknown[] }).data ?? [];

    // Parse and filter by confidence
    const patterns = rawPatterns.map((p) =>
      DetectedPattern.fromDict(p as DetectedPatternData)
    );

    const minConfidence = options.confidenceMin ?? ConfidenceLevel.POSSIBLE;
    const minIdx = CONFIDENCE_ORDER.indexOf(minConfidence);

    return patterns.filter(
      (p) => CONFIDENCE_ORDER.indexOf(p.confidence) >= minIdx
    );
  }

  /**
   * Get detected maneuvers.
   *
   * @param satelliteId - Filter by satellite
   * @param hours - Time window in hours (default: 168 = 7 days)
   * @returns List of detected maneuvers
   */
  async getManeuvers(
    satelliteId?: string,
    hours: number = 168
  ): Promise<DetectedPattern[]> {
    const maneuverTypes = [
      PatternType.MANEUVER,
      PatternType.ORBIT_RAISE,
      PatternType.ORBIT_LOWER,
      PatternType.PLANE_CHANGE,
      PatternType.DEORBIT,
      PatternType.STATION_KEEPING,
      PatternType.DEBRIS_AVOIDANCE,
    ];

    return this.getPatterns({
      satelliteId,
      patternTypes: maneuverTypes,
      timeRange: hours > 0 ? TimeRange.nextHours(hours) : undefined,
    });
  }

  /**
   * Get detected anomalies.
   *
   * @param satelliteId - Filter by satellite
   * @param hours - Time window in hours (default: 24)
   * @returns List of detected anomalies
   */
  async getAnomalies(
    satelliteId?: string,
    hours: number = 24
  ): Promise<DetectedPattern[]> {
    const anomalyTypes = [
      PatternType.ANOMALY,
      PatternType.TUMBLING,
      PatternType.FRAGMENTATION,
    ];

    return this.getPatterns({
      satelliteId,
      patternTypes: anomalyTypes,
      timeRange: hours > 0 ? TimeRange.nextHours(hours) : undefined,
    });
  }

  /**
   * Get detected proximity operations.
   *
   * @param satelliteId - Filter by satellite
   * @param hours - Time window in hours (default: 168 = 7 days)
   * @returns List of proximity events
   */
  async getProximityEvents(
    satelliteId?: string,
    hours: number = 168
  ): Promise<DetectedPattern[]> {
    const proximityTypes = [PatternType.PROXIMITY_OPS, PatternType.RENDEZVOUS];

    return this.getPatterns({
      satelliteId,
      patternTypes: proximityTypes,
      timeRange: hours > 0 ? TimeRange.nextHours(hours) : undefined,
    });
  }

  /**
   * Analyze satellite behavior over time.
   *
   * @param satelliteId - Satellite to analyze
   * @param hours - Analysis window in hours (default: 720 = 30 days)
   * @returns Behavior analysis summary
   */
  async analyzeBehavior(
    satelliteId: string,
    hours: number = 720
  ): Promise<{
    satelliteId: string;
    analysisWindowHours: number;
    totalPatterns: number;
    patternsByType: Record<string, number>;
    maneuverCount: number;
    anomalyCount: number;
    totalDeltaVMs: number;
    averageManeuversPerWeek: number;
    hasAnomalies: boolean;
  }> {
    const timeRange = TimeRange.nextHours(hours);
    const patterns = await this.getPatterns({
      satelliteId,
      timeRange,
      limit: 500,
    });

    // Categorize patterns
    const byType: Record<string, DetectedPattern[]> = {};
    for (const p of patterns) {
      const typeName = p.patternType;
      if (!byType[typeName]) {
        byType[typeName] = [];
      }
      byType[typeName].push(p);
    }

    // Calculate statistics
    const maneuvers = patterns.filter((p) => p.isManeuver);
    const anomalies = patterns.filter((p) => p.isAnomaly);

    const totalDeltaV = maneuvers.reduce(
      (sum, p) => sum + (p.deltaVMs ?? 0),
      0
    );

    return {
      satelliteId,
      analysisWindowHours: hours,
      totalPatterns: patterns.length,
      patternsByType: Object.fromEntries(
        Object.entries(byType).map(([t, items]) => [t, items.length])
      ),
      maneuverCount: maneuvers.length,
      anomalyCount: anomalies.length,
      totalDeltaVMs: totalDeltaV,
      averageManeuversPerWeek: hours > 0 ? maneuvers.length / (hours / 168) : 0,
      hasAnomalies: anomalies.length > 0,
    };
  }
}
