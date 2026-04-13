import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { MessagingController } from "./messaging.controller";
import {
  ConversationIdParams,
  ConversationMessagesQuerystring,
  getConversationMessagesSchema,
  getConversationsSchema,
} from "./messaging.schema";
import { MessagingService } from "./messaging.service";

export const messagingRoutes: FastifyPluginAsync = async (app) => {
  const messagingService = new MessagingService(app);
  const messagingController = new MessagingController(messagingService);
  const messageReadRateLimit = createRateLimitPreHandler(app, {
    endpoint: "messages:read",
    maxRequests: 180,
  });

  app.get(
    "/conversations",
    {
      preHandler: [app.authenticate, messageReadRateLimit],
      schema: getConversationsSchema,
    },
    messagingController.getConversations,
  );

  app.get<{ Params: ConversationIdParams; Querystring: ConversationMessagesQuerystring }>(
    "/:conversationId",
    {
      preHandler: [app.authenticate, messageReadRateLimit],
      schema: getConversationMessagesSchema,
    },
    messagingController.getConversationMessages,
  );
};
