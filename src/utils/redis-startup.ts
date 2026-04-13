import { FastifyBaseLogger } from "fastify";
import Redis from "ioredis";

interface RedisRetryOptions {
  logger: FastifyBaseLogger;
  label: string;
  retries: number;
  delayMs: number;
}

export const connectRedisWithRetry = async (
  client: Redis,
  options: RedisRetryOptions,
): Promise<void> => {
  const retries = Math.max(0, Math.floor(options.retries));
  const maxAttempts = retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await client.connect();
      await client.ping();
      return;
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      options.logger.warn(
        {
          label: options.label,
          attempt,
          maxAttempts,
          reason: getRedisErrorMessage(error),
          retryDelayMs: options.delayMs,
        },
        `${options.label} is unavailable at startup. Retrying connection.`,
      );

      await delay(options.delayMs);
    }
  }
};

export const getRedisErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Connection failed.";
};

const delay = (ms: number): Promise<void> => {
  const safeDelay = Math.max(0, Math.floor(ms));

  return new Promise((resolve) => {
    setTimeout(resolve, safeDelay);
  });
};
