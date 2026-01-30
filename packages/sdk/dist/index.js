"use strict";
/**
 * RotaStellar SDK - Space Computing Infrastructure
 *
 * Node.js SDK for orbital compute planning, simulation, and space intelligence.
 *
 * Documentation: https://rotastellar.com/docs
 * GitHub: https://github.com/rotastellar/rotastellar-node
 *
 * @example
 * import { RotaStellarClient, Position } from '@rotastellar/sdk';
 *
 * const client = new RotaStellarClient({ apiKey: "rs_live_xxx" });
 *
 * // List satellites
 * const satellites = await client.listSatellites({ constellation: "starlink" });
 * for (const sat of satellites) {
 *   console.log(`${sat.name}: ${sat.noradId}`);
 * }
 *
 * // Analyze orbital compute feasibility
 * const result = await client.analyzeFeasibility({
 *   workloadType: "inference",
 *   computeTflops: 10,
 *   dataGb: 1.5
 * });
 * console.log(`Feasible: ${result.feasible}`);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPClient = exports.getAuthHeader = exports.maskApiKey = exports.validateApiKey = exports.TimeoutError = exports.NetworkError = exports.ValidationError = exports.NotFoundError = exports.RateLimitError = exports.APIError = exports.InvalidAPIKeyError = exports.MissingAPIKeyError = exports.AuthenticationError = exports.RotaStellarError = exports.setDefaultConfig = exports.getDefaultConfig = exports.Config = exports.EARTH_MU = exports.EARTH_RADIUS_KM = exports.TimeRange = exports.Satellite = exports.Orbit = exports.Position = exports.RotaStellarClient = exports.VERSION = void 0;
exports.VERSION = "0.1.0";
// Main client
var client_1 = require("./client");
Object.defineProperty(exports, "RotaStellarClient", { enumerable: true, get: function () { return client_1.RotaStellarClient; } });
// Types
var types_1 = require("./types");
Object.defineProperty(exports, "Position", { enumerable: true, get: function () { return types_1.Position; } });
Object.defineProperty(exports, "Orbit", { enumerable: true, get: function () { return types_1.Orbit; } });
Object.defineProperty(exports, "Satellite", { enumerable: true, get: function () { return types_1.Satellite; } });
Object.defineProperty(exports, "TimeRange", { enumerable: true, get: function () { return types_1.TimeRange; } });
Object.defineProperty(exports, "EARTH_RADIUS_KM", { enumerable: true, get: function () { return types_1.EARTH_RADIUS_KM; } });
Object.defineProperty(exports, "EARTH_MU", { enumerable: true, get: function () { return types_1.EARTH_MU; } });
// Configuration
var config_1 = require("./config");
Object.defineProperty(exports, "Config", { enumerable: true, get: function () { return config_1.Config; } });
Object.defineProperty(exports, "getDefaultConfig", { enumerable: true, get: function () { return config_1.getDefaultConfig; } });
Object.defineProperty(exports, "setDefaultConfig", { enumerable: true, get: function () { return config_1.setDefaultConfig; } });
// Errors
var errors_1 = require("./errors");
Object.defineProperty(exports, "RotaStellarError", { enumerable: true, get: function () { return errors_1.RotaStellarError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return errors_1.AuthenticationError; } });
Object.defineProperty(exports, "MissingAPIKeyError", { enumerable: true, get: function () { return errors_1.MissingAPIKeyError; } });
Object.defineProperty(exports, "InvalidAPIKeyError", { enumerable: true, get: function () { return errors_1.InvalidAPIKeyError; } });
Object.defineProperty(exports, "APIError", { enumerable: true, get: function () { return errors_1.APIError; } });
Object.defineProperty(exports, "RateLimitError", { enumerable: true, get: function () { return errors_1.RateLimitError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return errors_1.NotFoundError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_1.ValidationError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return errors_1.NetworkError; } });
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return errors_1.TimeoutError; } });
// Auth utilities
var auth_1 = require("./auth");
Object.defineProperty(exports, "validateApiKey", { enumerable: true, get: function () { return auth_1.validateApiKey; } });
Object.defineProperty(exports, "maskApiKey", { enumerable: true, get: function () { return auth_1.maskApiKey; } });
Object.defineProperty(exports, "getAuthHeader", { enumerable: true, get: function () { return auth_1.getAuthHeader; } });
// HTTP Client (for advanced usage)
var http_1 = require("./http");
Object.defineProperty(exports, "HTTPClient", { enumerable: true, get: function () { return http_1.HTTPClient; } });
//# sourceMappingURL=index.js.map