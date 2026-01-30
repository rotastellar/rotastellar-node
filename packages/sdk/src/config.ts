/**
 * RotaStellar SDK - Configuration
 *
 * SDK configuration and settings.
 */

/**
 * SDK configuration options.
 */
export interface ConfigOptions {
  /** RotaStellar API key */
  apiKey?: string;
  /** API base URL */
  baseUrl?: string;
  /** Request timeout in seconds */
  timeout?: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay between retries in seconds */
  retryDelay?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * SDK configuration settings.
 *
 * @example
 * const config = new Config({ apiKey: "rs_live_xxx" });
 * console.log(config.baseUrl); // https://api.rotastellar.com/v1
 */
export class Config {
  public apiKey?: string;
  public baseUrl: string;
  public timeout: number;
  public maxRetries: number;
  public retryDelay: number;
  public debug: boolean;

  constructor(options: ConfigOptions = {}) {
    // Load from environment if not provided
    this.apiKey = options.apiKey ?? process.env.ROTASTELLAR_API_KEY;
    this.baseUrl =
      options.baseUrl ??
      process.env.ROTASTELLAR_BASE_URL ??
      "https://api.rotastellar.com/v1";
    this.timeout = options.timeout ?? 30;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1;
    this.debug =
      options.debug ??
      ["1", "true", "yes"].includes(
        (process.env.ROTASTELLAR_DEBUG ?? "").toLowerCase()
      );
  }

  /** Check if using a test API key. */
  get isTestKey(): boolean {
    return this.apiKey?.startsWith("rs_test_") ?? false;
  }

  /** Check if using a live API key. */
  get isLiveKey(): boolean {
    return this.apiKey?.startsWith("rs_live_") ?? false;
  }

  /** Get the API key environment (test or live). */
  get environment(): string | undefined {
    if (this.isTestKey) return "test";
    if (this.isLiveKey) return "live";
    return undefined;
  }
}

// Default configuration
let defaultConfig: Config | undefined;

/**
 * Get the default SDK configuration.
 */
export function getDefaultConfig(): Config {
  if (!defaultConfig) {
    defaultConfig = new Config();
  }
  return defaultConfig;
}

/**
 * Set the default SDK configuration.
 */
export function setDefaultConfig(config: Config): void {
  defaultConfig = config;
}
