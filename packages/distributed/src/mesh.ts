/**
 * RotaStellar Distributed - Space Mesh
 *
 * Inter-satellite link (ISL) routing for orbital node communication.
 *
 * subhadipmitra@: This is the TypeScript port of our mesh routing. The topology model
 * is simplified but captures the key constraints of LEO ISL networks:
 * - Limited range (~5000km for optical links)
 * - Line-of-sight requirements (Earth occlusion)
 * - Latency dominated by speed of light (not processing)
 *
 * For production, you'd want to integrate with SGP4/SDP4 for accurate positions
 * and update topology every few seconds as satellites move.
 */

// TODO(subhadipmitra): Add WebGL visualization for mesh topology
// TODO: Integrate with satellite.js for real orbital propagation

/**
 * Type of communication link.
 */
export enum LinkType {
  OPTICAL = "optical",
  RF = "rf",
  HYBRID = "hybrid",
}

/**
 * An orbital compute node in the mesh.
 */
export interface OrbitalNode {
  nodeId: string;
  orbitAltitudeKm: number;
  orbitInclinationDeg: number;
  raanDeg: number;
  meanAnomalyDeg: number;
  islRangeKm: number;
  islBandwidthGbps: number;
  computeTflops: number;
}

/**
 * Create an orbital node with defaults.
 */
export function createOrbitalNode(
  nodeId: string,
  options: Partial<Omit<OrbitalNode, "nodeId">> = {}
): OrbitalNode {
  return {
    nodeId,
    orbitAltitudeKm: options.orbitAltitudeKm ?? 550,
    orbitInclinationDeg: options.orbitInclinationDeg ?? 51.6,
    raanDeg: options.raanDeg ?? 0,
    meanAnomalyDeg: options.meanAnomalyDeg ?? 0,
    islRangeKm: options.islRangeKm ?? 5000,
    islBandwidthGbps: options.islBandwidthGbps ?? 10,
    computeTflops: options.computeTflops ?? 10,
  };
}

/**
 * Inter-satellite link between two nodes.
 */
export interface ISLLink {
  sourceId: string;
  targetId: string;
  distanceKm: number;
  bandwidthGbps: number;
  latencyMs: number;
  linkType: LinkType;
  active: boolean;
}

/**
 * A route through the mesh between two nodes.
 */
export interface Route {
  sourceId: string;
  destinationId: string;
  path: string[];
  totalDistanceKm: number;
  totalLatencyMs: number;
  minBandwidthGbps: number;
  numHops: number;
}

/**
 * ISL routing mesh for orbital node communication.
 */
export class SpaceMesh {
  private static readonly SPEED_OF_LIGHT_KM_S = 299792.458;
  private static readonly EARTH_RADIUS_KM = 6371;

  readonly defaultIslRangeKm: number;
  private nodes: Map<string, OrbitalNode> = new Map();
  private links: Map<string, ISLLink> = new Map();
  private adjacency: Map<string, Set<string>> = new Map();

  constructor(defaultIslRangeKm: number = 5000) {
    this.defaultIslRangeKm = defaultIslRangeKm;
  }

  addNode(node: OrbitalNode): void {
    this.nodes.set(node.nodeId, node);
    this.adjacency.set(node.nodeId, new Set());
  }

  removeNode(nodeId: string): void {
    if (!this.nodes.has(nodeId)) return;

    // Remove all links involving this node
    const keysToDelete: string[] = [];
    this.links.forEach((_, key) => {
      if (key.includes(nodeId)) keysToDelete.push(key);
    });
    keysToDelete.forEach((key) => this.links.delete(key));

    // Update adjacency
    this.adjacency.forEach((neighbors) => neighbors.delete(nodeId));
    this.adjacency.delete(nodeId);
    this.nodes.delete(nodeId);
  }

