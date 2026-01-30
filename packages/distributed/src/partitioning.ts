/**
 * RotaStellar Distributed - Model Partitioning
 *
 * Optimal model partitioning across Earth and orbital compute nodes.
 *
 * subhadipmitra@: TypeScript port of the partitioning logic. The algorithm is identical
 * to Python/Rust - we find the optimal "cut point" that minimizes total latency by
 * simulating all possible split positions.
 *
 * Key insight: minimize data crossing the Earth-space boundary.
 * - Embeddings → Ground (large vocab = large activations)
 * - Attention → Orbital (compute-heavy, small activations)
 * - Output projection → Ground (large vocab again)
 *
 * For a 12-layer transformer, brute force over 13 cut points is fast enough.
 */

// TODO(subhadipmitra): Add visualization of the partition plan
// TODO: Integrate with TensorFlow.js model inspection

/**
 * Type of neural network layer.
 */
export enum LayerType {
  LINEAR = "linear",
  CONV2D = "conv2d",
  ATTENTION = "attention",
  EMBEDDING = "embedding",
  NORMALIZATION = "normalization",
  ACTIVATION = "activation",
  POOLING = "pooling",
  OTHER = "other",
}

/**
 * Where to place a layer for computation.
 */
export enum PlacementLocation {
  GROUND = "ground",
  ORBITAL = "orbital",
  SPLIT = "split",
}

/**
 * Objective for partition optimization.
 */
export enum OptimizationObjective {
  MINIMIZE_LATENCY = "minimize_latency",
  MINIMIZE_BANDWIDTH = "minimize_bandwidth",
  BALANCE = "balance",
  MAXIMIZE_THROUGHPUT = "maximize_throughput",
}

/**
 * Profile of a single layer's compute characteristics.
 */
export interface LayerProfile {
  name: string;
  layerType: LayerType;
  params: number;
  flops: number;
  inputSize: number;
  outputSize: number;
  activationMemory?: number;
}

/**
 * Profile of a model's layers and compute requirements.
 */
export class ModelProfile {
  readonly layers: LayerProfile[];
  readonly name: string;

  constructor(layers: LayerProfile[], name: string = "model") {
    this.layers = layers;
    this.name = name;
  }

  static createTransformer(options: {
    numLayers?: number;
    hiddenSize?: number;
    vocabSize?: number;
    seqLength?: number;
    name?: string;
  } = {}): ModelProfile {
    const numLayers = options.numLayers ?? 12;
    const hiddenSize = options.hiddenSize ?? 768;
    const vocabSize = options.vocabSize ?? 50000;
    const seqLength = options.seqLength ?? 512;
    const name = options.name ?? "transformer";

    const layers: LayerProfile[] = [];

    // Embedding layer
    const embedParams = vocabSize * hiddenSize;
    const embedFlops = seqLength * hiddenSize;
    layers.push({
      name: "embedding",
      layerType: LayerType.EMBEDDING,
      params: embedParams,
      flops: embedFlops,
      inputSize: seqLength * 4,
      outputSize: seqLength * hiddenSize * 4,
    });

    // Transformer layers
    for (let i = 0; i < numLayers; i++) {
      const attnParams = 4 * hiddenSize * hiddenSize;
      const attnFlops =
        2 * seqLength * seqLength * hiddenSize +
        4 * seqLength * hiddenSize * hiddenSize;
      layers.push({
        name: `layer_${i}_attention`,
        layerType: LayerType.ATTENTION,
        params: attnParams,
        flops: attnFlops,
        inputSize: seqLength * hiddenSize * 4,
        outputSize: seqLength * hiddenSize * 4,
      });

      const ffnParams = 2 * hiddenSize * (4 * hiddenSize);
      const ffnFlops = 2 * seqLength * hiddenSize * (4 * hiddenSize);
      layers.push({
        name: `layer_${i}_ffn`,
        layerType: LayerType.LINEAR,
        params: ffnParams,
        flops: ffnFlops,
        inputSize: seqLength * hiddenSize * 4,
        outputSize: seqLength * hiddenSize * 4,
      });
    }

    // Output layer
    const outputParams = hiddenSize * vocabSize;
    const outputFlops = seqLength * hiddenSize * vocabSize;
    layers.push({
      name: "output",
      layerType: LayerType.LINEAR,
      params: outputParams,
      flops: outputFlops,
      inputSize: seqLength * hiddenSize * 4,
      outputSize: seqLength * vocabSize * 4,
    });

    return new ModelProfile(layers, name);
  }

