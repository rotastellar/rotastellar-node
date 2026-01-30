/**
 * RotaStellar Distributed - Core Types
 *
 * Core types for Earth-space distributed compute coordination.
 */

/**
 * Type of compute node in the Earth-space infrastructure.
 */
export enum NodeType {
  GROUND = "ground",
  ORBITAL = "orbital",
}

/**
 * Configuration for a compute node.
 */
export interface NodeConfig {
  nodeId: string;
  nodeType: NodeType;
  computeTflops: number;
  memoryGb: number;
  bandwidthMbps: number;
  orbitAltitudeKm?: number;
  location?: { lat: number; lon: number };
}

/**
 * Create an orbital node configuration.
 */
export function createOrbitalNode(
  nodeId: string,
  altitudeKm: number = 550,
  computeTflops: number = 10
): NodeConfig {
  return {
    nodeId,
    nodeType: NodeType.ORBITAL,
    computeTflops,
    memoryGb: 32,
    bandwidthMbps: 100,
    orbitAltitudeKm: altitudeKm,
  };
}

/**
 * Create a ground node configuration.
 */
export function createGroundNode(
  nodeId: string,
  lat: number,
  lon: number,
  computeTflops: number = 100
): NodeConfig {
  return {
    nodeId,
    nodeType: NodeType.GROUND,
    computeTflops,
    memoryGb: 256,
    bandwidthMbps: 1000,
    location: { lat, lon },
  };
}

/**
 * Topology of Earth-space compute infrastructure.
 */
export class Topology {
  private nodes: Map<string, NodeConfig> = new Map();
  private connections: Array<{ node1: string; node2: string; bandwidthMbps: number }> = [];

  addNode(node: NodeConfig): void {
    this.nodes.set(node.nodeId, node);
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.connections = this.connections.filter(
      (c) => c.node1 !== nodeId && c.node2 !== nodeId
    );
  }

  addConnection(node1Id: string, node2Id: string, bandwidthMbps: number): void {
    if (!this.nodes.has(node1Id) || !this.nodes.has(node2Id)) {
      throw new Error("Both nodes must exist in topology");
    }
    this.connections.push({ node1: node1Id, node2: node2Id, bandwidthMbps });
  }

  getNode(nodeId: string): NodeConfig | undefined {
    return this.nodes.get(nodeId);
  }

  getGroundNodes(): NodeConfig[] {
    return Array.from(this.nodes.values()).filter((n) => n.nodeType === NodeType.GROUND);
  }

  getOrbitalNodes(): NodeConfig[] {
    return Array.from(this.nodes.values()).filter((n) => n.nodeType === NodeType.ORBITAL);
  }

  get totalComputeTflops(): number {
    return Array.from(this.nodes.values()).reduce((sum, n) => sum + n.computeTflops, 0);
  }

  get groundComputeTflops(): number {
    return this.getGroundNodes().reduce((sum, n) => sum + n.computeTflops, 0);
  }

  get orbitalComputeTflops(): number {
    return this.getOrbitalNodes().reduce((sum, n) => sum + n.computeTflops, 0);
  }

  get nodeCount(): number {
    return this.nodes.size;
  }
}

/**
 * Metrics for distributed training across Earth-space infrastructure.
 */
export class TrainingMetrics {
  totalSteps: number = 0;
  totalSamples: number = 0;
  totalEpochs: number = 0;

  bytesUploaded: number = 0;
  bytesDownloaded: number = 0;
  syncCount: number = 0;

  computeTimeS: number = 0;
  communicationTimeS: number = 0;
  idleTimeS: number = 0;

  lossHistory: number[] = [];
  compressionRatio: number = 1.0;
  sparsityAchieved: number = 0.0;

  private startTime: number | null = null;

  startStep(): void {
    this.startTime = Date.now();
  }

  endStep(loss?: number, samples: number = 0): void {
    if (this.startTime !== null) {
      this.computeTimeS += (Date.now() - this.startTime) / 1000;
    }
    this.totalSteps++;
    this.totalSamples += samples;
    if (loss !== undefined) {
      this.lossHistory.push(loss);
    }
    this.startTime = null;
  }

  recordSync(bytesUp: number, bytesDown: number, durationS: number): void {
    this.bytesUploaded += bytesUp;
    this.bytesDownloaded += bytesDown;
    this.communicationTimeS += durationS;
    this.syncCount++;
  }

  get totalBytesTransferred(): number {
    return this.bytesUploaded + this.bytesDownloaded;
  }

  get computeEfficiency(): number {
    const total = this.computeTimeS + this.communicationTimeS + this.idleTimeS;
    if (total === 0) return 0;
    return this.computeTimeS / total;
  }

  get communicationOverhead(): number {
    if (this.computeTimeS === 0) return Infinity;
    return this.communicationTimeS / this.computeTimeS;
  }

  get averageLoss(): number | null {
    if (this.lossHistory.length === 0) return null;
    return this.lossHistory.reduce((a, b) => a + b, 0) / this.lossHistory.length;
  }

  get latestLoss(): number | null {
    return this.lossHistory.length > 0 ? this.lossHistory[this.lossHistory.length - 1] : null;
  }

  summary(): Record<string, unknown> {
    return {
      totalSteps: this.totalSteps,
      totalSamples: this.totalSamples,
      computeTimeS: Math.round(this.computeTimeS * 100) / 100,
      communicationTimeS: Math.round(this.communicationTimeS * 100) / 100,
      computeEfficiency: Math.round(this.computeEfficiency * 10000) / 10000,
      totalBytesTransferred: this.totalBytesTransferred,
      syncCount: this.syncCount,
      compressionRatio: Math.round(this.compressionRatio * 10000) / 10000,
      latestLoss: this.latestLoss,
    };
  }
}
