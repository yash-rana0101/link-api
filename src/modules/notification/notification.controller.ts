import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import { NotificationIdParams } from "./notification.schema";
import { NotificationService } from "./notification.service";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  getNotifications = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const notifications = await this.notificationService.getUserNotifications(request.user.sub);

      reply.status(200).send({
        success: true,
        data: notifications,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  markAsRead = async (
    request: FastifyRequest<{ Params: NotificationIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const notification = await this.notificationService.markAsRead(request.params.id, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "Notification marked as read.",
        data: notification,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
