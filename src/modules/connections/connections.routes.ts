import { FastifyPluginAsync } from "fastify";

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

  app.post<{ Body: SendConnectionRequestBody }>(
    "/request",
    {
      preHandler: [app.authenticate],
      schema: sendConnectionRequestSchema,
    },
    connectionController.sendRequest,
  );

  app.post<{ Body: RespondConnectionRequestBody }>(
    "/respond",
    {
      preHandler: [app.authenticate],
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
