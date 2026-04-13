import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { ConnectionController } from "./connections.controller";
import {
  ConnectionIdParams,
  RespondConnectionRequestBody,
  SendConnectionRequestBody,
  deleteConnectionSchema,
  respondConnectionRequestSchema,
  sendConnectionRequestSchema,
} from "./connections.schema";
import { ConnectionService } from "./connections.service";

export const connectionRoutes: FastifyPluginAsync = async (app) => {
  const connectionService = new ConnectionService(app);
  const connectionController = new ConnectionController(connectionService);
  const requestRateLimit = createRateLimitPreHandler(app, {
    endpoint: "connections:request",
    maxRequests: 20,
  });
  const respondRateLimit = createRateLimitPreHandler(app, {
    endpoint: "connections:respond",
    maxRequests: 40,
  });

  app.post<{ Body: SendConnectionRequestBody }>(
    "/request",
    {
      preHandler: [app.authenticate, requestRateLimit],
      schema: sendConnectionRequestSchema,
    },
    connectionController.sendRequest,
  );

  app.post<{ Body: RespondConnectionRequestBody }>(
    "/respond",
    {
      preHandler: [app.authenticate, respondRateLimit],
      schema: respondConnectionRequestSchema,
    },
    connectionController.respondRequest,
  );

  app.get(
    "/",
    {
      preHandler: [app.authenticate],
    },
    connectionController.getConnections,
  );

  app.get(
    "/pending",
    {
      preHandler: [app.authenticate],
    },
    connectionController.getPendingRequests,
  );

  app.delete<{ Params: ConnectionIdParams }>(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: deleteConnectionSchema,
    },
    connectionController.deleteConnection,
  );
};
