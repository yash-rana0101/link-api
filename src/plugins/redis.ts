import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { connectRedisWithRetry, getRedisErrorMessage } from "../utils/redis-startup";

const redisPlugin: FastifyPluginAsync = fp(async (app) => {
  let isRedisReady = false;

  const redis = new Redis(env.redisUrl, {
    lazyConnect: true,
    retryStrategy: () => null,
  });

  redis.on("error", (error) => {
    if (!isRedisReady) {
      app.log.debug({ reason: getRedisErrorMessage(error) }, "Redis is unavailable during startup.");
      return;
    }

    app.log.error({ err: error }, "Redis connection error");
  });

  try {
    await connectRedisWithRetry(redis, {
      logger: app.log,
      label: "Redis",
      retries: env.redisConnectRetries,
      delayMs: env.redisConnectDelayMs,
    });

    isRedisReady = true;

    app.log.info("Redis connected.");
  } catch (error) {
    if (env.redisRequired) {
      throw new Error(`Redis is required but unavailable: ${getRedisErrorMessage(error)}`);
    }

    app.log.warn(
      { reason: getRedisErrorMessage(error) },
      "Redis is unavailable. Continuing in degraded mode with DB fallback.",
    );
  }

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    isRedisReady = false;
    await redis.quit().catch(() => undefined);
  });
});

export default redisPlugin;
