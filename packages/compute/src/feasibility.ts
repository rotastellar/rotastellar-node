/**
 * RotaStellar Compute - Feasibility Analysis
 *
 * Analyze workload suitability for orbital compute environments.
 *
 * subhadipmitra@: Not all workloads belong in space. Good candidates:
 * - Batch processing (tolerant of intermittent connectivity)
 * - Large-scale ML training (compute-bound, can checkpoint)
 * - Rendering farms (embarrassingly parallel)
 * - Scientific simulation (high compute:data ratio)
 *
 * Poor candidates:
 * - Real-time trading (latency-critical)
 * - Interactive apps (user-facing latency)
 * - Database OLTP (requires persistent connections)
 */

// TODO(subhadipmitra): Add cost estimation to feasibility report
// TODO: Factor in constellation coverage for latency-sensitive workloads

import { RotaStellarClient, ClientOptions } from "@rotastellar/sdk";

/**
 * Types of compute workloads.
 */
export enum WorkloadType {
  INFERENCE = "inference",
  TRAINING = "training",
  BATCH = "batch",
  STREAMING = "streaming",
  RENDER = "render",
  SIMULATION = "simulation",
  ANALYTICS = "analytics",
}

/**
 * Feasibility assessment rating.
 */
export enum FeasibilityRating {
  EXCELLENT = "excellent",
  GOOD = "good",
  MODERATE = "moderate",
  POOR = "poor",
  UNSUITABLE = "unsuitable",
}

/**
 * Profile of a compute workload for feasibility analysis.
 */
export interface WorkloadProfile {
  /** Type of workload */
  workloadType: WorkloadType;
  /** Required compute in TFLOPS */
  computeTflops: number;
  /** Required memory in GB */
  memoryGb?: number;
  /** Required storage in GB */
  storageGb?: number;
  /** Data to transfer per day in GB */
  dataTransferGb?: number;
  /** Maximum acceptable latency in ms */
  latencyRequirementMs?: number;
  /** For batch workloads, typical job duration in hours */
  batchDurationHours?: number;
  /** Required uptime percentage (0-100) */
  availabilityRequirement?: number;
}

/**
 * Result of feasibility analysis.
 */
export interface FeasibilityResult {
  /** Whether the workload is feasible for orbital compute */
  feasible: boolean;
  /** Overall feasibility rating */
  rating: FeasibilityRating;
  /** Numeric score (0-100) */
  score: number;
  /** Whether compute requirements can be met */
  computeFeasible: boolean;
  /** Whether thermal constraints can be satisfied */
  thermalFeasible: boolean;
  /** Whether power requirements can be met */
  powerFeasible: boolean;
  /** Whether latency requirements can be met */
  latencyFeasible: boolean;
  /** Whether data transfer requirements can be met */
  dataTransferFeasible: boolean;
  /** List of recommendations */
  recommendations: string[];
  /** Key constraints identified */
  constraints: Record<string, number>;
  /** Cost factor relative to terrestrial (1.0 = same) */
  estimatedCostFactor: number;
}

interface WorkloadCharacteristics {
  thermalFactor: number;
  powerFactor: number;
  latencySensitive: boolean;
  batchFriendly: boolean;
}

const WORKLOAD_CHARACTERISTICS: Record<WorkloadType, WorkloadCharacteristics> = {
  [WorkloadType.INFERENCE]: {
    thermalFactor: 0.7,
    powerFactor: 0.6,
    latencySensitive: true,
    batchFriendly: true,
  },
  [WorkloadType.TRAINING]: {
    thermalFactor: 1.0,
    powerFactor: 1.0,
    latencySensitive: false,
    batchFriendly: true,
  },
  [WorkloadType.BATCH]: {
    thermalFactor: 0.8,
    powerFactor: 0.7,
    latencySensitive: false,
    batchFriendly: true,
  },
  [WorkloadType.STREAMING]: {
    thermalFactor: 0.5,
    powerFactor: 0.5,
    latencySensitive: true,
    batchFriendly: false,
  },
  [WorkloadType.RENDER]: {
    thermalFactor: 1.0,
    powerFactor: 0.9,
    latencySensitive: false,
    batchFriendly: true,
  },
  [WorkloadType.SIMULATION]: {
    thermalFactor: 0.9,
    powerFactor: 0.8,
    latencySensitive: false,
    batchFriendly: true,
  },
  [WorkloadType.ANALYTICS]: {
    thermalFactor: 0.6,
    powerFactor: 0.5,
    latencySensitive: false,
    batchFriendly: true,
  },
};

