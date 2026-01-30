/**
 * RotaStellar Intel - Conjunction Analysis
 *
 * Space object collision probability and close approach analysis.
 *
 * subhadipmitra@: Conjunction assessment is critical for space safety.
 * We use the Pc (probability of collision) framework from NASA's CARA team.
 *
 * Risk thresholds (industry standard):
 * - 1e-4: Red - maneuver decision required
 * - 1e-5: Yellow - enhanced monitoring
 * - 1e-7: Green - routine tracking
 *
 * Miss distance alone is insufficient - a 1km miss with high covariance
 * uncertainty may be riskier than 100m with low uncertainty.
 */

// TODO(subhadipmitra): Add Monte Carlo Pc estimation
// TODO: Integrate with Space-Track CDM (Conjunction Data Messages)

import { RotaStellarClient, TimeRange, ClientOptions } from "@rotastellar/sdk";

/**
 * Conjunction risk level classification.
 */
export enum RiskLevel {
  /** Immediate action required (P > 1e-4) */
  CRITICAL = "critical",
  /** Close monitoring needed (P > 1e-5) */
  HIGH = "high",
  /** Standard monitoring (P > 1e-6) */
  MEDIUM = "medium",
  /** Routine tracking (P > 1e-7) */
  LOW = "low",
  /** No action needed (P <= 1e-7) */
  NEGLIGIBLE = "negligible",
}

/**
 * A conjunction (close approach) between two space objects.
 */
export interface ConjunctionData {
  id: string;
  primary_id: string;
  primary_name?: string;
  secondary_id: string;
  secondary_name?: string;
  tca: string;
  miss_distance_km: number;
  miss_distance_radial_km?: number;
  miss_distance_in_track_km?: number;
  miss_distance_cross_track_km?: number;
  relative_velocity_km_s?: number;
  collision_probability?: number;
  risk_level?: string;
  created_at?: string;
  updated_at?: string;
}

export class Conjunction {
  /** Unique conjunction ID */
  public readonly id: string;
  /** Primary satellite ID */
  public readonly primaryId: string;
  /** Primary satellite name */
  public readonly primaryName: string;
  /** Secondary object ID (satellite or debris) */
  public readonly secondaryId: string;
  /** Secondary object name */
  public readonly secondaryName: string;
  /** Time of Closest Approach */
  public readonly tca: Date;
  /** Predicted miss distance in km */
  public readonly missDistanceKm: number;
  /** Radial component of miss distance */
  public readonly missDistanceRadialKm?: number;
  /** In-track component of miss distance */
  public readonly missDistanceInTrackKm?: number;
  /** Cross-track component of miss distance */
  public readonly missDistanceCrossTrackKm?: number;
  /** Relative velocity at TCA in km/s */
  public readonly relativeVelocityKmS?: number;
  /** Probability of collision */
  public readonly collisionProbability?: number;
  /** Risk classification */
  public readonly riskLevel: RiskLevel;
  /** When this conjunction was identified */
  public readonly createdAt?: Date;
  /** Last update time */
  public readonly updatedAt?: Date;

