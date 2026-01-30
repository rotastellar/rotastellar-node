/**
 * RotaStellar SDK - Authentication
 *
 * API key validation and authentication handling.
 */

import { MissingAPIKeyError, InvalidAPIKeyError } from "./errors";

// API key patterns
const API_KEY_PATTERN = /^rs_(live|test)_[a-zA-Z0-9]{16,}$/;
const API_KEY_PREFIX_LIVE = "rs_live_";
const API_KEY_PREFIX_TEST = "rs_test_";

/**
 * Validate an API key and return its environment.
 *
 * @param apiKey - The API key to validate
 * @returns Tuple of [isValid, environment]
 * @throws MissingAPIKeyError if apiKey is null or empty
 * @throws InvalidAPIKeyError if apiKey format is invalid
 */
export function validateApiKey(
  apiKey: string | undefined | null
): [boolean, string] {
  if (!apiKey || apiKey.trim() === "") {
    throw new MissingAPIKeyError();
  }

  const trimmedKey = apiKey.trim();
  let environment: string;

  // Check prefix
  if (trimmedKey.startsWith(API_KEY_PREFIX_LIVE)) {
    environment = "live";
  } else if (trimmedKey.startsWith(API_KEY_PREFIX_TEST)) {
    environment = "test";
  } else {
    throw new InvalidAPIKeyError(trimmedKey);
  }

  // Validate full pattern
  if (!API_KEY_PATTERN.test(trimmedKey)) {
    throw new InvalidAPIKeyError(trimmedKey);
  }

  return [true, environment];
}

/**
 * Mask an API key for safe logging.
 *
 * @param apiKey - The API key to mask
 * @returns Masked API key showing only prefix and last 4 characters
 *
 * @example
 * maskApiKey("rs_live_abc123def456xyz")
 * // Returns: "rs_live_****xyz"
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return apiKey.slice(0, 8) + "****";
  }

  const prefixEnd = 8; // "rs_live_" or "rs_test_"
  return apiKey.slice(0, prefixEnd) + "****" + apiKey.slice(-4);
}

/**
 * Get the authorization header for API requests.
 *
 * @param apiKey - The API key
 * @returns Object with Authorization header
 */
export function getAuthHeader(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}