  get totalParams(): number {
    return this.layers.reduce((sum, l) => sum + l.params, 0);
  }

  get totalFlops(): number {
    return this.layers.reduce((sum, l) => sum + l.flops, 0);
  }

  get numLayers(): number {
    return this.layers.length;
  }

  summary(): Record<string, unknown> {
    return {
      name: this.name,
      numLayers: this.numLayers,
      totalParams: this.totalParams,
      totalParamsMillions: Math.round((this.totalParams / 1e6) * 100) / 100,
      totalFlops: this.totalFlops,
      totalGflops: Math.round((this.totalFlops / 1e9) * 100) / 100,
    };
  }
}

/**
 * Placement decision for a single layer.
 */
export interface LayerPlacement {
  layerName: string;
  location: PlacementLocation;
  nodeId?: string;
  estimatedLatencyMs: number;
  dataTransferBytes: number;
}

/**
 * Complete partitioning plan for a model.
 */
export interface PartitionPlan {
  modelName: string;
  placements: LayerPlacement[];
  totalLatencyMs: number;
  groundOrbitalTransfers: number;
  totalTransferBytes: number;
  objective: OptimizationObjective;
}

/**
 * Get ground and orbital layers from a partition plan.
 */
export function getGroundLayers(plan: PartitionPlan): LayerPlacement[] {
  return plan.placements.filter((p) => p.location === PlacementLocation.GROUND);
}

export function getOrbitalLayers(plan: PartitionPlan): LayerPlacement[] {
  return plan.placements.filter((p) => p.location === PlacementLocation.ORBITAL);
}

export function partitionPlanSummary(plan: PartitionPlan): Record<string, unknown> {
  return {
    modelName: plan.modelName,
    totalLayers: plan.placements.length,
    groundLayers: getGroundLayers(plan).length,
    orbitalLayers: getOrbitalLayers(plan).length,
    totalLatencyMs: Math.round(plan.totalLatencyMs * 100) / 100,
    groundOrbitalTransfers: plan.groundOrbitalTransfers,
    totalTransferMb: Math.round((plan.totalTransferBytes / 1e6) * 100) / 100,
    objective: plan.objective,
  };
}

/**
 * Estimate latency for ground-orbital communication.
 */
export class LatencyEstimator {
  private static readonly SPEED_OF_LIGHT_KM_S = 299792.458;

  readonly orbitAltitudeKm: number;
  readonly uplinkBandwidthMbps: number;
  readonly downlinkBandwidthMbps: number;
  readonly processingOverheadMs: number;

  constructor(options: {
    orbitAltitudeKm?: number;
    uplinkBandwidthMbps?: number;
    downlinkBandwidthMbps?: number;
    processingOverheadMs?: number;
  } = {}) {
    this.orbitAltitudeKm = options.orbitAltitudeKm ?? 550;
    this.uplinkBandwidthMbps = options.uplinkBandwidthMbps ?? 100;
    this.downlinkBandwidthMbps = options.downlinkBandwidthMbps ?? 200;
    this.processingOverheadMs = options.processingOverheadMs ?? 5;
  }

  get propagationDelayMs(): number {
    return (this.orbitAltitudeKm / LatencyEstimator.SPEED_OF_LIGHT_KM_S) * 1000;
  }

  estimateTransferTimeMs(bytesSize: number, isUplink: boolean = true): number {
    const bandwidth = isUplink ? this.uplinkBandwidthMbps : this.downlinkBandwidthMbps;
    const bits = bytesSize * 8;
    const transferTimeS = bits / (bandwidth * 1e6);
    return transferTimeS * 1000;
  }

  estimateRoundTripMs(uplinkBytes: number, downlinkBytes: number): number {
    const uplinkTime = this.estimateTransferTimeMs(uplinkBytes, true);
    const downlinkTime = this.estimateTransferTimeMs(downlinkBytes, false);
    const propagation = 2 * this.propagationDelayMs;
    return uplinkTime + downlinkTime + propagation + 2 * this.processingOverheadMs;
  }
}

/**
 * Optimize model partitioning across Earth and orbital nodes.
 */
export class PartitionOptimizer {
  readonly groundComputeTflops: number;
  readonly orbitalComputeTflops: number;
  readonly latencyEstimator: LatencyEstimator;

