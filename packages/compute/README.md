# @rotastellar/compute

**Orbital Compute Planning & Simulation**

Feasibility analysis, thermal simulation, power budgeting, and latency modeling for space-based computing.

## Installation

```bash
npm install @rotastellar/compute
```

## Quick Start

### Feasibility Analysis

```typescript
import {
  FeasibilityCalculator,
  WorkloadProfile,
  WorkloadType
} from '@rotastellar/compute';

// Create a calculator for 550km altitude
const calc = new FeasibilityCalculator({ altitudeKm: 550.0 });

// Define your workload
const profile = new WorkloadProfile({
  workloadType: WorkloadType.INFERENCE,
  computePowerKw: 10.0,
  memoryGb: 32.0,
  latencyRequirementMs: 100.0
});

// Analyze feasibility
const result = calc.analyze(profile);
console.log(`Feasible: ${result.feasible}`);
console.log(`Rating: ${result.rating}`);  // EXCELLENT, GOOD, MARGINAL, or NOT_FEASIBLE
console.log(`Thermal margin: ${result.thermalMarginPercent.toFixed(1)}%`);
console.log(`Power margin: ${result.powerMarginPercent.toFixed(1)}%`);
```

### Thermal Simulation

```typescript
import {
  ThermalSimulator,
  ThermalConfig,
  ThermalEnvironment
} from '@rotastellar/compute';

// Create simulator
const sim = new ThermalSimulator();

// Configure for 500W heat dissipation
const config = ThermalConfig.forPower(500.0);

// LEO environment at 550km
const env = ThermalEnvironment.leo({ altitudeKm: 550.0 });

// Run simulation
const result = sim.simulate(config, env);
console.log(`Equilibrium temperature: ${result.equilibriumTempC.toFixed(1)}°C`);
console.log(`Max temperature: ${result.maxTempC.toFixed(1)}°C`);
console.log(`Radiator area required: ${result.radiatorAreaM2.toFixed(2)} m²`);
```

### Power Analysis

```typescript
import {
  PowerAnalyzer,
  PowerProfile,
  SolarConfig,
  BatteryConfig
} from '@rotastellar/compute';

// Analyzer for 550km orbit
const analyzer = new PowerAnalyzer({ altitudeKm: 550.0 });

// Power requirements
const profile = new PowerProfile({
  averagePowerW: 500.0,
  peakPowerW: 800.0
});

// Optional: customize solar and battery
const solar = new SolarConfig({ efficiency: 0.30, degradationPerYear: 0.02 });
const battery = new BatteryConfig({ depthOfDischarge: 0.40, efficiency: 0.95 });

// Analyze
const budget = analyzer.analyze(profile, { solarConfig: solar, batteryConfig: battery });
console.log(`Solar panel area: ${budget.solarPanelAreaM2.toFixed(2)} m²`);
console.log(`Battery capacity: ${budget.batteryCapacityWh.toFixed(0)} Wh`);
console.log(`Eclipse duration: ${budget.eclipseDurationMin.toFixed(1)} minutes`);
```

### Latency Modeling

```typescript
import { LatencySimulator } from '@rotastellar/compute';

// Simulator for 550km altitude
const sim = new LatencySimulator({ altitudeKm: 550.0 });

// Simulate with 100ms processing time
const result = sim.simulate({ processingTimeMs: 100.0 });
console.log(`Propagation delay: ${result.propagationDelayMs.toFixed(1)} ms`);
console.log(`Processing time: ${result.processingTimeMs.toFixed(1)} ms`);
console.log(`Total latency: ${result.totalLatencyMs.toFixed(1)} ms`);

// Compare different altitudes
const altitudes = [400.0, 550.0, 800.0, 1200.0];
const comparison = sim.compareAltitudes(altitudes);
for (const altResult of comparison) {
  console.log(`${altResult.altitudeKm}km: ${altResult.typicalLatencyMs.toFixed(1)}ms`);
}
```

## Features

- **Feasibility Analysis** — Evaluate workload suitability for orbital compute
- **Thermal Simulation** — Model heat rejection using Stefan-Boltzmann law
- **Power Analysis** — Solar panel and battery sizing for orbital systems
- **Latency Modeling** — End-to-end latency for space-ground communication

## Links

- **Website:** https://rotastellar.com/products/compute
- **Documentation:** https://docs.rotastellar.com/sdks/node/compute
- **Main SDK:** https://www.npmjs.com/package/@rotastellar/sdk

## Author

Created by [Subhadip Mitra](mailto:subhadipmitra@rotastellar.com) at [RotaStellar](https://rotastellar.com).

## License

MIT License — Copyright (c) 2026 RotaStellar