/**
 * Analyze workload feasibility for orbital compute.
 *
 * @example
 * import { FeasibilityCalculator, WorkloadType } from "@rotastellar/compute";
 *
 * const calculator = new FeasibilityCalculator({ apiKey: "rs_live_xxx" });
 * const result = calculator.analyze({
 *   workloadType: WorkloadType.INFERENCE,
 *   computeTflops: 10,
 *   memoryGb: 32,
 *   latencyRequirementMs: 100
 * });
 * console.log(`Feasible: ${result.feasible}, Rating: ${result.rating}`);
 */
export class FeasibilityCalculator {
  private _client: RotaStellarClient;
  private _orbitAltitudeKm: number;

  // Orbital constraints
  private static readonly MAX_COMPUTE_TFLOPS = 100;
  private static readonly MAX_MEMORY_GB = 256;
  private static readonly MAX_POWER_WATTS = 2000;
  private static readonly MAX_DATA_TRANSFER_GB_DAY = 1000;

  constructor(options?: ClientOptions, orbitAltitudeKm: number = 550) {
    this._client = new RotaStellarClient(options);
    this._orbitAltitudeKm = orbitAltitudeKm;
  }

  get client(): RotaStellarClient {
    return this._client;
  }

  /**
   * Analyze workload feasibility.
   */
  analyze(profile: WorkloadProfile, orbitAltitudeKm?: number): FeasibilityResult {
    const altitude = orbitAltitudeKm ?? this._orbitAltitudeKm;
    const characteristics = WORKLOAD_CHARACTERISTICS[profile.workloadType];

    const memoryGb = profile.memoryGb ?? 16;
    const dataTransferGb = profile.dataTransferGb ?? 10;

    // Check individual constraints
    const [computeOk, computeScore] = this.checkCompute(profile.computeTflops, memoryGb);
    const [thermalOk, thermalScore] = this.checkThermal(profile.computeTflops, characteristics);
    const [powerOk, powerScore] = this.checkPower(profile.computeTflops, characteristics);
    const [latencyOk, latencyScore] = this.checkLatency(
      profile.latencyRequirementMs,
      altitude,
      characteristics
    );
    const [dataOk, dataScore] = this.checkDataTransfer(dataTransferGb);

    // Calculate overall score
    const scores = [computeScore, thermalScore, powerScore, latencyScore, dataScore];
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Determine feasibility
    const feasible = computeOk && thermalOk && powerOk && latencyOk && dataOk;

    // Determine rating
    let rating: FeasibilityRating;
    if (overallScore >= 85) rating = FeasibilityRating.EXCELLENT;
    else if (overallScore >= 70) rating = FeasibilityRating.GOOD;
    else if (overallScore >= 50) rating = FeasibilityRating.MODERATE;
    else if (overallScore >= 30) rating = FeasibilityRating.POOR;
    else rating = FeasibilityRating.UNSUITABLE;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      profile,
      computeOk,
      thermalOk,
      powerOk,
      latencyOk,
      dataOk
    );

    // Estimate cost factor
    const costFactor = this.estimateCostFactor(profile, characteristics);

