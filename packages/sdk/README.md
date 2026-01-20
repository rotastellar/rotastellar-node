# @rotastellar/sdk

**Node.js SDK for RotaStellar - Space Computing Infrastructure**

Plan, simulate, and operate orbital data centers and space intelligence systems.

🚀 **Launching Q1 2026**

## Installation

```bash
npm install @rotastellar/sdk
```

## Coming Soon

```typescript
import { OrbitalIntel } from '@rotastellar/sdk';

const client = new OrbitalIntel({ apiKey: '...' });

// Track any satellite
const iss = await client.satellite('ISS');
const pos = await iss.position();
console.log(`ISS: ${pos.lat}, ${pos.lon}`);
```

## Related Packages

- [@rotastellar/compute](https://www.npmjs.com/package/@rotastellar/compute)
- [@rotastellar/intel](https://www.npmjs.com/package/@rotastellar/intel)

## Links

- **Website:** https://rotastellar.com
- **Documentation:** https://rotastellar.com/docs
- **GitHub:** https://github.com/rotastellar/rotastellar-node

## License

MIT License — Copyright (c) 2026 Rota, Inc.
