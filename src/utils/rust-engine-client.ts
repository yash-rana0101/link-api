import { FastifyBaseLogger } from "fastify";

const DEFAULT_TIMEOUT_MS = 2500;
const DEFAULT_MAX_RETRIES = 2;

export interface RustTrustScoreRequest {
  verified_experiences: number;
  peer_confirmations: number;
  connections: number;
  reports: number;
}

export interface RustTrustScoreResponse {
  trust_score: number;
}

export interface RustVerificationResolveRequest {
  confirmations: number;
  min_confirmations: number;
  artifact: boolean;
  rejections: number;
}

export interface RustVerificationResolveResponse {
  status: string;
  consensus_reached: boolean;
}

interface RustRequestOptions {
  maxRetries?: number;
  suppressRetryLogs?: boolean;
}

interface HealthcheckOptions {
  silent?: boolean;
}

export class RustEngineClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly logger: FastifyBaseLogger,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
    private readonly maxRetries: number = DEFAULT_MAX_RETRIES,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async healthcheck(options?: HealthcheckOptions): Promise<void> {
    await this.request("GET", "/health", undefined, {
      maxRetries: 0,
      suppressRetryLogs: options?.silent ?? false,
    });
  }

  calculateTrustScore(payload: RustTrustScoreRequest): Promise<RustTrustScoreResponse> {
    return this.request<RustTrustScoreResponse>("POST", "/trust/calculate", payload);
  }

  resolveVerification(payload: RustVerificationResolveRequest): Promise<RustVerificationResolveResponse> {
    return this.request<RustVerificationResolveResponse>("POST", "/verification/resolve", payload);
  }

  private async request<TResponse>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    options?: RustRequestOptions,
  ): Promise<TResponse> {
    let lastError: unknown;
    const maxRetries = options?.maxRetries ?? this.maxRetries;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            "content-type": "application/json",
          },
          body: typeof body === "undefined" ? undefined : JSON.stringify(body),
          signal: abortController.signal,
        });

        clearTimeout(timeout);

        const rawBody = await response.text();

        if (!response.ok) {
          throw new Error(`Rust service responded with ${response.status}: ${rawBody || "no body"}`);
        }

        if (!rawBody) {
          return {} as TResponse;
        }

        return JSON.parse(rawBody) as TResponse;
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;

        if (attempt > maxRetries) {
          break;
        }

        if (!options?.suppressRetryLogs) {
          this.logger.warn(
            {
              err: error,
              path,
              attempt,
              maxRetries,
            },
            "Rust request failed; retrying.",
          );
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Rust service request failed.");
  }
}
