import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import Fastify from "fastify";

import { env } from "./config/env";
import { HttpError } from "./utils/http-error";
import { authRoutes } from "./modules/auth/auth.routes";
import { connectionRoutes } from "./modules/connections/connections.routes";
import { experienceRoutes } from "./modules/experience/experience.routes";
import { healthRoutes } from "./modules/health/health.route";
import { applicationRoutes, jobRoutes } from "./modules/jobs/jobs.routes";
import { messagingRoutes } from "./modules/messaging/messaging.routes";
import { notificationRoutes } from "./modules/notification/notification.routes";
import { postRoutes } from "./modules/post/post.routes";
import { trustRoutes } from "./modules/trust/trust.routes";
import { userRoutes } from "./modules/user/user.routes";
import { verificationRoutes } from "./modules/verification/verification.routes";
import feedQueuePlugin from "./plugins/feed-queue";
import loggerPlugin from "./plugins/logger";
import notificationQueuePlugin from "./plugins/notification-queue";
import prismaPlugin from "./plugins/prisma";
import redisPlugin from "./plugins/redis";
import rustEnginePlugin from "./plugins/rustEngine";
import socketPlugin from "./plugins/socket";
import trustScoreQueuePlugin from "./plugins/trust-score-queue";
import verificationQueuePlugin from "./plugins/verification-queue";
import errorHandlerPlugin from "./plugins/error-handler";

export const buildApp = () => {
  const corsOrigin = env.corsOrigins.includes("*") ? true : env.corsOrigins;

  const app = Fastify({
    disableRequestLogging: true,
    trustProxy: env.nodeEnv === "production",
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.password",
          "req.body.refreshToken",
          "req.body.accessToken",
          "req.body.token",
          "req.body.authorization",
          "headers.authorization",
          "headers.cookie",
        ],
        censor: "[Redacted]",
      },
    },
  });

  app.register(helmet, {
    contentSecurityPolicy: false,
  });

  app.register(cors, {
    origin: corsOrigin,
    credentials: true,
  });

  app.register(jwt, {
    secret: env.jwtSecret,
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();

      if (request.user.tokenType !== "access") {
        throw new HttpError(401, "Access token is required.");
      }
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(401, "Unauthorized.");
    }
  });

  app.register(loggerPlugin);
  app.register(errorHandlerPlugin);
  app.register(prismaPlugin);
  app.register(redisPlugin);
  app.register(socketPlugin);
  app.register(rustEnginePlugin);
  app.register(notificationQueuePlugin);
  app.register(feedQueuePlugin);
  app.register(verificationQueuePlugin);
  app.register(trustScoreQueuePlugin);
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(trustRoutes, { prefix: "/internal/trust" });
  app.register(userRoutes, { prefix: "/user" });
  app.register(experienceRoutes, { prefix: "/experience" });
  app.register(verificationRoutes, { prefix: "/verification" });
  app.register(connectionRoutes, { prefix: "/connections" });
  app.register(postRoutes, { prefix: "/posts" });
  app.register(messagingRoutes, { prefix: "/messages" });
  app.register(jobRoutes, { prefix: "/jobs" });
  app.register(applicationRoutes, { prefix: "/applications" });
  app.register(notificationRoutes, { prefix: "/notifications" });

  return app;
};
