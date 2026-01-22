# @rotastellar/distributed

Distributed compute coordination for Earth-space AI workloads.

**Status:** Coming Q1 2026

## Overview

`@rotastellar/distributed` enables AI training and inference across hybrid Earth-space infrastructure. Coordinate federated learning, partition models optimally, and synchronize through bandwidth-constrained orbital links.

## Installation

```bash
npm install @rotastellar/distributed
```

## Features

### Federated Learning

```typescript
import { FederatedClient, CompressionConfig } from '@rotastellar/distributed';

const compression = new CompressionConfig({
  method: 'topk_quantized',
  kRatio: 0.01,
  quantizationBits: 8,
  errorFeedback: true
});

const client = new FederatedClient({
  apiKey: '...',
  nodeId: 'orbital-3',
  nodeType: 'orbital',
  compression
});

const gradients = client.trainStep(model, batch);
client.sync(gradients, { priority: 'high' });
```

### Model Partitioning

```typescript
import { PartitionOptimizer, ModelProfile } from '@rotastellar/distributed';

const profile = ModelProfile.fromOnnx(model);

const optimizer = new PartitionOptimizer({ apiKey: '...' });
const partition = optimizer.optimize({
  model: profile,
  topology: {
    groundNodes: 3,
    orbitalNodes: 5,
    groundFlops: 100e12,
    orbitalFlops: 20e12
  },
  objective: 'minimize_latency'
});
```

### Sync Scheduler

```typescript
import { SyncScheduler, GroundStation } from '@rotastellar/distributed';

const scheduler = new SyncScheduler({
  apiKey: '...',
  groundStations: [
    new GroundStation('svalbard', { lat: 78.2, lon: 15.6 }),
    new GroundStation('singapore', { lat: 1.3, lon: 103.8 })
  ]
});

const windows = scheduler.getWindows({ hours: 24 });
scheduler.scheduleSync({
  node: 'orbital-1',
  dataSize: 50e6,
  priority: 'critical'
});
```

### Space Mesh

```typescript
import { SpaceMesh } from '@rotastellar/distributed';

const mesh = new SpaceMesh({ apiKey: '...' });
const route = mesh.findRoute({
  source: 'orbital-1',
  destination: 'ground-svalbard',
  maxHops: 3
});
```

## Documentation

Full documentation: https://docs.rotastellar.com/sdks/node/distributed

## Links

- Website: https://rotastellar.com/products/distributed-compute
- Interactive Demo: https://rotastellar.com/products/distributed-compute/demo
- Research: https://rotastellar.com/research

## License

MIT License
