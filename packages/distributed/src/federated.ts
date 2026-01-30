/**
 * RotaStellar Distributed - Federated Learning
 *
 * Federated learning components for Earth-space distributed training.
 *
 * subhadipmitra@: Ported from the Python implementation. The compression ratios
 * and algorithms are identical to ensure cross-language consistency. We tested
 * this against the Python version using shared test vectors.
 *
 * References:
 * - "Communication-Efficient Learning" (McMahan et al., 2017)
 * - "Deep Gradient Compression" (Lin et al., 2018)
 */

// TODO(subhadipmitra): Add WebWorker support for compression to avoid blocking main thread
// TODO: Integrate with TensorFlow.js for actual gradient computation

/**
 * Gradient compression method.
 */
export enum CompressionMethod {
  NONE = "none",
  TOP_K = "topk",
  TOP_K_QUANTIZED = "topk_quantized",
  RANDOM_K = "random_k",
  QUANTIZATION = "quantization",
}

/**
 * Strategy for aggregating gradients from multiple nodes.
 */
export enum AggregationStrategy {
  FEDAVG = "fedavg",
  ASYNC_FEDAVG = "async_fedavg",
  WEIGHTED_AVG = "weighted_avg",
}

/**
 * Configuration for gradient compression.
 */
export interface CompressionConfigOptions {
  method?: CompressionMethod;
  kRatio?: number;
  quantizationBits?: number;
  errorFeedback?: boolean;
  seed?: number;
}

export class CompressionConfig {
  method: CompressionMethod;
  kRatio: number;
  quantizationBits: number;
  errorFeedback: boolean;
  seed?: number;

  constructor(options: CompressionConfigOptions = {}) {
    this.method = options.method ?? CompressionMethod.TOP_K_QUANTIZED;
    this.kRatio = options.kRatio ?? 0.01;
    this.quantizationBits = options.quantizationBits ?? 8;
    this.errorFeedback = options.errorFeedback ?? true;
    this.seed = options.seed;

    if (this.kRatio <= 0 || this.kRatio > 1) {
      throw new Error("kRatio must be between 0 and 1");
    }
    if (![2, 4, 8, 16, 32].includes(this.quantizationBits)) {
      throw new Error("quantizationBits must be 2, 4, 8, 16, or 32");
    }
  }

  get theoreticalCompressionRatio(): number {
    if (this.method === CompressionMethod.NONE) return 1.0;
    if (this.method === CompressionMethod.TOP_K) {
      return this.kRatio * (1 + 32 / 32);
    }
    if (this.method === CompressionMethod.TOP_K_QUANTIZED) {
      return this.kRatio * (this.quantizationBits / 32 + 32 / 32);
    }
    if (this.method === CompressionMethod.QUANTIZATION) {
      return this.quantizationBits / 32;
    }
    return this.kRatio;
  }

  static highCompression(): CompressionConfig {
    return new CompressionConfig({
      method: CompressionMethod.TOP_K_QUANTIZED,
      kRatio: 0.001,
      quantizationBits: 4,
      errorFeedback: true,
    });
  }

  static balanced(): CompressionConfig {
    return new CompressionConfig({
      method: CompressionMethod.TOP_K_QUANTIZED,
      kRatio: 0.01,
      quantizationBits: 8,
      errorFeedback: true,
    });
  }

  static lowCompression(): CompressionConfig {
    return new CompressionConfig({
      method: CompressionMethod.QUANTIZATION,
      kRatio: 1.0,
      quantizationBits: 16,
      errorFeedback: false,
    });
  }
}

/**
 * Compressed gradient representation.
 */
export interface CompressedGradient {
  indices: number[];
  values: number[];
  shape: number[];
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  quantizationBits?: number;
}

/**
 * Compress gradients for bandwidth-efficient synchronization.
 */
export class GradientCompressor {
  private config: CompressionConfig;
  private errorAccumulator: number[] | null = null;

  constructor(config: CompressionConfig) {
    this.config = config;
  }

  compress(gradients: number[]): CompressedGradient {
    const originalSize = gradients.length;
    let workingGradients = [...gradients];

    // Apply error feedback if enabled
    if (this.config.errorFeedback && this.errorAccumulator !== null) {
      workingGradients = workingGradients.map((g, i) => g + this.errorAccumulator![i]);
    }

    if (this.config.method === CompressionMethod.NONE) {
      return {
        indices: Array.from({ length: originalSize }, (_, i) => i),
        values: workingGradients,
        shape: [originalSize],
        originalSize,
        compressedSize: originalSize * 4,
        compressionRatio: 1.0,
      };
    }

    const k = Math.max(1, Math.floor(originalSize * this.config.kRatio));
    let indices: number[];
    let values: number[];

    if (
      this.config.method === CompressionMethod.TOP_K ||
      this.config.method === CompressionMethod.TOP_K_QUANTIZED
    ) {
      // Top-K selection
      const indexed = workingGradients.map((v, i) => ({ i, abs: Math.abs(v), v }));
      indexed.sort((a, b) => b.abs - a.abs);
      const selected = indexed.slice(0, k);
      indices = selected.map((x) => x.i);
      values = selected.map((x) => x.v);
    } else {
      // Random-K selection
      const allIndices = Array.from({ length: originalSize }, (_, i) => i);
      for (let i = allIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
      }
      indices = allIndices.slice(0, k);
      values = indices.map((i) => workingGradients[i]);
    }

    // Apply quantization if needed
    if (this.config.method === CompressionMethod.TOP_K_QUANTIZED) {
      values = this.quantize(values);
    }

    // Calculate compression error for error feedback
    if (this.config.errorFeedback) {
      const reconstructed = new Array(originalSize).fill(0);
      indices.forEach((idx, i) => {
        reconstructed[idx] = values[i];
      });
      this.errorAccumulator = workingGradients.map((g, i) => g - reconstructed[i]);
    }

    const bitsPerValue =
      this.config.method === CompressionMethod.TOP_K_QUANTIZED
        ? this.config.quantizationBits
        : 32;
    const compressedBits = k * (32 + bitsPerValue);
    const compressedSize = Math.floor(compressedBits / 8);

    return {
      indices,
      values,
      shape: [originalSize],
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / (originalSize * 4),
      quantizationBits:
        this.config.method === CompressionMethod.TOP_K_QUANTIZED
          ? this.config.quantizationBits
          : undefined,
    };
  }

