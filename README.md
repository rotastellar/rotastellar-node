<p align="center">
  <img src="assets/logo-dark.jpg" alt="RotaStellar" width="400">
</p>

<p align="center">
  <strong>Node.js SDK for Space Computing Infrastructure</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@rotastellar/sdk"><img src="https://img.shields.io/npm/v/@rotastellar/sdk?color=blue&label=sdk" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@rotastellar/compute"><img src="https://img.shields.io/npm/v/@rotastellar/compute?color=blue&label=compute" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@rotastellar/intel"><img src="https://img.shields.io/npm/v/@rotastellar/intel?color=blue&label=intel" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@rotastellar/distributed"><img src="https://img.shields.io/npm/v/@rotastellar/distributed?color=blue&label=distributed" alt="npm"></a>
</p>

<p align="center">
  <a href="https://github.com/rotastellar/rotastellar-node/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-blue" alt="TypeScript"></a>
  <a href="https://docs.rotastellar.com"><img src="https://img.shields.io/badge/docs-rotastellar.com-blue" alt="Documentation"></a>
</p>

---

Plan, simulate, and operate orbital data centers and space intelligence systems.

## Packages

| Package | Description |
|---------|-------------|
| [@rotastellar/sdk](./packages/sdk) | Core types — Position, Orbit, Satellite, TimeRange |
| [@rotastellar/compute](./packages/compute) | Feasibility, thermal, power, and latency analysis |
| [@rotastellar/intel](./packages/intel) | Satellite tracking, TLE parsing, conjunction analysis |
| [@rotastellar/distributed](./packages/distributed) | Federated learning, model partitioning, mesh routing |

## Installation

```bash
# Core SDK
npm install @rotastellar/sdk

# All packages
npm install @rotastellar/sdk @rotastellar/compute @rotastellar/intel @rotastellar/distributed
```

## Quick Start

```typescript
import { Position, Orbit, Satellite } from '@rotastellar/sdk';
import { FeasibilityCalculator, WorkloadProfile, WorkloadType } from '@rotastellar/compute';

// Define a position
const ksc = new Position({ latitude: 28.5729, longitude: -80.6490, altitudeKm: 0.0 });

// Analyze workload feasibility
const calc = new FeasibilityCalculator({ altitudeKm: 550.0 });
const profile = new WorkloadProfile({
  workloadType: WorkloadType.INFERENCE,
  computePowerKw: 10.0,
  memoryGb: 32.0
});
const result = calc.analyze(profile);
console.log(`Feasible: ${result.feasible}, Rating: ${result.rating}`);
```

## Links

- **Website:** https://rotastellar.com
- **Documentation:** https://docs.rotastellar.com/sdks/node
- **Python SDK:** https://github.com/rotastellar/rotastellar-python
- **Rust SDK:** https://github.com/rotastellar/rotastellar-rust

## Author

Created by [Subhadip Mitra](mailto:subhadipmitra@rotastellar.com) at [RotaStellar](https://rotastellar.com).

## License

MIT License — Copyright (c) 2026 RotaStellar
