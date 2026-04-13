import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";

import { env } from "./config/env";
import { authRoutes } from "./modules/auth/auth.routes";
import { connectionRoutes } from "./modules/connections/connections.routes";
import { experienceRoutes } from "./modules/experience/experience.routes";
import { healthRoutes } from "./modules/health/health.route";
import { messagingRoutes } from "./modules/messaging/messaging.routes";
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

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();

      if (request.user.tokenType !== "access") {
        reply.status(401).send({
          success: false,
          message: "Access token is required.",
        });

        return;
      }
    } catch {
      reply.status(401).send({
        success: false,
        message: "Unauthorized.",
      });

      return;
    }
  });

  app.register(loggerPlugin);
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

  return app;
};
