import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { NotificationController } from "./notification.controller";
import {
  NotificationIdParams,
  getNotificationsSchema,
  markNotificationAsReadSchema,
} from "./notification.schema";
import { NotificationService } from "./notification.service";

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  const notificationService = new NotificationService(app);
  const notificationController = new NotificationController(notificationService);
  const readNotificationsRateLimit = createRateLimitPreHandler(app, {
    endpoint: "notifications:read",
    maxRequests: 180,
  });
  const markNotificationRateLimit = createRateLimitPreHandler(app, {
    endpoint: "notifications:mark-read",
    maxRequests: 180,
  });

  app.get(
    "/",
    {
      preHandler: [app.authenticate, readNotificationsRateLimit],
      schema: getNotificationsSchema,
    },
    notificationController.getNotifications,
  );

  app.patch<{ Params: NotificationIdParams }>(
    "/:id/read",
    {
      preHandler: [app.authenticate, markNotificationRateLimit],
      schema: markNotificationAsReadSchema,
    },
    notificationController.markAsRead,
  );
};
