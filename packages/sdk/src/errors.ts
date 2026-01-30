/**
 * RotaStellar SDK - Custom Errors
 *
 * All custom errors raised by the RotaStellar SDK.
 */

/**
 * Base error for all RotaStellar SDK errors.
 */
export class RotaStellarError extends Error {
  public readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "RotaStellarError";
    this.details = details;
    Object.setPrototypeOf(this, RotaStellarError.prototype);
  }
}

/**
 * Raised when authentication fails.
 */
export class AuthenticationError extends RotaStellarError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Raised when API key is missing or empty.
 */
export class MissingAPIKeyError extends AuthenticationError {
  constructor() {
    super(
      "API key is required. Get your key at https://rotastellar.com/dashboard"
    );
    this.name = "MissingAPIKeyError";
    Object.setPrototypeOf(this, MissingAPIKeyError.prototype);
  }
}

/**
 * Raised when API key format is invalid.
 */
export class InvalidAPIKeyError extends AuthenticationError {
  constructor(apiKey: string) {
    const masked = apiKey.length > 10 ? apiKey.slice(0, 10) + "..." : apiKey;
    super(
      `Invalid API key format: ${masked}. Keys should start with 'rs_live_' or 'rs_test_'`
    );
    this.name = "InvalidAPIKeyError";
    Object.setPrototypeOf(this, InvalidAPIKeyError.prototype);
  }
}

/**
 * Raised when the API returns an error response.
 */
export class APIError extends RotaStellarError {
  public readonly statusCode: number;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    requestId?: string,
    details?: Record<string, unknown>
  ) {
    super(message, details);
    this.name = "APIError";
    this.statusCode = statusCode;
    this.requestId = requestId;
    Object.setPrototypeOf(this, APIError.prototype);
  }

  toString(): string {
    const parts = [`[${this.statusCode}] ${this.message}`];
    if (this.requestId) {
      parts.push(`(request_id: ${this.requestId})`);
    }
    return parts.join(" ");
  }
}

/**
 * Raised when rate limit is exceeded.
 */
export class RateLimitError extends APIError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, requestId?: string) {
    super("Rate limit exceeded", 429, requestId, { retryAfter });
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Raised when a requested resource is not found.
 */
export class NotFoundError extends APIError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string, requestId?: string) {
    super(`${resourceType} not found: ${resourceId}`, 404, requestId, {
      resourceType,
      resourceId,
    });
    this.name = "NotFoundError";
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Raised when input validation fails.
 */
export class ValidationError extends RotaStellarError {
  public readonly field: string;

  constructor(field: string, message: string) {
    super(`Validation error on '${field}': ${message}`);
    this.name = "ValidationError";
    this.field = field;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Raised when a network error occurs.
 */
export class NetworkError extends RotaStellarError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = "NetworkError";
    this.originalError = originalError;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Raised when a request times out.
 */
export class TimeoutError extends NetworkError {
  public readonly timeoutSeconds: number;

  constructor(timeoutSeconds: number) {
    super(`Request timed out after ${timeoutSeconds} seconds`);
    this.name = "TimeoutError";
    this.timeoutSeconds = timeoutSeconds;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