    return {
      feasible,
      rating,
      score: Math.round(overallScore * 100) / 100,
      computeFeasible: computeOk,
      thermalFeasible: thermalOk,
      powerFeasible: powerOk,
      latencyFeasible: latencyOk,
      dataTransferFeasible: dataOk,
      recommendations,
      constraints: {
        computeScore,
        thermalScore,
        powerScore,
        latencyScore,
        dataTransferScore: dataScore,
        orbitAltitudeKm: altitude,
      },
      estimatedCostFactor: costFactor,
    };
  }

  private checkCompute(computeTflops: number, memoryGb: number): [boolean, number] {
    if (computeTflops > FeasibilityCalculator.MAX_COMPUTE_TFLOPS) return [false, 20];
    if (memoryGb > FeasibilityCalculator.MAX_MEMORY_GB) return [false, 30];

    const computeUtil = computeTflops / FeasibilityCalculator.MAX_COMPUTE_TFLOPS;
    const memoryUtil = memoryGb / FeasibilityCalculator.MAX_MEMORY_GB;

    if (computeUtil <= 0.5 && memoryUtil <= 0.5) return [true, 100];
    if (computeUtil <= 0.8 && memoryUtil <= 0.8) return [true, 80];
    return [true, 60];
  }

  private checkThermal(
    computeTflops: number,
    characteristics: WorkloadCharacteristics
  ): [boolean, number] {
    const thermalLoad = computeTflops * characteristics.thermalFactor;
    const maxThermalLoad = 70;

    if (thermalLoad > maxThermalLoad) return [false, 20];
    const score = 100 * (1 - thermalLoad / maxThermalLoad);
    return [true, Math.max(score, 40)];
  }

  private checkPower(
    computeTflops: number,
    characteristics: WorkloadCharacteristics
  ): [boolean, number] {
    const estimatedPower = computeTflops * 20 * characteristics.powerFactor;

    if (estimatedPower > FeasibilityCalculator.MAX_POWER_WATTS) return [false, 20];
    const score = 100 * (1 - estimatedPower / FeasibilityCalculator.MAX_POWER_WATTS);
    return [true, Math.max(score, 40)];
  }

  private checkLatency(
    latencyRequirementMs: number | undefined,
    altitudeKm: number,
    characteristics: WorkloadCharacteristics
  ): [boolean, number] {
    if (latencyRequirementMs === undefined) return [true, 100];

    const speedOfLightKmS = 299792.458;
    const minLatency = (2 * altitudeKm / speedOfLightKmS) * 1000 + 5;

    if (!characteristics.latencySensitive) return [true, 90];
    if (latencyRequirementMs < minLatency) return [false, 10];

    const margin = latencyRequirementMs - minLatency;
    if (margin > 50) return [true, 100];
    if (margin > 20) return [true, 80];
    return [true, 60];
  }

  private checkDataTransfer(dataTransferGb: number): [boolean, number] {
    if (dataTransferGb > FeasibilityCalculator.MAX_DATA_TRANSFER_GB_DAY) return [false, 20];

    const util = dataTransferGb / FeasibilityCalculator.MAX_DATA_TRANSFER_GB_DAY;
    if (util <= 0.3) return [true, 100];
    if (util <= 0.6) return [true, 80];
    return [true, 60];
  }

  private generateRecommendations(
    profile: WorkloadProfile,
    computeOk: boolean,
    thermalOk: boolean,
    powerOk: boolean,
    latencyOk: boolean,
    dataOk: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!computeOk) {
      recommendations.push("Consider partitioning workload across multiple orbital nodes");
    }
    if (!thermalOk) {
      recommendations.push("Implement duty cycling to manage thermal constraints");
    }
    if (!powerOk) {
      recommendations.push("Schedule compute-intensive tasks during solar exposure windows");
    }
    if (!latencyOk) {
      recommendations.push("Consider edge caching or predictive pre-computation");
    }
    if (!dataOk) {
      recommendations.push("Implement data compression or delta-sync strategies");
    }

    if (
      profile.workloadType === WorkloadType.BATCH ||
      profile.workloadType === WorkloadType.TRAINING
    ) {
      recommendations.push("Batch workloads are well-suited for orbital compute");
    }

    return recommendations;
  }

  private estimateCostFactor(
    profile: WorkloadProfile,
    characteristics: WorkloadCharacteristics
  ): number {
    let baseFactor = 2.5;

    if (characteristics.batchFriendly) baseFactor *= 0.8;
    if (profile.computeTflops > 50) baseFactor *= 1.2;
    if ((profile.dataTransferGb ?? 10) > 500) baseFactor *= 1.3;

    return Math.round(baseFactor * 100) / 100;
  }

  /**
   * Compare feasibility across different orbit scenarios.
   */
  compareScenarios(
    profile: WorkloadProfile,
    altitudes: number[]
  ): Array<{
    altitudeKm: number;
    feasible: boolean;
    rating: string;
    score: number;
  }> {
    return altitudes.map((altitude) => {
      const result = this.analyze(profile, altitude);
      return {
        altitudeKm: altitude,
        feasible: result.feasible,
        rating: result.rating,
        score: result.score,
      };
    });
  }
}
