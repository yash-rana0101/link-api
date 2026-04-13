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

  await redis.connect();
  await redis.ping();

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    await redis.quit();
  });
});

export default redisPlugin;
