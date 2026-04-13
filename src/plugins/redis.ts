import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";

const redisPlugin: FastifyPluginAsync = fp(async (app) => {
  const redis = new Redis(env.redisUrl, {
    lazyConnect: true,
    retryStrategy: () => null,
  });

  redis.on("error", (error) => {
    app.log.error({ err: error }, "Redis connection error");
  });

  try {
    await redis.connect();
    await redis.ping();
  } catch (error) {
    app.log.warn(
      { err: error },
      "Redis is unavailable. Continuing in degraded mode with DB fallback.",
    );
  }

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    await redis.quit().catch(() => undefined);
  });
});

export default redisPlugin;
