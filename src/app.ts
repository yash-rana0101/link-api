import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";

import { env } from "./config/env";
import { healthRoutes } from "./modules/health/health.route";
import loggerPlugin from "./plugins/logger";
import prismaPlugin from "./plugins/prisma";
import redisPlugin from "./plugins/redis";

export const buildApp = () => {
  const app = Fastify({
    disableRequestLogging: true,
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.register(jwt, {
    secret: env.jwtSecret,
  });

  app.register(loggerPlugin);
  app.register(prismaPlugin);
  app.register(redisPlugin);
  app.register(healthRoutes);

  return app;
};