  constructor(options: {
    groundComputeTflops?: number;
    orbitalComputeTflops?: number;
    orbitAltitudeKm?: number;
    uplinkBandwidthMbps?: number;
    downlinkBandwidthMbps?: number;
  } = {}) {
    this.groundComputeTflops = options.groundComputeTflops ?? 100;
    this.orbitalComputeTflops = options.orbitalComputeTflops ?? 10;
    this.latencyEstimator = new LatencyEstimator({
      orbitAltitudeKm: options.orbitAltitudeKm,
      uplinkBandwidthMbps: options.uplinkBandwidthMbps,
      downlinkBandwidthMbps: options.downlinkBandwidthMbps,
    });
  }

  optimize(
    model: ModelProfile,
    objective: OptimizationObjective = OptimizationObjective.BALANCE
  ): PartitionPlan {
    if (objective === OptimizationObjective.MINIMIZE_LATENCY) {
      return this.optimizeLatency(model, objective);
    } else if (objective === OptimizationObjective.MINIMIZE_BANDWIDTH) {
      return this.optimizeBandwidth(model, objective);
    } else {
      return this.optimizeBalanced(model, objective);
    }
  }

  private optimizeLatency(
    model: ModelProfile,
    objective: OptimizationObjective
  ): PartitionPlan {
    let bestPlan: PartitionPlan | null = null;
    let bestLatency = Infinity;

    for (let splitIdx = 0; splitIdx <= model.layers.length; splitIdx++) {
      const plan = this.createPlan(model, splitIdx, objective);
      if (plan.totalLatencyMs < bestLatency) {
        bestLatency = plan.totalLatencyMs;
        bestPlan = plan;
      }
    }

    return bestPlan ?? this.createPlan(model, 0, objective);
  }

  private optimizeBandwidth(
    model: ModelProfile,
    objective: OptimizationObjective
  ): PartitionPlan {
    let minTransferIdx = 0;
    let minTransferSize = Infinity;

    for (let i = 0; i < model.layers.length; i++) {
      const transferSize = model.layers[i].outputSize;
      if (transferSize < minTransferSize) {
        minTransferSize = transferSize;
        minTransferIdx = i + 1;
      }
    }

    return this.createPlan(model, minTransferIdx, objective);
  }

  private optimizeBalanced(
    model: ModelProfile,
    objective: OptimizationObjective
  ): PartitionPlan {
    const totalFlops = model.totalFlops;
    const targetGroundFlops =
      (totalFlops * this.groundComputeTflops) /
      (this.groundComputeTflops + this.orbitalComputeTflops);

    let cumulativeFlops = 0;
    let splitIdx = 0;
    for (let i = 0; i < model.layers.length; i++) {
      cumulativeFlops += model.layers[i].flops;
      if (cumulativeFlops >= targetGroundFlops) {
        splitIdx = i + 1;
        break;
      }
    }

    return this.createPlan(model, splitIdx, objective);
  }

  private createPlan(
    model: ModelProfile,
    splitIdx: number,
    objective: OptimizationObjective
  ): PartitionPlan {
    const placements: LayerPlacement[] = [];
    let totalLatencyMs = 0;
    let totalTransfer = 0;
    let numTransfers = 0;

    for (let i = 0; i < model.layers.length; i++) {
      const layer = model.layers[i];
      const location = i < splitIdx ? PlacementLocation.GROUND : PlacementLocation.ORBITAL;
      const computeTflops =
        location === PlacementLocation.GROUND
          ? this.groundComputeTflops
          : this.orbitalComputeTflops;

      let layerLatencyMs = (layer.flops / (computeTflops * 1e12)) * 1000;
      let transferBytes = 0;

      if (i === splitIdx && splitIdx > 0 && splitIdx < model.layers.length) {
        transferBytes = layer.inputSize;
        const transferLatency = this.latencyEstimator.estimateTransferTimeMs(
          transferBytes,
          true
        );
        layerLatencyMs += transferLatency + this.latencyEstimator.propagationDelayMs;
        totalTransfer += transferBytes;
        numTransfers++;
      }

      placements.push({
        layerName: layer.name,
        location,
        estimatedLatencyMs: layerLatencyMs,
        dataTransferBytes: transferBytes,
      });

      totalLatencyMs += layerLatencyMs;
    }

    return {
      modelName: model.name,
      placements,
      totalLatencyMs,
      groundOrbitalTransfers: numTransfers,
      totalTransferBytes: totalTransfer,
      objective,
    };
  }

  compareStrategies(model: ModelProfile): Record<string, PartitionPlan> {
    const result: Record<string, PartitionPlan> = {};
    for (const obj of Object.values(OptimizationObjective)) {
      result[obj] = this.optimize(model, obj);
    }
    return result;
  }
}
