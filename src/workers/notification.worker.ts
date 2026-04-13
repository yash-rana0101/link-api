import { Job } from "bullmq";
import { FastifyInstance } from "fastify";

import { NotificationQueueJobData } from "../modules/notification/notification.queue";

export const processNotificationJob = async (
  app: FastifyInstance,
  job: Job<NotificationQueueJobData>,
): Promise<void> => {
  app.log.info(
    {
      jobId: job.id,
      userId: job.data.userId,
      type: job.data.type,
      payload: job.data.payload,
    },
    "Processed notification job.",
  );
};