  decompress(compressed: CompressedGradient): number[] {
    const result = new Array(compressed.originalSize).fill(0);
    compressed.indices.forEach((idx, i) => {
      result[idx] = compressed.values[i];
    });
    return result;
  }

  private quantize(values: number[]): number[] {
    // subhadipmitra@: Linear quantization - same as Python implementation.
    // Note: JS numbers are 64-bit floats so we're simulating fixed-point here.
    if (values.length === 0) return values;

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const rangeVal = maxVal - minVal;

    if (rangeVal === 0) return values;

    const levels = 2 ** this.config.quantizationBits;
    const scale = rangeVal / (levels - 1);

    // TODO(subhadipmitra): Profile this - spread operator might be slow for large arrays
    return values.map((v) => {
      const q = Math.round((v - minVal) / scale);
      return minVal + q * scale;
    });
  }
}

/**
 * Client for federated learning on Earth or orbital nodes.
 */
export class FederatedClient {
  readonly nodeId: string;
  readonly nodeType: string;
  readonly compression: CompressionConfig;
  private compressor: GradientCompressor;
  private localSteps: number = 0;
  private syncRound: number = 0;

  constructor(
    nodeId: string,
    compression?: CompressionConfig,
    nodeType: string = "orbital"
  ) {
    this.nodeId = nodeId;
    this.nodeType = nodeType;
    this.compression = compression ?? CompressionConfig.balanced();
    this.compressor = new GradientCompressor(this.compression);
  }

  computeGradients(modelParams: number[], _localData: unknown[]): number[] {
    // Simulated gradient computation
    const gradients = modelParams.map(() => (Math.random() - 0.5) * 0.2);
    this.localSteps++;
    return gradients;
  }

  compress(gradients: number[]): CompressedGradient {
    return this.compressor.compress(gradients);
  }

  applyUpdate(modelParams: number[], update: number[]): number[] {
    return modelParams.map((p, i) => p - update[i] * 0.01);
  }

  getStats(): Record<string, unknown> {
    return {
      nodeId: this.nodeId,
      nodeType: this.nodeType,
      localSteps: this.localSteps,
      syncRounds: this.syncRound,
      compressionMethod: this.compression.method,
      compressionRatio: this.compression.theoreticalCompressionRatio,
    };
  }
}

/**
 * Central aggregator for gradient synchronization.
 */
export class GradientAggregator {
  readonly strategy: AggregationStrategy;
  readonly minParticipants: number;
  readonly modelSize?: number;
  private pendingGradients: Map<string, { gradient: CompressedGradient; samples: number }> =
    new Map();
  private round: number = 0;

  constructor(
    strategy: AggregationStrategy = AggregationStrategy.FEDAVG,
    minParticipants: number = 1,
    modelSize?: number
  ) {
    this.strategy = strategy;
    this.minParticipants = minParticipants;
    this.modelSize = modelSize;
  }

  receiveGradients(nodeId: string, gradients: CompressedGradient, samples: number = 1): void {
    this.pendingGradients.set(nodeId, { gradient: gradients, samples });
  }

  get numParticipants(): number {
    return this.pendingGradients.size;
  }

  readyToAggregate(): boolean {
    return this.numParticipants >= this.minParticipants;
  }

  aggregate(): number[] {
    if (this.pendingGradients.size === 0) {
      throw new Error("No gradients to aggregate");
    }

    const first = this.pendingGradients.values().next().value as { gradient: CompressedGradient; samples: number };
    const modelSize = this.modelSize ?? first.gradient.originalSize;

    let result: number[];
    if (this.strategy === AggregationStrategy.FEDAVG) {
      result = this.fedAvg(modelSize);
    } else if (this.strategy === AggregationStrategy.WEIGHTED_AVG) {
      result = this.fedAvg(modelSize);
    } else {
      result = this.asyncFedAvg(modelSize);
    }

    this.pendingGradients.clear();
    this.round++;
    return result;
  }

  private fedAvg(modelSize: number): number[] {
    let totalSamples = 0;
    this.pendingGradients.forEach(({ samples }) => {
      totalSamples += samples;
    });

    const aggregated = new Array(modelSize).fill(0);

    this.pendingGradients.forEach(({ gradient, samples }) => {
      const weight = samples / totalSamples;
      gradient.indices.forEach((idx, i) => {
        aggregated[idx] += gradient.values[i] * weight;
      });
    });

    return aggregated;
  }

  private asyncFedAvg(modelSize: number): number[] {
    const aggregated = new Array(modelSize).fill(0);
    const n = this.pendingGradients.size;

    this.pendingGradients.forEach(({ gradient }) => {
      gradient.indices.forEach((idx, i) => {
        aggregated[idx] += gradient.values[i] / n;
      });
    });

    return aggregated;
  }

  getStats(): Record<string, unknown> {
    return {
      strategy: this.strategy,
      round: this.round,
      pendingParticipants: this.numParticipants,
      minParticipants: this.minParticipants,
    };
  }
}
