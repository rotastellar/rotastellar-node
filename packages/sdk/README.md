# @rotastellar/sdk

**Node.js SDK for RotaStellar — Space Computing Infrastructure**

Core types, utilities, and client for the RotaStellar platform.

## Installation

```bash
npm install @rotastellar/sdk
```

## Quick Start

```typescript
import { Position, Orbit, Satellite, TimeRange } from '@rotastellar/sdk';

// Create a geographic position (e.g., Kennedy Space Center)
const ksc = new Position({
  latitude: 28.5729,
  longitude: -80.6490,
  altitudeKm: 0.0
});
console.log(`KSC: ${ksc.latitude}°N, ${ksc.longitude}°W`);

// Define an ISS-like orbit
const orbit = new Orbit({
  semiMajorAxisKm: 6778.0,
  eccentricity: 0.0001,
  inclinationDeg: 51.6,
  raanDeg: 100.0,
  argPeriapsisDeg: 90.0,
  trueAnomalyDeg: 0.0
});
console.log(`Orbital period: ${orbit.periodMinutes.toFixed(1)} minutes`);
console.log(`Apogee: ${orbit.apogeeKm.toFixed(1)} km`);

// Create a satellite
const satellite = new Satellite({
  id: 'ISS',
  name: 'International Space Station',
  noradId: 25544,
  position: new Position({ latitude: 45.0, longitude: -122.0, altitudeKm: 408.0 }),
  orbit
});

// Define a time range
const range = new TimeRange({
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2026-01-02T00:00:00Z')
});
console.log(`Duration: ${range.durationHours.toFixed(1)} hours`);
```

## API Key

To use the RotaStellar API, you'll need an API key:

```typescript
import { RotaStellarClient } from '@rotastellar/sdk';

// Demo key for testing (10 requests/minute limit)
const client = new RotaStellarClient({ apiKey: 'rs_demo_rotastellar2026' });

// Or get your own key at https://dashboard.rotastellar.com
const client = new RotaStellarClient({ apiKey: 'rs_live_your_key_here' });
```

**Demo Key:** `rs_demo_rotastellar2026` — Rate limited to 10 requests/minute. Great for testing!

**Get Your Own Key:** [dashboard.rotastellar.com](https://dashboard.rotastellar.com) — Higher limits, usage tracking.

**Try the API:** [api.rotastellar.com/docs](https://api.rotastellar.com/docs) — Interactive Swagger UI.

## Features

- **Position** — Geographic coordinates with altitude
- **Orbit** — Keplerian orbital elements with derived properties
- **Satellite** — Satellite metadata and state
- **TimeRange** — Time window specifications
- **Validation** — Runtime parameter validation with Zod

## Related Packages

| Package | Description |
|---------|-------------|
| [@rotastellar/intel](https://www.npmjs.com/package/@rotastellar/intel) | Satellite tracking, TLE parsing, conjunction analysis |
| [@rotastellar/compute](https://www.npmjs.com/package/@rotastellar/compute) | Thermal, power, latency, and feasibility analysis |
| [@rotastellar/distributed](https://www.npmjs.com/package/@rotastellar/distributed) | Federated learning, model partitioning, mesh routing |

## Links

- **Website:** https://rotastellar.com
- **Documentation:** https://docs.rotastellar.com/sdks/node
- **GitHub:** https://github.com/rotastellar/rotastellar-node

## Author

Created by [Subhadip Mitra](mailto:subhadipmitra@rotastellar.com) at [RotaStellar](https://rotastellar.com).

## License

MIT License — Copyright (c) 2026 RotaStellar