  updateTopology(): void {
    this.links.clear();
    this.adjacency.forEach((neighbors) => neighbors.clear());

    const nodeIds = Array.from(this.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const id1 = nodeIds[i];
        const id2 = nodeIds[j];
        const node1 = this.nodes.get(id1)!;
        const node2 = this.nodes.get(id2)!;

        const distance = this.calculateDistance(node1, node2);
        const maxRange = Math.min(node1.islRangeKm, node2.islRangeKm);

        if (distance <= maxRange && this.hasLineOfSight(node1, node2)) {
          const bandwidth = Math.min(node1.islBandwidthGbps, node2.islBandwidthGbps);
          const latency = (distance / SpaceMesh.SPEED_OF_LIGHT_KM_S) * 1000;

          const link1: ISLLink = {
            sourceId: id1,
            targetId: id2,
            distanceKm: distance,
            bandwidthGbps: bandwidth,
            latencyMs: latency,
            linkType: LinkType.OPTICAL,
            active: true,
          };

          const link2: ISLLink = {
            sourceId: id2,
            targetId: id1,
            distanceKm: distance,
            bandwidthGbps: bandwidth,
            latencyMs: latency,
            linkType: LinkType.OPTICAL,
            active: true,
          };

          this.links.set(`${id1}-${id2}`, link1);
          this.links.set(`${id2}-${id1}`, link2);

          this.adjacency.get(id1)!.add(id2);
          this.adjacency.get(id2)!.add(id1);
        }
      }
    }
  }

  findRoute(
    sourceId: string,
    destinationId: string,
    optimizeFor: "latency" | "bandwidth" = "latency"
  ): Route {
    if (!this.nodes.has(sourceId) || !this.nodes.has(destinationId)) {
      return {
        sourceId,
        destinationId,
        path: [],
        totalDistanceKm: 0,
        totalLatencyMs: 0,
        minBandwidthGbps: 0,
        numHops: 0,
      };
    }

    if (sourceId === destinationId) {
      return {
        sourceId,
        destinationId,
        path: [sourceId],
        totalDistanceKm: 0,
        totalLatencyMs: 0,
        minBandwidthGbps: Infinity,
        numHops: 0,
      };
    }

    // Dijkstra's algorithm
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();
    const visited = new Set<string>();

    this.nodes.forEach((_, nodeId) => {
      distances.set(nodeId, Infinity);
      predecessors.set(nodeId, null);
    });
    distances.set(sourceId, 0);

    const pq: Array<{ dist: number; nodeId: string }> = [{ dist: 0, nodeId: sourceId }];

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const { nodeId: currentId } = pq.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === destinationId) break;

      const neighbors = this.adjacency.get(currentId) ?? new Set();
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;

        const link = this.links.get(`${currentId}-${neighborId}`);
        if (!link || !link.active) continue;

        const weight =
          optimizeFor === "latency" ? link.latencyMs : 1 / link.bandwidthGbps;
        const newDist = distances.get(currentId)! + weight;

        if (newDist < distances.get(neighborId)!) {
          distances.set(neighborId, newDist);
          predecessors.set(neighborId, currentId);
          pq.push({ dist: newDist, nodeId: neighborId });
        }
      }
    }

    if (distances.get(destinationId) === Infinity) {
      return {
        sourceId,
        destinationId,
        path: [],
        totalDistanceKm: 0,
        totalLatencyMs: 0,
        minBandwidthGbps: 0,
        numHops: 0,
      };
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = destinationId;
    while (current !== null) {
      path.unshift(current);
      current = predecessors.get(current) ?? null;
    }

    // Calculate route metrics
    let totalDistance = 0;
    let totalLatency = 0;
    let minBandwidth = Infinity;

    for (let i = 0; i < path.length - 1; i++) {
      const link = this.links.get(`${path[i]}-${path[i + 1]}`);
      if (link) {
        totalDistance += link.distanceKm;
        totalLatency += link.latencyMs;
        minBandwidth = Math.min(minBandwidth, link.bandwidthGbps);
      }
    }

    return {
      sourceId,
      destinationId,
      path,
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
      totalLatencyMs: Math.round(totalLatency * 1000) / 1000,
      minBandwidthGbps: minBandwidth === Infinity ? 0 : minBandwidth,
      numHops: path.length - 1,
    };
  }

  getAllRoutesFrom(sourceId: string): Map<string, Route> {
    const routes = new Map<string, Route>();
    this.nodes.forEach((_, destId) => {
      if (destId !== sourceId) {
        routes.set(destId, this.findRoute(sourceId, destId));
      }
    });
    return routes;
  }

  getMeshStats(): Record<string, unknown> {
    const activeLinks = new Set<string>();
    this.links.forEach((link, key) => {
      if (link.active) {
        const sorted = [link.sourceId, link.targetId].sort().join("-");
        activeLinks.add(sorted);
      }
    });

    const numActiveLinks = activeLinks.size;
    const avgLinksPerNode = this.nodes.size > 0 ? (2 * numActiveLinks) / this.nodes.size : 0;

    let totalBandwidth = 0;
    let totalDistance = 0;
    activeLinks.forEach((key) => {
      const [id1, id2] = key.split("-");
      const link = this.links.get(`${id1}-${id2}`);
      if (link) {
        totalBandwidth += link.bandwidthGbps;
        totalDistance += link.distanceKm;
      }
    });

    const avgDistance = numActiveLinks > 0 ? totalDistance / numActiveLinks : 0;

    return {
      totalNodes: this.nodes.size,
      activeLinks: numActiveLinks,
      avgLinksPerNode: Math.round(avgLinksPerNode * 100) / 100,
      totalBandwidthGbps: Math.round(totalBandwidth * 100) / 100,
      avgLinkDistanceKm: Math.round(avgDistance * 100) / 100,
    };
  }

  private calculateDistance(node1: OrbitalNode, node2: OrbitalNode): number {
    const r1 = SpaceMesh.EARTH_RADIUS_KM + node1.orbitAltitudeKm;
    const r2 = SpaceMesh.EARTH_RADIUS_KM + node2.orbitAltitudeKm;

    const theta1 = (node1.meanAnomalyDeg * Math.PI) / 180;
    const theta2 = (node2.meanAnomalyDeg * Math.PI) / 180;

    const inc1 = (node1.orbitInclinationDeg * Math.PI) / 180;
    const inc2 = (node2.orbitInclinationDeg * Math.PI) / 180;

    const raan1 = (node1.raanDeg * Math.PI) / 180;
    const raan2 = (node2.raanDeg * Math.PI) / 180;

    const x1 =
      r1 *
      (Math.cos(raan1) * Math.cos(theta1) -
        Math.sin(raan1) * Math.sin(theta1) * Math.cos(inc1));
    const y1 =
      r1 *
      (Math.sin(raan1) * Math.cos(theta1) +
        Math.cos(raan1) * Math.sin(theta1) * Math.cos(inc1));
    const z1 = r1 * Math.sin(theta1) * Math.sin(inc1);

    const x2 =
      r2 *
      (Math.cos(raan2) * Math.cos(theta2) -
        Math.sin(raan2) * Math.sin(theta2) * Math.cos(inc2));
    const y2 =
      r2 *
      (Math.sin(raan2) * Math.cos(theta2) +
        Math.cos(raan2) * Math.sin(theta2) * Math.cos(inc2));
    const z2 = r2 * Math.sin(theta2) * Math.sin(inc2);

    return Math.sqrt(
      Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
    );
  }

  private hasLineOfSight(node1: OrbitalNode, node2: OrbitalNode): boolean {
    const minAltitude = Math.min(node1.orbitAltitudeKm, node2.orbitAltitudeKm);
    const distance = this.calculateDistance(node1, node2);

    const maxLosDistance =
      2 *
      Math.sqrt(
        Math.pow(SpaceMesh.EARTH_RADIUS_KM + minAltitude, 2) -
          Math.pow(SpaceMesh.EARTH_RADIUS_KM, 2)
      );

    return distance <= maxLosDistance;
  }
}

/**
 * Create a Walker constellation mesh.
 */
export function createConstellation(options: {
  name: string;
  numPlanes: number;
  satsPerPlane: number;
  altitudeKm?: number;
  inclinationDeg?: number;
  islRangeKm?: number;
}): SpaceMesh {
  const {
    name,
    numPlanes,
    satsPerPlane,
    altitudeKm = 550,
    inclinationDeg = 53,
    islRangeKm = 5000,
  } = options;

  const mesh = new SpaceMesh(islRangeKm);

  for (let plane = 0; plane < numPlanes; plane++) {
    const raan = (360 / numPlanes) * plane;

    for (let sat = 0; sat < satsPerPlane; sat++) {
      let meanAnomaly = (360 / satsPerPlane) * sat;
      meanAnomaly += (360 / (numPlanes * satsPerPlane)) * plane;

      const nodeId = `${name}_P${plane}_S${sat}`;
      mesh.addNode(
        createOrbitalNode(nodeId, {
          orbitAltitudeKm: altitudeKm,
          orbitInclinationDeg: inclinationDeg,
          raanDeg: raan,
          meanAnomalyDeg: meanAnomaly,
          islRangeKm,
        })
      );
    }
  }

  mesh.updateTopology();
  return mesh;
}
