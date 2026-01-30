/**
 * RotaStellar SDK - HTTP Client
 *
 * HTTP client with retries, rate limiting, and error handling.
 */

import { getAuthHeader, maskApiKey } from "./auth";
import { Config } from "./config";
import {
  APIError,
  RateLimitError,
  NotFoundError,
  NetworkError,
  TimeoutError,
} from "./errors";

/**
 * HTTP client for RotaStellar API.
 *
 * Handles authentication, retries, rate limiting, and error responses.
 */
export class HTTPClient {
  private static readonly USER_AGENT = "rotastellar-node/0.1.0";
  private config: Config;
  private requestCount: number = 0;

  constructor(config: Config) {
    this.config = config;
  }

  private buildUrl(
    path: string,
    params?: Record<string, unknown>
  ): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    let url = `${baseUrl}${cleanPath}`;

    if (params) {
      const filtered = Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (filtered) {
        url = `${url}?${filtered}`;
      }
    }

    return url;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": HTTPClient.USER_AGENT,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.config.apiKey) {
      Object.assign(headers, getAuthHeader(this.config.apiKey));
    }

    return headers;
  }

  private parseErrorResponse(
    responseBody: string,
    statusCode: number,
    requestId?: string
  ): APIError {
    let message = "Unknown error";
    let details: Record<string, unknown> | undefined;

    try {
      const data = JSON.parse(responseBody);
      message = data.error?.message ?? message;
      details = data.error?.details;
    } catch {
      // JSON parse failed, use default message
    }

    if (statusCode === 429) {
      return new RateLimitError(undefined, requestId);
    } else if (statusCode === 404) {
      return new NotFoundError("Resource", "unknown", requestId);
    } else {
      return new APIError(message, statusCode, requestId, details);
    }
  }

  private async makeRequest(
    method: string,
    path: string,
    params?: Record<string, unknown>,
    data?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = this.buildUrl(path, params);
    const headers = this.buildHeaders();

    if (this.config.debug) {
      const maskedKey = this.config.apiKey
        ? maskApiKey(this.config.apiKey)
        : "None";
      console.log(`[DEBUG] ${method} ${url} (api_key: ${maskedKey})`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout * 1000
    );

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.requestCount++;

      const responseText = await response.text();
      const requestId = response.headers.get("x-request-id") ?? undefined;

      if (!response.ok) {
        throw this.parseErrorResponse(responseText, response.status, requestId);
      }

      return JSON.parse(responseText);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new TimeoutError(this.config.timeout);
        }
        throw new NetworkError(`Network error: ${error.message}`, error);
      }

      throw new NetworkError("Unknown network error");
    }
  }

  /**
   * Make HTTP request with retry logic.
   */
  async request(
    method: string,
    path: string,
    params?: Record<string, unknown>,
    data?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let lastError: Error | undefined;
    let delay = this.config.retryDelay;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.makeRequest(method, path, params, data);
      } catch (error) {
        if (error instanceof RateLimitError) {
          lastError = error;
          const waitTime = error.retryAfter ?? delay;
          if (attempt < this.config.maxRetries) {
            if (this.config.debug) {
              console.log(`[DEBUG] Rate limited, waiting ${waitTime}s...`);
            }
            await this.sleep(waitTime * 1000);
            delay *= 2;
          }
        } else if (error instanceof NetworkError || error instanceof TimeoutError) {
          lastError = error;
          if (attempt < this.config.maxRetries) {
            if (this.config.debug) {
              console.log(`[DEBUG] Network error, retrying in ${delay}s...`);
            }
            await this.sleep(delay * 1000);
            delay *= 2;
          }
        } else if (error instanceof APIError) {
          // Don't retry other API errors
          throw error;
        } else {
          throw error;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new NetworkError("Request failed after all retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make GET request.
   */
  async get(
    path: string,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return this.request("GET", path, params);
  }

  /**
   * Make POST request.
   */
  async post(
    path: string,
    data?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return this.request("POST", path, undefined, data);
  }

  /**
   * Make PUT request.
   */
  async put(
    path: string,
    data?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return this.request("PUT", path, undefined, data);
  }

  /**
   * Make DELETE request.
   */
  async delete(path: string): Promise<Record<string, unknown>> {
    return this.request("DELETE", path);
  }
}
