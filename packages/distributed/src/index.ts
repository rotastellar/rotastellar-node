/**
 * RotaStellar Distributed - Earth-Space AI Coordination
 *
 * Coordinate AI workloads across Earth and orbital infrastructure with
 * federated learning, model partitioning, and bandwidth-optimized sync.
 *
 * Documentation: https://rotastellar.com/docs/distributed
 * GitHub: https://github.com/rotastellar/rotastellar-node
 *
 * @example
 * ```typescript
 * import {
 *   FederatedClient, CompressionConfig, GradientAggregator,
 *   ModelProfile, PartitionOptimizer,
 *   SyncScheduler, Priority, GroundStations,
 *   SpaceMesh, createConstellation,
 * } from '@rotastellar/distributed';
 *
 * // Federated learning with gradient compression
 * const client = new FederatedClient("orbital-1", CompressionConfig.balanced());
 * const gradients = client.computeGradients(modelParams, localData);
 * const compressed = client.compress(gradients);
 *
 * // Model partitioning
 * const model = ModelProfile.createTransformer({ numLayers: 12 });
 * const optimizer = new PartitionOptimizer();
 * const plan = optimizer.optimize(model);
 *
 * // Sync scheduling
 * const scheduler = new SyncScheduler();
 * scheduler.scheduleSync("node-1", 1024*1024, Priority.HIGH);
 *
 * // Space mesh routing
 * const mesh = createConstellation({ name: "test", numPlanes: 4, satsPerPlane: 10 });
 * const route = mesh.findRoute("test_P0_S0", "test_P2_S5");
 * ```
 */

export const VERSION = "0.1.0";

// Core types
export {
  NodeType,
  NodeConfig,
  createOrbitalNode as createOrbitalNodeConfig,
  createGroundNode,
  Topology,
  TrainingMetrics,
} from "./core";

// Federated learning
export {
  CompressionMethod,
  CompressionConfig,
  CompressionConfigOptions,
  CompressedGradient,
  GradientCompressor,
  FederatedClient,
  AggregationStrategy,
  GradientAggregator,
} from "./federated";

// Model partitioning
export {
  LayerType,
  LayerProfile,
  ModelProfile,
  PlacementLocation,
  LayerPlacement,
  PartitionPlan,
  OptimizationObjective,
  getGroundLayers,
  getOrbitalLayers,
  partitionPlanSummary,
  LatencyEstimator,
  PartitionOptimizer,
} from "./partitioning";

// Sync scheduling
export {
  Priority,
  GroundStation,
  createGroundStation,
  GroundStations,
  ContactWindow,
  getContactWindowDurationSeconds,
  getContactWindowCapacityMb,
  SyncTask,
  PriorityQueue,
  SyncScheduler,
} from "./sync";

// Space mesh
export {
  LinkType,
  OrbitalNode,
  createOrbitalNode,
  ISLLink,
  Route,
  SpaceMesh,
  createConstellation,
} from "./mesh";