  constructor(data: {
    id: string;
    primaryId: string;
    primaryName: string;
    secondaryId: string;
    secondaryName: string;
    tca: Date;
    missDistanceKm: number;
    missDistanceRadialKm?: number;
    missDistanceInTrackKm?: number;
    missDistanceCrossTrackKm?: number;
    relativeVelocityKmS?: number;
    collisionProbability?: number;
    riskLevel: RiskLevel;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.primaryId = data.primaryId;
    this.primaryName = data.primaryName;
    this.secondaryId = data.secondaryId;
    this.secondaryName = data.secondaryName;
    this.tca = data.tca;
    this.missDistanceKm = data.missDistanceKm;
    this.missDistanceRadialKm = data.missDistanceRadialKm;
    this.missDistanceInTrackKm = data.missDistanceInTrackKm;
    this.missDistanceCrossTrackKm = data.missDistanceCrossTrackKm;
    this.relativeVelocityKmS = data.relativeVelocityKmS;
    this.collisionProbability = data.collisionProbability;
    this.riskLevel = data.riskLevel;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Create Conjunction from API response dictionary.
   */
  static fromDict(data: ConjunctionData): Conjunction {
    let riskLevel = RiskLevel.LOW;
    const riskStr = data.risk_level?.toLowerCase();
    if (riskStr && Object.values(RiskLevel).includes(riskStr as RiskLevel)) {
      riskLevel = riskStr as RiskLevel;
    }

    return new Conjunction({
      id: data.id,
      primaryId: data.primary_id,
      primaryName: data.primary_name ?? "Unknown",
      secondaryId: data.secondary_id,
      secondaryName: data.secondary_name ?? "Unknown",
      tca: new Date(data.tca),
      missDistanceKm: data.miss_distance_km,
      missDistanceRadialKm: data.miss_distance_radial_km,
      missDistanceInTrackKm: data.miss_distance_in_track_km,
      missDistanceCrossTrackKm: data.miss_distance_cross_track_km,
      relativeVelocityKmS: data.relative_velocity_km_s,
      collisionProbability: data.collision_probability,
      riskLevel,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    });
  }

  /**
   * Convert to dictionary.
   */
  toDict(): ConjunctionData {
    const result: ConjunctionData = {
      id: this.id,
      primary_id: this.primaryId,
      primary_name: this.primaryName,
      secondary_id: this.secondaryId,
      secondary_name: this.secondaryName,
      tca: this.tca.toISOString(),
      miss_distance_km: this.missDistanceKm,
      risk_level: this.riskLevel,
    };
    if (this.missDistanceRadialKm !== undefined) {
      result.miss_distance_radial_km = this.missDistanceRadialKm;
    }
    if (this.missDistanceInTrackKm !== undefined) {
      result.miss_distance_in_track_km = this.missDistanceInTrackKm;
    }
    if (this.missDistanceCrossTrackKm !== undefined) {
      result.miss_distance_cross_track_km = this.missDistanceCrossTrackKm;
    }
    if (this.relativeVelocityKmS !== undefined) {
      result.relative_velocity_km_s = this.relativeVelocityKmS;
    }
    if (this.collisionProbability !== undefined) {
      result.collision_probability = this.collisionProbability;
    }
    return result;
  }

  /** Check if this conjunction is critical risk. */
  get isCritical(): boolean {
    return this.riskLevel === RiskLevel.CRITICAL;
  }

  /** Check if this conjunction is high risk or above. */
  get isHighRisk(): boolean {
    return this.riskLevel === RiskLevel.CRITICAL || this.riskLevel === RiskLevel.HIGH;
  }

  /** Get time to TCA in hours (negative if past). */
  get timeToTcaHours(): number {
    const now = new Date();
    return (this.tca.getTime() - now.getTime()) / (1000 * 3600);
  }
}

/**
 * Recommended maneuver to avoid a conjunction.
 */
export interface ManeuverRecommendation {
  /** ID of the conjunction to avoid */
  conjunctionId: string;
  /** Recommended maneuver execution time */
  maneuverTime: Date;
  /** Required delta-v in m/s */
  deltaVMs: number;
  /** Maneuver direction (radial, in-track, cross-track) */
  direction: string;
  /** Expected miss distance after maneuver */
  postManeuverMissKm: number;
  /** Expected collision probability after maneuver */
  postManeuverProbability: number;
  /** Estimated fuel required (if available) */
  fuelRequiredKg?: number;
  /** Confidence level of the recommendation */
  confidence: number;
}

/**
 * Analyze conjunctions and collision risks.
 *
 * @example
 * import { ConjunctionAnalyzer } from "@rotastellar/intel";
 *
 * const analyzer = new ConjunctionAnalyzer({ apiKey: "rs_live_xxx" });
 *
 * // Get conjunctions for a satellite
 * const conjunctions = await analyzer.getConjunctions("starlink-1234");
 * for (const c of conjunctions) {
 *   console.log(`${c.missDistanceKm.toFixed(2)} km at ${c.tca}`);
 * }
 *
 * // Get high-risk conjunctions
 * const critical = await analyzer.getHighRiskConjunctions();
 */
export class ConjunctionAnalyzer {
  private _client: RotaStellarClient;

  /**
   * Initialize the analyzer.
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
   * Get conjunctions with optional filtering.
   *
   * @param options - Filtering options
   * @returns List of Conjunction objects
   */
  async getConjunctions(options: {
    satelliteId?: string;
    thresholdKm?: number;
    timeRange?: TimeRange;
    limit?: number;
  } = {}): Promise<Conjunction[]> {
    const rawConjunctions = await this._client.listConjunctions({
      satelliteId: options.satelliteId,
      thresholdKm: options.thresholdKm ?? 1.0,
      timeRange: options.timeRange,
      limit: options.limit ?? 100,
    });

    return rawConjunctions.map((c: unknown) =>
      Conjunction.fromDict(c as ConjunctionData)
    );
  }

  /**
   * Get high-risk conjunctions requiring attention.
   *
   * @param options - Filtering options
   * @returns List of high-risk conjunctions sorted by risk
   */
  async getHighRiskConjunctions(options: {
    satelliteId?: string;
    hours?: number;
  } = {}): Promise<Conjunction[]> {
    const hours = options.hours ?? 72;
    const timeRange = TimeRange.nextHours(hours);
    const conjunctions = await this.getConjunctions({
      satelliteId: options.satelliteId,
      thresholdKm: 5.0, // Wider threshold for risk assessment
      timeRange,
      limit: 500,
    });

    // Filter to high risk and sort
    const highRisk = conjunctions.filter((c) => c.isHighRisk);
    return highRisk.sort((a, b) => {
      // Sort by: CRITICAL first, then by miss distance
      if (a.riskLevel === RiskLevel.CRITICAL && b.riskLevel !== RiskLevel.CRITICAL) {
        return -1;
      }
      if (a.riskLevel !== RiskLevel.CRITICAL && b.riskLevel === RiskLevel.CRITICAL) {
        return 1;
      }
      return a.missDistanceKm - b.missDistanceKm;
    });
  }

  /**
   * Get a specific conjunction by ID.
   *
   * @param conjunctionId - Conjunction ID
   * @returns Conjunction details
   */
  async getConjunction(_conjunctionId: string): Promise<Conjunction> {
    throw new Error("Individual conjunction lookup requires API integration");
  }

  /**
   * Get maneuver recommendation for a conjunction.
   *
   * @param conjunctionId - Conjunction to avoid
   * @param targetMissKm - Desired post-maneuver miss distance
   * @returns Maneuver recommendation
   */
  async recommendManeuver(
    _conjunctionId: string,
    _targetMissKm: number = 5.0
  ): Promise<ManeuverRecommendation> {
    throw new Error("Maneuver recommendations require API integration");
  }

  /**
   * Analyze overall conjunction risk for a satellite.
   *
   * @param satelliteId - Satellite to analyze
   * @param hours - Analysis window in hours (default: 168 = 7 days)
   * @returns Risk analysis summary
   */
  async analyzeRisk(
    satelliteId: string,
    hours: number = 168
  ): Promise<{
    satelliteId: string;
    analysisWindowHours: number;
    totalConjunctions: number;
    byRiskLevel: Record<string, number>;
    criticalCount: number;
    highRiskCount: number;
    closestApproachKm: number | null;
    closestApproachTca: string | null;
    requiresAttention: boolean;
  }> {
    const timeRange = TimeRange.nextHours(hours);
    const conjunctions = await this.getConjunctions({
      satelliteId,
      thresholdKm: 10.0,
      timeRange,
      limit: 1000,
    });

    // Categorize by risk level
    const byRisk: Record<RiskLevel, Conjunction[]> = {
      [RiskLevel.CRITICAL]: [],
      [RiskLevel.HIGH]: [],
      [RiskLevel.MEDIUM]: [],
      [RiskLevel.LOW]: [],
      [RiskLevel.NEGLIGIBLE]: [],
    };
    for (const c of conjunctions) {
      byRisk[c.riskLevel].push(c);
    }

    // Find closest approach
    const closest =
      conjunctions.length > 0
        ? conjunctions.reduce((min, c) =>
            c.missDistanceKm < min.missDistanceKm ? c : min
          )
        : null;

    return {
      satelliteId,
      analysisWindowHours: hours,
      totalConjunctions: conjunctions.length,
      byRiskLevel: Object.fromEntries(
        Object.entries(byRisk).map(([level, items]) => [level, items.length])
      ),
      criticalCount: byRisk[RiskLevel.CRITICAL].length,
      highRiskCount: byRisk[RiskLevel.HIGH].length,
      closestApproachKm: closest?.missDistanceKm ?? null,
      closestApproachTca: closest?.tca.toISOString() ?? null,
      requiresAttention:
        byRisk[RiskLevel.CRITICAL].length > 0 || byRisk[RiskLevel.HIGH].length > 0,
    };
  }
}
