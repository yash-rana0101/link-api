import { Job } from "bullmq";
import { FastifyInstance } from "fastify";

import { NotificationQueueJobData } from "../modules/notification/notification.queue";
import { NotificationService } from "../modules/notification/notification.service";

export const processNotificationJob = async (
  app: FastifyInstance,
  job: Job<NotificationQueueJobData>,
): Promise<void> => {
  const notificationService = new NotificationService(app);

  const notification = await notificationService.createNotification({
    userId: job.data.userId,
    type: job.data.type,
    message: job.data.message,
  });

  app.io.to(`user:${notification.userId}`).emit("notification", notification);

  app.log.info(
    {
      jobId: job.id,
      notificationId: notification.id,
      userId: notification.userId,
      type: notification.type,
    },
    "Processed notification job.",
  );
};
