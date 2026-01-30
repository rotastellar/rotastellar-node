# @rotastellar/intel

**Orbital Intelligence & Space Situational Awareness**

Track satellites, parse TLEs, analyze conjunctions, and detect orbital patterns.

## Installation

```bash
npm install @rotastellar/intel
```

## Quick Start

### TLE Parsing

```typescript
import { TLE } from '@rotastellar/intel';

// Parse a Two-Line Element set
const tleLines = [
  "ISS (ZARYA)",
  "1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025",
  "2 25544  51.6400 208.9163 0006703  40.5765  35.4667 15.49560927421258"
];

const tle = TLE.parse(tleLines);
console.log(`Satellite: ${tle.name}`);
console.log(`NORAD ID: ${tle.noradId}`);
console.log(`Inclination: ${tle.inclinationDeg.toFixed(2)}°`);
console.log(`Period: ${tle.orbitalPeriodMinutes.toFixed(2)} minutes`);

// Get position at epoch
const position = tle.propagate();
console.log(`Position: ${position.latitude.toFixed(2)}°, ${position.longitude.toFixed(2)}°`);
```

### Satellite Tracking

```typescript
import { Tracker, GroundStation } from '@rotastellar/intel';
import { Position } from '@rotastellar/sdk';

// Create a tracker
const tracker = new Tracker();
tracker.addTle('ISS', tle);

// Get current position
const pos = tracker.getPosition('ISS');

// Calculate passes over a ground station
const gs = new GroundStation({
  name: 'KSC',
  position: new Position({ latitude: 28.5729, longitude: -80.6490, altitudeKm: 0.0 }),
  minElevationDeg: 10.0
});

const passes = tracker.predictPasses('ISS', gs, { hours: 24 });
for (const p of passes) {
  console.log(`AOS: ${p.aos.toISOString()}, Max El: ${p.maxElevationDeg.toFixed(1)}°`);
}
```

### Conjunction Analysis

```typescript
import { ConjunctionAnalyzer, RiskLevel } from '@rotastellar/intel';

const analyzer = new ConjunctionAnalyzer();

// Analyze collision probability
const conjunction = analyzer.analyze({
  primaryId: 'ISS',
  secondaryId: 'DEBRIS-12345',
  missDistanceKm: 0.5,
  relativeVelocityKmS: 10.0
});

console.log(`Risk Level: ${conjunction.riskLevel}`);
console.log(`Collision Probability: ${conjunction.collisionProbability.toExponential(2)}`);

if (conjunction.riskLevel === RiskLevel.CRITICAL) {
  console.log('⚠️  Maneuver recommended!');
}
```

### Pattern Detection

```typescript
import { PatternDetector, PatternType } from '@rotastellar/intel';

const detector = new PatternDetector();

// Detect maneuvers from TLE history
const patterns = await detector.detect({ satelliteId: 'STARLINK-1234', days: 30 });

for (const pattern of patterns) {
  if (pattern.patternType === PatternType.ORBIT_RAISE) {
    console.log(`Orbit raise detected: +${pattern.deltaAltitudeKm.toFixed(1)} km`);
  } else if (pattern.patternType === PatternType.MANEUVER) {
    console.log(`Maneuver: Δv = ${pattern.deltaVMs.toFixed(2)} m/s`);
  }
}
```

## Features

- **TLE Parsing** — Full Two-Line Element support with SGP4 propagation
- **Satellite Tracking** — Real-time position and pass prediction
- **Conjunction Analysis** — Collision probability using NASA CARA methodology
- **Pattern Detection** — Maneuver detection, anomaly identification

## Links

- **Website:** https://rotastellar.com/products/orbital-intelligence
- **Documentation:** https://docs.rotastellar.com/sdks/node/intel
- **Main SDK:** https://www.npmjs.com/package/@rotastellar/sdk

## Author

Created by [Subhadip Mitra](mailto:subhadipmitra@rotastellar.com) at [RotaStellar](https://rotastellar.com).

## License

MIT License — Copyright (c) 2026 RotaStellar
