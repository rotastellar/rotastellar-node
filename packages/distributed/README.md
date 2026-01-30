# @rotastellar/distributed

**Distributed Computing for Space Infrastructure**

Federated learning, model partitioning, gradient synchronization, and mesh networking for orbital compute clusters.

## Installation

```bash
npm install @rotastellar/distributed
```

## Quick Start

### Federated Learning

```typescript
import {
  FederatedClient,
  GradientAggregator,
  AggregationStrategy,
  CompressionConfig,
  CompressionType
} from '@rotastellar/distributed';

// Configure gradient compression for limited bandwidth
const compression = new CompressionConfig({
  compressionType: CompressionType.TOP_K,
  sparsity: 0.99,  // Keep top 1% of gradients
  errorFeedback: true
});

// Create federated client
const client = new FederatedClient({
  nodeId: 'sat-001',
  compression
});

// Compress gradients before transmission
const gradients = model.getGradients();
const compressed = client.compress(gradients);
console.log(`Compression ratio: ${compressed.compressionRatio.toFixed(1)}x`);

// Server-side aggregation
const aggregator = new GradientAggregator({ strategy: AggregationStrategy.FEDAVG });
const aggregated = aggregator.aggregate([grad1, grad2, grad3], { weights: [0.4, 0.3, 0.3] });
```

### Model Partitioning

```typescript
import {
  ModelProfile,
  PartitionOptimizer,
  NodeConfig,
  NodeType
} from '@rotastellar/distributed';

// Profile your model
const profile = new ModelProfile({
  layers: [
    { name: 'embedding', paramsMb: 100, flops: 1e9 },
    { name: 'transformer_1', paramsMb: 200, flops: 5e9 },
    { name: 'transformer_2', paramsMb: 200, flops: 5e9 },
    { name: 'output', paramsMb: 50, flops: 1e8 }
  ]
});

// Define available nodes
const nodes = [
  new NodeConfig({ nodeId: 'sat-001', nodeType: NodeType.SATELLITE, memoryGb: 8, computeTflops: 2.0 }),
  new NodeConfig({ nodeId: 'sat-002', nodeType: NodeType.SATELLITE, memoryGb: 8, computeTflops: 2.0 }),
  new NodeConfig({ nodeId: 'ground-001', nodeType: NodeType.GROUND, memoryGb: 32, computeTflops: 10.0 })
];

// Optimize partitioning
const optimizer = new PartitionOptimizer();
const plan = optimizer.optimize(profile, nodes);
console.log(`Partition plan: ${JSON.stringify(plan.assignments)}`);
console.log(`Estimated latency: ${plan.estimatedLatencyMs.toFixed(1)} ms`);
```

### Synchronization Scheduling

```typescript
import { SyncScheduler, GroundStation } from '@rotastellar/distributed';
import { Position } from '@rotastellar/sdk';

// Define ground stations
const stations = [
  new GroundStation({
    name: 'KSC',
    position: new Position({ latitude: 28.5729, longitude: -80.6490, altitudeKm: 0.0 }),
    uplinkMbps: 100.0,
    downlinkMbps: 200.0
  }),
  new GroundStation({
    name: 'Svalbard',
    position: new Position({ latitude: 78.2297, longitude: 15.3975, altitudeKm: 0.0 }),
    uplinkMbps: 150.0,
    downlinkMbps: 300.0
  })
];

// Create scheduler
const scheduler = new SyncScheduler({ groundStations: stations });

// Get optimal sync windows
const windows = scheduler.getSyncWindows({
  satelliteId: 'sat-001',
  durationHours: 24
});

for (const window of windows) {
  console.log(`Station: ${window.station.name}`);
  console.log(`Start: ${window.startTime.toISOString()}, Duration: ${window.durationSeconds}s`);
  console.log(`Data capacity: ${window.dataCapacityMb.toFixed(1)} MB`);
}
```

### Space Mesh Networking

```typescript
import { SpaceMesh, MeshNode } from '@rotastellar/distributed';
import { Position } from '@rotastellar/sdk';

// Create mesh network
const mesh = new SpaceMesh();

// Add nodes
mesh.addNode(new MeshNode({ nodeId: 'sat-001', position: new Position({ latitude: 45.0, longitude: -122.0, altitudeKm: 550.0 }) }));
mesh.addNode(new MeshNode({ nodeId: 'sat-002', position: new Position({ latitude: 46.0, longitude: -120.0, altitudeKm: 550.0 }) }));
mesh.addNode(new MeshNode({ nodeId: 'sat-003', position: new Position({ latitude: 44.0, longitude: -118.0, altitudeKm: 550.0 }) }));

// Add inter-satellite links
mesh.addLink('sat-001', 'sat-002', { bandwidthMbps: 1000.0, latencyMs: 2.0 });
mesh.addLink('sat-002', 'sat-003', { bandwidthMbps: 1000.0, latencyMs: 2.5 });

// Find optimal route
const route = mesh.findRoute('sat-001', 'sat-003');
console.log(`Route: ${route.hops.join(' -> ')}`);
console.log(`Total latency: ${route.totalLatencyMs.toFixed(1)} ms`);
```

## Features

- **Federated Learning** — Privacy-preserving distributed training across orbital nodes
- **Gradient Compression** — TopK, random sparsification, quantization for bandwidth-limited links
- **Model Partitioning** — Intelligent layer placement across heterogeneous nodes
- **Sync Scheduling** — Optimal ground station contact windows for data synchronization
- **Mesh Networking** — Dynamic routing for inter-satellite communication

## Links

- **Website:** https://rotastellar.com/products/distributed
- **Documentation:** https://docs.rotastellar.com/sdks/node/distributed
- **Main SDK:** https://www.npmjs.com/package/@rotastellar/sdk

## Author

Created by [Subhadip Mitra](mailto:subhadipmitra@rotastellar.com) at [RotaStellar](https://rotastellar.com).

## License

MIT License — Copyright (c) 2026 RotaStellar
